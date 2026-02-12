# Customer Pricing Sync - Implementation Complete

## 🎯 Overview

Automated nightly sync of customer-specific product pricing from PeopleSoft SQL Server to Supabase. This keeps pricing current in the order automation system, eliminating manual price corrections and reducing order processing errors.

## 📊 Quick Stats

- **Target Data Volume**: ~10,000 pricing records for ~50 customers
- **Sync Frequency**: Nightly at 3 AM (configurable)
- **Expected Duration**: <2 minutes
- **Data Source**: SQL Server (FS92STG database, insite.psCustomerProdPrice table)
- **Data Destination**: Supabase PostgreSQL (customer_pricing_sync → customer_product_pricing)

## 🏗️ Architecture

```
┌─────────────────────┐
│  SQL Server (AWS)   │
│  - FS92STG database │
│  - psCustomerProdPrice table
└──────────┬──────────┘
           │
           │ Query pricing for active customers
           │
┌──────────▼──────────┐
│  Sync Script        │
│  - Node.js          │
│  - Batch upsert     │
│  - Error handling   │
└──────────┬──────────┘
           │
           │ Insert/Update records
           │
┌──────────▼──────────────────┐
│  Supabase PostgreSQL        │
│  - customer_pricing_sync    │ ← Testing table (Phase 1-6)
│  - customer_product_pricing │ ← Production table (Phase 7+)
│  - pricing_sync_log         │ ← Audit log
└─────────────────────────────┘
           ▲
           │
           │ Schedule & Monitor
           │
┌──────────┴──────────┐
│  N8N Workflow       │
│  - CRON trigger     │
│  - Email alerts     │
└─────────────────────┘
```

## 📁 Files Created

### Database Migrations
| File | Purpose | Status |
|------|---------|--------|
| `supabase/migrations/050_create_customer_pricing_sync.sql` | Creates testing table identical to production | ✅ Applied |
| `supabase/migrations/051_create_pricing_sync_log.sql` | Creates audit log table | ✅ Applied |
| `supabase/migrations/052_cutover_to_sync_table.sql` | Cutover script (run after validation) | 🟡 Ready to apply later |

### Sync Scripts
| File | Purpose | Usage |
|------|---------|-------|
| `sync-customer-pricing.js` | Core sync logic with error handling | Library |
| `run-pricing-sync.js` | CLI wrapper for manual execution | `node run-pricing-sync.js` |
| `sync-server.js` | HTTP API wrapper for N8N integration | `node sync-server.js` |

### Validation & Documentation
| File | Purpose | Usage |
|------|---------|-------|
| `verify-pricing-sync-setup.js` | Validates database setup | `node verify-pricing-sync-setup.js` |
| `PRICING_SYNC_SETUP.md` | Comprehensive setup guide | Reference |
| `PRICING_SYNC_README.md` | This file - implementation summary | Reference |
| `n8n-pricing-sync-workflow.json` | N8N workflow template | Import to N8N |

## ✅ Current Status

### Phase 0: Database Setup ✅ COMPLETE
- ✅ Migration 050 applied - `customer_pricing_sync` table created
- ✅ Migration 051 applied - `pricing_sync_log` table created
- ✅ All indexes created
- ✅ RLS policies configured
- ✅ Verified 6 active customers ready for sync

### Phase 1: Infrastructure Setup 🟡 IN PROGRESS
**Required from you:**
1. SQL Server connection details:
   - Hostname/IP: `?`
   - Port: `1433` (assumed)
   - Database: `FS92STG` ✅
   - Table: `insite.psCustomerProdPrice` ✅
   - Username: `?`
   - Password: `?`

2. Network access:
   - Where will sync script run? (EC2, local server, etc.)
   - Firewall rules configured?
   - VPN required?

3. Schedule preferences:
   - Sync time: `3:00 AM` (suggested, configurable)
   - Timezone: `?`
   - Email addresses for notifications: `?`

