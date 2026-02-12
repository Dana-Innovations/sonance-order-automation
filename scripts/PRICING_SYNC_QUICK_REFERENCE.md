# Pricing Sync - Quick Reference Guide

## 🚀 Common Commands

### Setup & Verification
```bash
# Verify database setup
node verify-pricing-sync-setup.js

# Install SQL Server driver
npm install mssql
```

### Manual Sync Operations
```bash
# Run sync manually (CLI)
node run-pricing-sync.js

# Start HTTP API server (for N8N HTTP endpoint)
node sync-server.js

# Apply database migrations
node apply-migration.js 050  # Testing table
node apply-migration.js 051  # Audit log
node apply-migration.js 052  # Cutover (run after 7-day validation)
```

## 📊 Common SQL Queries

### Check Sync Status
```sql
-- Last 5 sync runs
SELECT
  sync_started_at,
  status,
  records_processed,
  records_failed,
  ROUND(EXTRACT(EPOCH FROM (sync_completed_at - sync_started_at))::numeric, 2) as duration_seconds,
  error_message
FROM pricing_sync_log
ORDER BY sync_started_at DESC
LIMIT 5;

-- Check for recent failures
SELECT *
FROM pricing_sync_log
WHERE status = 'failed' OR records_failed > 0
ORDER BY sync_started_at DESC
LIMIT 10;
```

### Check Data
```sql
-- Current record counts
SELECT
  'customer_product_pricing (PRODUCTION)' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT ps_customer_id) as unique_customers,
  MAX(updated_at) as last_update
FROM customer_product_pricing
UNION ALL
SELECT
  'customer_pricing_sync (TESTING)' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT ps_customer_id) as unique_customers,
  MAX(updated_at) as last_update
FROM customer_pricing_sync;

-- Check data freshness
SELECT
  ps_customer_id,
  COUNT(*) as product_count,
  MAX(updated_at) as last_update
FROM customer_pricing_sync
GROUP BY ps_customer_id
ORDER BY ps_customer_id;
```

### Compare Old vs New Data
```sql
-- Spot check price changes
SELECT
  o.ps_customer_id,
  o.product_id,
  o.uom,
  o.dfi_price as old_price,
  n.dfi_price as new_price,
  ROUND(((n.dfi_price - o.dfi_price) / NULLIF(o.dfi_price, 0) * 100)::numeric, 2) as pct_change
FROM customer_product_pricing o
JOIN customer_pricing_sync n
  ON o.ps_customer_id = n.ps_customer_id
  AND o.product_id = n.product_id
  AND o.uom = n.uom
WHERE ABS(n.dfi_price - o.dfi_price) > 0.01
ORDER BY ABS(pct_change) DESC
LIMIT 20;

-- Find records in one table but not the other
SELECT 'In OLD not in NEW' as status, COUNT(*) as count
FROM customer_product_pricing o
WHERE NOT EXISTS (
  SELECT 1 FROM customer_pricing_sync n
  WHERE n.ps_customer_id = o.ps_customer_id
    AND n.product_id = o.product_id
    AND n.uom = o.uom
)
UNION ALL
SELECT 'In NEW not in OLD' as status, COUNT(*) as count
FROM customer_pricing_sync n
WHERE NOT EXISTS (
  SELECT 1 FROM customer_product_pricing o
  WHERE o.ps_customer_id = n.ps_customer_id
    AND o.product_id = n.product_id
    AND o.uom = n.uom
);
```

### Check Active Customers
```sql
-- Active customers for sync
SELECT
  ps_customer_id,
  customer_name,
  'parent' as customer_type
FROM customers
WHERE is_active = true AND ps_customer_id IS NOT NULL
UNION ALL
SELECT
  child_ps_account_id as ps_customer_id,
  child_account_name as customer_name,
  'child' as customer_type
FROM customer_child_accounts
WHERE is_active = true AND child_ps_account_id IS NOT NULL
ORDER BY ps_customer_id;
```

## 🔧 Configuration Files

### Environment Variables Location
```
order-portal-web/.env.local
```

### Required Variables
```bash
SQL_SERVER_HOST=your-server.amazonaws.com
SQL_SERVER_PORT=1433
SQL_SERVER_DATABASE=FS92STG
SQL_SERVER_USER=readonly_user
SQL_SERVER_PASSWORD=your_password
SYNC_BATCH_SIZE=500
SYNC_TIMEOUT_MS=300000
```

### Optional Variables (HTTP Endpoint)
```bash
SYNC_API_KEY=your_api_key
SYNC_SERVER_PORT=3000
```

## 📋 Sync Process Flow

```
1. Connect to Supabase
   ↓
2. Get active customers list (parent + child)
   ↓
3. Connect to SQL Server
   ↓
4. Query pricing for active customers
   ↓
5. Transform data (SQL Server → Supabase schema)
   ↓
6. Upsert to customer_pricing_sync (batch of 500)
   ↓
7. Log results to pricing_sync_log
   ↓
8. Close connections
   ↓
9. Return success/failure status
```

## 🚨 Troubleshooting Quick Fixes

