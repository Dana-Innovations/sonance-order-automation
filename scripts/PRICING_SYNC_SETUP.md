# Customer Pricing Sync - Setup Guide

## Overview

This system automatically syncs customer-specific product pricing from PeopleSoft SQL Server to Supabase nightly. This keeps pricing current and eliminates manual price corrections during order processing.

## Architecture

```
SQL Server (AWS) ←→ Sync Script (Node.js) ←→ Supabase PostgreSQL
                           ↑
                    N8N Workflow (Scheduler)
```

## Files Created

### Database Migrations
- `supabase/migrations/050_create_customer_pricing_sync.sql` - Testing table (identical to production)
- `supabase/migrations/051_create_pricing_sync_log.sql` - Audit log table
- `supabase/migrations/052_cutover_to_sync_table.sql` - Cutover script (run after validation)

### Sync Scripts
- `sync-customer-pricing.js` - Core sync logic
- `run-pricing-sync.js` - CLI wrapper for manual execution
- `sync-server.js` - HTTP API wrapper for N8N integration (optional)

## Setup Steps

### 1. Install Dependencies

```bash
npm install mssql
```

The `pg` and `dotenv` packages are already installed.

### 2. Configure Environment Variables

Add these variables to `order-portal-web/.env.local`:

```bash
# =====================================================
# Customer Pricing Sync Configuration
# =====================================================

# SQL Server Connection (PeopleSoft)
SQL_SERVER_HOST=your-server.amazonaws.com
SQL_SERVER_PORT=1433
SQL_SERVER_DATABASE=FS92STG
SQL_SERVER_USER=sync_user
SQL_SERVER_PASSWORD=your_password

# Sync Configuration
SYNC_BATCH_SIZE=500
SYNC_TIMEOUT_MS=300000  # 5 minutes

# Optional: For HTTP API endpoint (if using sync-server.js)
SYNC_API_KEY=your_secure_api_key_here
SYNC_SERVER_PORT=3000
```

**Required from IT/Database Team:**
- SQL Server hostname/IP
- Read-only username and password
- Network access/firewall rules configured

### 3. Apply Database Migrations

```bash
# Create the testing table
node apply-migration.js 050

# Create the audit log table
node apply-migration.js 051

# DO NOT run migration 052 yet - that's the cutover after validation
```

### 4. Verify Database Setup

```sql
-- Check tables created
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name IN ('customer_pricing_sync', 'pricing_sync_log');

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'customer_pricing_sync';
```

## Testing the Sync

### Manual Test Run

```bash
node run-pricing-sync.js
```

**Expected output:**
- Connects to SQL Server
- Fetches active customers from Supabase
- Queries pricing data for those customers
- Transforms and upserts data to `customer_pricing_sync` table
- Logs results to `pricing_sync_log`
- Exits with code 0 (success) or 1 (failure)

### Validation Queries

After successful sync, run these queries to validate:

```sql
-- Check sync succeeded
SELECT * FROM pricing_sync_log ORDER BY sync_started_at DESC LIMIT 5;

-- Check record counts
SELECT
  COUNT(*) as total_records,
  COUNT(DISTINCT ps_customer_id) as unique_customers,
  MAX(updated_at) as last_sync_time
FROM customer_pricing_sync;

-- Compare with old table
SELECT
  'OLD (customer_product_pricing)' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT ps_customer_id) as customer_count
FROM customer_product_pricing
UNION ALL
SELECT
  'NEW (customer_pricing_sync)' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT ps_customer_id) as customer_count
FROM customer_pricing_sync;

-- Check for price changes (spot check)
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
```

## N8N Workflow Setup

### Option A: SSH Execution (Recommended)

1. In N8N Cloud, create new workflow: "Nightly Pricing Sync"
2. Add nodes:
   - **Schedule Trigger** (Cron): `0 3 * * *` (3 AM daily)
   - **SSH** node: Execute `node /path/to/run-pricing-sync.js`
   - **IF** node: Check if `{{ $json.exitCode === 0 }}`
   - **Send Email** (success branch)
   - **Send Email** (failure branch)

### Option B: HTTP Endpoint

1. Start sync server: `node sync-server.js`
2. In N8N Cloud, create new workflow
3. Add nodes:
   - **Schedule Trigger** (Cron): `0 3 * * *`
   - **HTTP Request** (POST): `http://your-server:3000/sync-pricing`
     - Headers: `X-API-Key: your_api_key`
   - **IF** node: Check `{{ $json.success === true }}`
   - **Send Email** (success/failure branches)

### Email Notification Templates

**Success Email:**
```
Subject: ✅ Pricing Sync Completed - {{ $json.recordsProcessed }} records

Sync Summary:
- Status: {{ $json.status }}
- Records Processed: {{ $json.recordsProcessed }}
- Records Inserted/Updated: {{ $json.recordsInserted }}
- Records Failed: {{ $json.recordsFailed }}
- Duration: {{ $json.duration }}ms
- Timestamp: {{ $now }}
```

**Failure Email:**
```
Subject: 🚨 ALERT: Pricing Sync Failed

Error Details:
{{ $json.error }}

Stack Trace:
{{ $json.stack }}

Please investigate immediately.
```

## Validation Period (7 Days)

**IMPORTANT:** Do not modify application code yet. Let the sync run for 7 days to validate stability.

### Daily Checks

Run these queries daily:

```sql
-- Check sync status
SELECT
  sync_started_at,
  status,
  records_processed,
  records_failed,
  error_message
FROM pricing_sync_log
WHERE sync_started_at > NOW() - INTERVAL '7 days'
ORDER BY sync_started_at DESC;

-- Check data freshness
SELECT MAX(updated_at) as last_update FROM customer_pricing_sync;
```

### Success Criteria