### Phase 2-7: Pending
- 🔴 Install `mssql` package
- 🔴 Configure SQL Server credentials in `.env.local`
- 🔴 Test sync manually
- 🔴 Set up N8N workflow
- 🔴 Monitor for 7 days
- 🔴 Perform cutover to production table

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install mssql
```

### 2. Configure Environment Variables

Add to `order-portal-web/.env.local`:

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
SYNC_TIMEOUT_MS=300000

# Optional: For HTTP API endpoint
SYNC_API_KEY=your_secure_api_key_here
SYNC_SERVER_PORT=3000
```

### 3. Test Database Setup

```bash
node verify-pricing-sync-setup.js
```

**Expected output:** ✅ Database setup verification PASSED!

### 4. Test Sync (Once SQL Server Access Configured)

```bash
node run-pricing-sync.js
```

**Expected output:**
- Connects to SQL Server
- Fetches 6 active customers
- Queries ~10,000 pricing records
- Upserts to `customer_pricing_sync` table
- Logs results to `pricing_sync_log`
- Exits with code 0

### 5. Validate Results

```sql
-- Check sync succeeded
SELECT * FROM pricing_sync_log ORDER BY sync_started_at DESC LIMIT 1;

-- Check data
SELECT
  COUNT(*) as total_records,
  COUNT(DISTINCT ps_customer_id) as unique_customers,
  MAX(updated_at) as last_sync_time
FROM customer_pricing_sync;
```

## 📋 Data Mapping

### SQL Server → Supabase Field Mapping

| SQL Server Column | Supabase Column | Transformation |
|------------------|-----------------|----------------|
| `CUST_ID` | `ps_customer_id` | Trimmed |
| `PRODUCT_ID` | `product_id` | Trimmed |
| `UNIT_OF_MEASURE` | `uom`, `pricing_uom` | Trimmed, same value |
| `LIST_PRICE` | `list_price` | Parsed as decimal |
| `NET_PRICE` | `dfi_price` | **This is the actual customer price** |
| `DFI` | `discount_pct` | Discount percentage |
| `QTY` | (derived) `is_default_uom` | `true` if QTY=1 |
| (lookup) | `customer_name` | From Supabase customers table |
| (default) | `currency_code` | Hard-coded to 'USD' |
| (null) | `catalog_number` | Not available in SQL Server |
| (null) | `description` | Not available in SQL Server |
| (null) | `brand` | Not available in SQL Server |
| (null) | `category` | Not available in SQL Server |
| (default) | `is_kit` | Default to `false` |

### Key Points
- **NET_PRICE** is the actual customer price used for order validation
- **DFI** is the discount percentage applied
- **LIST_PRICE** is the base price before discount
- Product details (description, brand, category) are NULL initially (can be enriched later)

## 🔧 N8N Workflow Setup

### Option A: HTTP Endpoint (Recommended)

1. Start sync server on accessible host:
   ```bash
   node sync-server.js
   ```

2. Import `n8n-pricing-sync-workflow.json` to N8N

3. Configure workflow:
   - Set HTTP Request URL to your sync server
   - Add HTTP Header Auth credential with API key
   - Configure email addresses
   - Set schedule (default: 3 AM daily)

4. Test workflow manually before activating

### Option B: SSH Execution

1. Deploy scripts to server with SQL Server access
2. Configure SSH node in N8N to run `node run-pricing-sync.js`
3. Parse exit code (0 = success, 1 = failure)
4. Send email notifications based on result

## 📊 Validation Period (7 Days)

**CRITICAL:** Do not modify application code yet. Let sync run for 7 days to validate stability.

### Daily Monitoring

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
- ✅ Record counts match expectations (~10,000)
- ✅ Spot checks show accurate pricing
- ✅ No sync failures or email alerts

## 🔄 Cutover to Production (Phase 7)

**Only after 7 days of successful syncs.**

### Step 1: Apply Cutover Migration

```bash
node apply-migration.js 052
```

This will:
1. Rename `customer_product_pricing` → `customer_product_pricing_backup`
2. Rename `customer_pricing_sync` → `customer_product_pricing`
3. Rename all indexes

### Step 2: Monitor Application