### Sync Fails - SQL Server Connection
```bash
# Test SQL Server connectivity
telnet SQL_SERVER_HOST 1433

# Check credentials in .env.local
cat order-portal-web/.env.local | grep SQL_SERVER

# Test with SQL client (Azure Data Studio, DBeaver)
```

### Sync Fails - Supabase Connection
```bash
# Check Supabase credentials
cat order-portal-web/.env.local | grep SUPABASE

# Test connection
node verify-pricing-sync-setup.js
```

### No Data Synced
```sql
-- Check active customers exist
SELECT COUNT(*) FROM customers WHERE is_active = true;
SELECT COUNT(*) FROM customer_child_accounts WHERE is_active = true;

-- Manually query SQL Server to verify data exists
-- (Use SQL client connected to SQL Server)
SELECT COUNT(*) FROM insite.psCustomerProdPrice
WHERE CUST_ID IN ('CUSTOMER_ID_1', 'CUSTOMER_ID_2');
```

### Partial Sync Success
```sql
-- Check error details
SELECT error_details
FROM pricing_sync_log
WHERE records_failed > 0
ORDER BY sync_started_at DESC
LIMIT 1;

-- Review specific failed records
```

## 📈 Validation Checklist

### Daily During 7-Day Validation Period
- [ ] Check sync completed successfully
- [ ] Verify no errors in pricing_sync_log
- [ ] Check record counts match expectations
- [ ] Verify data freshness (updated_at)
- [ ] Review email notifications

### Before Cutover
- [ ] 7 consecutive successful syncs
- [ ] Zero failed records
- [ ] Spot checks show accurate pricing
- [ ] Record counts stable
- [ ] No alerts or errors

### After Cutover
- [ ] Application uses new table successfully
- [ ] No errors in application logs
- [ ] Order processing works correctly
- [ ] Price variance warnings minimal
- [ ] Monitor for 24 hours before backup deletion

## 🔄 Rollback Procedure

### If Issues After Cutover
```sql
-- Rollback to old table
BEGIN;

-- Rename current table back to testing name
ALTER TABLE customer_product_pricing RENAME TO customer_pricing_sync;

-- Restore backup to production name
ALTER TABLE customer_product_pricing_backup RENAME TO customer_product_pricing;

-- Fix indexes (adjust names as needed)
-- Check current index names first:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'customer_pricing_sync';

COMMIT;

-- Restart application to pick up old table
```

## 📞 Key Contacts

| Issue | Contact | Action |
|-------|---------|--------|
| SQL Server access | IT/Database team | Request credentials, firewall rules |
| Sync failures | DevOps/On-call | Check logs, restart sync |
| Pricing discrepancies | Finance team | Validate source data |
| N8N workflow issues | N8N admin | Check workflow configuration |

## 📊 Monitoring Dashboards

### Key Metrics
- **Success Rate**: 100% (goal)
- **Records Processed**: ~10,000 (expected)
- **Duration**: <2 minutes (expected)
- **Failed Records**: 0 (goal)

### Sample Grafana Query
```sql
SELECT
  sync_started_at as time,
  records_processed,
  records_failed,
  EXTRACT(EPOCH FROM (sync_completed_at - sync_started_at)) as duration_seconds
FROM pricing_sync_log
WHERE sync_started_at > NOW() - INTERVAL '30 days'
ORDER BY sync_started_at;
```

## 🎯 Success Indicators

### Healthy Sync
```
✅ Status: success
✅ Records processed: ~10,000
✅ Records failed: 0
✅ Duration: 60-120 seconds
✅ Last sync: <24 hours ago
✅ No error notifications
```

### Requires Investigation
```
⚠️  Status: partial (some records failed)
⚠️  Duration: >5 minutes
⚠️  Records failed: >0
⚠️  Last sync: >25 hours ago
```

### Critical Issue
```
❌ Status: failed
❌ No sync in 25+ hours
❌ Error notifications received
❌ All records failed
```

## 🔗 Related Documentation

- **Full Setup Guide**: `PRICING_SYNC_SETUP.md`
- **Implementation Summary**: `PRICING_SYNC_README.md`
- **Environment Template**: `.env.pricing-sync.template`
- **N8N Workflow**: `n8n-pricing-sync-workflow.json`

## 📝 Quick Notes

### Current Database State
- **Testing table**: `customer_pricing_sync` (Phase 1-6)
- **Production table**: `customer_product_pricing` (unchanged)
- **Audit log**: `pricing_sync_log`

### After Cutover (Phase 7)
- **Production table**: `customer_product_pricing` (gets synced data)
- **Backup table**: `customer_product_pricing_backup` (original data)
- **Testing table**: May be dropped or reused

### Data Source
- **Database**: FS92STG (SQL Server on AWS)
- **Table**: insite.psCustomerProdPrice
- **Key fields**: CUST_ID, PRODUCT_ID, UNIT_OF_MEASURE, NET_PRICE

### Sync Target
- **Current**: customer_pricing_sync (testing)
- **After cutover**: customer_product_pricing (production)
- **Upsert key**: (ps_customer_id, product_id, uom, currency_code)