Before cutover, verify:
- ✅ 7 consecutive successful syncs
- ✅ No errors in `pricing_sync_log`
- ✅ Record counts match expectations
- ✅ Spot checks show accurate pricing
- ✅ No sync failures or email alerts

## Cutover to Production Table

**Only proceed after validation period succeeds.**

### Step 1: Run Cutover Migration

```bash
node apply-migration.js 052
```

This will:
1. Rename `customer_product_pricing` → `customer_product_pricing_backup`
2. Rename `customer_pricing_sync` → `customer_product_pricing`
3. Rename all indexes accordingly

### Step 2: Update Sync Script (if needed)

The sync script already targets `customer_pricing_sync`. After cutover, you can:
- Keep syncing to the same table (now renamed)
- OR update script to use new name explicitly

### Step 3: Test Application

1. Restart Next.js app (if running)
2. Process a test order
3. Verify pricing lookups work correctly
4. Check for any errors in application logs

### Step 4: Monitor for 24 Hours

Watch for:
- Application errors
- Price variance warnings
- Order processing issues

### Step 5: Drop Backup (After 30 Days)

Once everything is confirmed working:

```sql
DROP TABLE IF EXISTS customer_product_pricing_backup;
```

## Rollback Plan

If issues occur after cutover:

```sql
-- Rollback to old table
ALTER TABLE customer_product_pricing RENAME TO customer_pricing_sync;
ALTER TABLE customer_product_pricing_backup RENAME TO customer_product_pricing;

-- Rename indexes back
ALTER INDEX idx_customer_product_pricing_unique RENAME TO idx_customer_pricing_sync_unique;
ALTER INDEX idx_customer_product_pricing_customer RENAME TO idx_customer_pricing_sync_customer;
ALTER INDEX idx_customer_product_pricing_product RENAME TO idx_customer_pricing_sync_product;
ALTER INDEX idx_customer_product_pricing_brand RENAME TO idx_customer_pricing_sync_brand;

-- Re-apply index renames for backup table
-- (Get original names from backup)
```

## Troubleshooting

### Sync Fails to Connect to SQL Server

**Check:**
- SQL Server hostname/IP correct in `.env.local`
- Firewall rules allow connection from sync script location
- Credentials are valid (test with SQL client)
- VPN connected (if required)

**Solution:**
- Verify network connectivity: `telnet SQL_SERVER_HOST 1433`
- Check SQL Server logs for connection attempts
- Ensure user has SELECT permission on `insite.psCustomerProdPrice`

### No Pricing Data Returned

**Check:**
- Active customers exist in Supabase
- Customer IDs match between systems
- SQL Server table has data for those customers

**Query SQL Server directly:**
```sql
SELECT COUNT(*), COUNT(DISTINCT CUST_ID)
FROM insite.psCustomerProdPrice
WHERE CUST_ID IN ('customer_id_1', 'customer_id_2');
```

### Upsert Failures

**Check:**
- `pricing_sync_log` table for error details
- Constraint violations (unique index)
- Data type mismatches

**Query failed records:**
```sql
SELECT error_details
FROM pricing_sync_log
WHERE status = 'failed' OR records_failed > 0
ORDER BY sync_started_at DESC
LIMIT 1;
```

### N8N Workflow Not Triggering

**Check:**
- Cron schedule syntax correct
- Workflow is activated (not paused)
- N8N execution history for errors
- SSH credentials valid (Option A)
- HTTP endpoint reachable (Option B)

## Monitoring

### Key Metrics

Monitor these in `pricing_sync_log`:
- Sync success rate (should be 100%)
- Records processed (should be ~10,000)
- Duration (should be <2 minutes)
- Failed records (should be 0)

### Alerts to Set Up

Consider setting up alerts for:
- Sync failure (status = 'failed')
- Partial success (records_failed > 0)
- Sync didn't run (no log entry in 25 hours)
- Duration spike (>5 minutes)

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

## Data Mapping Reference

### SQL Server → Supabase

| SQL Server Field | Supabase Field | Notes |
|-----------------|----------------|-------|
| CUST_ID | ps_customer_id | |
| PRODUCT_ID | product_id | |
| UNIT_OF_MEASURE | uom, pricing_uom | Same value |
| LIST_PRICE | list_price | |
| NET_PRICE | dfi_price | **This is the actual price used** |
| DFI | discount_pct | Discount percentage |
| QTY | (derived) | QTY=1 → is_default_uom=true |
| (lookup) | customer_name | From Supabase customers table |
| (default) | currency_code | Hard-coded to 'USD' |
| (null) | catalog_number | Not available |
| (null) | description | Not available |
| (null) | brand | Not available |
| (null) | category | Not available |
| (default) | is_kit | Default to false |

## Future Enhancements

After MVP is stable, consider:

1. **Product Details Enrichment**
   - Join SQL Server products table for description, brand, category
   - Or use existing Supabase products table

2. **Delta Sync**
   - Track last sync timestamp
   - Only sync changed records
   - Reduces load on both systems

3. **Real-time Updates**
   - Webhook from PeopleSoft for immediate updates
   - Supplement nightly batch sync

4. **Pricing History**
   - Archive old pricing before updates
   - Enable price change auditing
   - Track price trends

5. **Dashboard**
   - Grafana/Metabase for sync monitoring
   - Pricing change reports
   - Customer-specific pricing analytics

## Support

For issues or questions:
1. Check `pricing_sync_log` table for error details
2. Review N8N execution history
3. Check application logs
4. Review this documentation

## Security Notes

- SQL Server credentials stored in `.env.local` (not committed to git)
- Use read-only SQL Server user
- SYNC_API_KEY required for HTTP endpoint
- SSL/TLS encryption for all connections
- Supabase RLS policies protect data access