- Application automatically uses new table (same name)
- No code changes needed
- Monitor for 24 hours for any issues

### Step 3: Drop Backup (After 30 Days)

```sql
DROP TABLE IF EXISTS customer_product_pricing_backup;
```

## 🔍 Troubleshooting

### Sync Fails to Connect to SQL Server

**Check:**
- SQL Server hostname/IP in `.env.local`
- Firewall allows connection from sync script host
- Credentials are valid
- VPN connected (if required)

**Test connection:**
```bash
telnet SQL_SERVER_HOST 1433
```

### No Pricing Data Returned

**Check:**
```sql
-- Verify active customers
SELECT ps_customer_id, customer_name
FROM customers
WHERE is_active = true;

-- Test SQL Server query manually
SELECT COUNT(*)
FROM insite.psCustomerProdPrice
WHERE CUST_ID IN ('CUSTOMER_ID_1', 'CUSTOMER_ID_2');
```

### Upsert Failures

**Check error details:**
```sql
SELECT
  error_message,
  error_details,
  records_failed
FROM pricing_sync_log
WHERE status = 'failed' OR records_failed > 0
ORDER BY sync_started_at DESC
LIMIT 1;
```

## 📈 Monitoring & Alerts

### Key Metrics to Track

- **Sync success rate**: Should be 100%
- **Records processed**: Should be ~10,000
- **Duration**: Should be <2 minutes
- **Failed records**: Should be 0

### Recommended Alerts

Set up alerts for:
- Sync failure (status = 'failed')
- Partial success (records_failed > 0)
- Sync didn't run (no log entry in 25 hours)
- Duration spike (>5 minutes)

### Sample Query for Dashboard

```sql
SELECT
  sync_started_at,
  status,
  records_processed,
  records_failed,
  EXTRACT(EPOCH FROM (sync_completed_at - sync_started_at)) as duration_seconds
FROM pricing_sync_log
WHERE sync_started_at > NOW() - INTERVAL '30 days'
ORDER BY sync_started_at DESC;
```

## 🔐 Security Notes

- SQL Server credentials stored in `.env.local` (gitignored)
- Use read-only SQL Server user
- SYNC_API_KEY required for HTTP endpoint
- SSL/TLS encryption for all connections
- Supabase RLS policies protect data access

## 🎯 Success Metrics

### Before Implementation
- ❌ Pricing data becomes stale over time
- ❌ Price variance warnings during order validation
- ❌ Manual price corrections needed
- ❌ Potential order posting errors

### After Implementation
- ✅ Pricing updated nightly from source of truth
- ✅ Minimal price variance warnings
- ✅ No manual price corrections needed
- ✅ Accurate order pricing and posting

## 📚 Additional Resources

- **Setup Guide**: `PRICING_SYNC_SETUP.md` - Detailed configuration steps
- **Verification Script**: `node verify-pricing-sync-setup.js`
- **N8N Workflow**: `n8n-pricing-sync-workflow.json` - Import template
- **Sync Log Table**: Query `pricing_sync_log` for audit history

## 🚦 Next Steps

1. **Immediate:**
   - Provide SQL Server connection details
   - Install `mssql` package: `npm install mssql`
   - Configure `.env.local` with credentials

2. **Testing:**
   - Run manual sync: `node run-pricing-sync.js`
   - Verify results in database
   - Validate pricing accuracy

3. **Automation:**
   - Set up N8N workflow
   - Configure email notifications
   - Test workflow execution

4. **Validation:**
   - Monitor for 7 days
   - Check `pricing_sync_log` daily
   - Validate no errors

5. **Cutover:**
   - Apply migration 052
   - Monitor application
   - Drop backup after 30 days

## 📞 Support

For issues or questions:
1. Check `pricing_sync_log` table for error details
2. Review N8N execution history
3. Verify SQL Server connectivity
4. Check application logs
5. Review documentation files

---

**Implementation Date**: February 9, 2026
**Status**: Database setup complete, awaiting SQL Server credentials
**Next Action Required**: Configure SQL Server connection details in `.env.local`
