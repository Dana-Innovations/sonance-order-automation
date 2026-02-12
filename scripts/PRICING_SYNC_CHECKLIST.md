# Pricing Sync - Implementation Checklist

Use this checklist to track your progress through the implementation phases.

---

## Phase 0: Database Setup ✅ COMPLETE

- [x] Create `customer_pricing_sync` table
- [x] Create `pricing_sync_log` table
- [x] Verify indexes created
- [x] Verify RLS policies configured
- [x] Confirm active customers exist
- [x] Run database verification script

**Status**: ✅ Complete - Database ready for sync

---

## Phase 1: Gather Requirements 🟡 IN PROGRESS

### SQL Server Access
- [ ] Obtain SQL Server hostname/IP
- [ ] Confirm SQL Server port (default: 1433)
- [ ] Request read-only database credentials
  - [ ] Username
  - [ ] Password
- [ ] Verify access to FS92STG database
- [ ] Verify access to insite.psCustomerProdPrice table

### Network Access
- [ ] Determine where sync script will run:
  - [ ] Option A: EC2 instance in same VPC as SQL Server
  - [ ] Option B: Local server with VPN access
  - [ ] Option C: Cloud server with firewall rules
  - [ ] Option D: Other: _______________
- [ ] Configure firewall rules:
  - [ ] Allow outbound to SQL Server (port 1433)
  - [ ] Allow outbound to Supabase (port 5432)
  - [ ] Allow inbound to sync server (port 3000, if using HTTP endpoint)
- [ ] Set up VPN access (if required)

### Schedule & Notifications
- [ ] Decide sync schedule time: ___________
- [ ] Decide timezone: ___________
- [ ] Collect email addresses for notifications:
  - [ ] Success emails: _______________
  - [ ] Failure emails: _______________

**Status**: 🟡 Awaiting user input

---

## Phase 2: Install & Configure 🔴 NOT STARTED

### Install Dependencies
- [ ] Install SQL Server driver:
  ```bash
  npm install mssql
  ```

### Configure Environment
- [ ] Copy `.env.pricing-sync.template` to `order-portal-web/.env.local`
- [ ] Add SQL Server credentials:
  ```bash
  SQL_SERVER_HOST=
  SQL_SERVER_PORT=1433
  SQL_SERVER_DATABASE=FS92STG
  SQL_SERVER_USER=
  SQL_SERVER_PASSWORD=
  ```
- [ ] Add sync configuration:
  ```bash
  SYNC_BATCH_SIZE=500
  SYNC_TIMEOUT_MS=300000
  ```
- [ ] (Optional) Add HTTP endpoint config:
  ```bash
  SYNC_API_KEY=
  SYNC_SERVER_PORT=3000
  ```

### Test SQL Server Access
- [ ] Install SQL client (Azure Data Studio or DBeaver)
- [ ] Connect to SQL Server manually
- [ ] Run test query:
  ```sql
  SELECT COUNT(*) FROM insite.psCustomerProdPrice
  ```
- [ ] Verify data exists
- [ ] Test customer ID filtering:
  ```sql
  SELECT COUNT(*)
  FROM insite.psCustomerProdPrice
  WHERE CUST_ID IN ('customer_id_1', 'customer_id_2')
  ```

**Status**: 🔴 Waiting for Phase 1

---

## Phase 3: Manual Testing 🔴 NOT STARTED

### First Sync Test
- [ ] Run manual sync:
  ```bash
  node run-pricing-sync.js
  ```
- [ ] Verify output shows:
  - [ ] Connected to SQL Server
  - [ ] Connected to Supabase
  - [ ] Fetched active customers
  - [ ] Retrieved pricing records
  - [ ] Transformed data
  - [ ] Upserted to customer_pricing_sync
  - [ ] Logged results
  - [ ] Exit code 0 (success)

### Validate Results
- [ ] Check sync log:
  ```sql
  SELECT * FROM pricing_sync_log ORDER BY sync_started_at DESC LIMIT 1;
  ```
- [ ] Verify sync status = 'success'
- [ ] Verify records_processed > 0
- [ ] Verify records_failed = 0
- [ ] Check data in customer_pricing_sync:
  ```sql
  SELECT COUNT(*), COUNT(DISTINCT ps_customer_id)
  FROM customer_pricing_sync;
  ```
- [ ] Verify record count matches expectations (~10,000)
- [ ] Verify customer count matches active customers (6)

### Spot Check Pricing
- [ ] Pick 5 random products
- [ ] Compare prices in customer_pricing_sync vs SQL Server
- [ ] Verify prices match
- [ ] Check price calculation (list_price, discount_pct, dfi_price)

### Test Error Handling
- [ ] (Optional) Test with SQL Server temporarily unreachable
- [ ] Verify retry logic works
- [ ] Verify graceful failure
- [ ] Verify error logged to pricing_sync_log

**Status**: 🔴 Waiting for Phase 2

---

## Phase 4: N8N Workflow Setup 🔴 NOT STARTED

### Choose Integration Method
- [ ] Option A: HTTP Endpoint (recommended)
- [ ] Option B: SSH Execution

### If Using HTTP Endpoint (Option A)
- [ ] Start sync server:
  ```bash
  node sync-server.js
  ```
- [ ] Test health endpoint:
  ```bash
  curl http://localhost:3000/health
  ```
- [ ] Test sync endpoint:
  ```bash
  curl -X POST http://localhost:3000/sync-pricing \
    -H "X-API-Key: your_api_key"
  ```
- [ ] Verify response shows sync results

### If Using SSH (Option B)
- [ ] Deploy scripts to server
- [ ] Test SSH access
- [ ] Run sync via SSH manually:
  ```bash
  ssh user@server 'cd /path/to/scripts && node run-pricing-sync.js'
  ```

### Import Workflow to N8N
- [ ] Log in to N8N Cloud (keithharper.app.n8n.cloud)
- [ ] Import `n8n-pricing-sync-workflow.json`
- [ ] Configure Schedule Trigger:
  - [ ] Set cron schedule (e.g., `0 3 * * *` for 3 AM)
  - [ ] Set timezone
- [ ] Configure HTTP Request node (Option A):
  - [ ] Set URL to sync server
  - [ ] Add HTTP Header Auth credential with API key
  - [ ] Set timeout to 600000ms (10 minutes)
- [ ] OR Configure SSH node (Option B):
  - [ ] Add SSH credentials
  - [ ] Set command: `node /path/to/run-pricing-sync.js`
- [ ] Configure Email nodes:
  - [ ] Set success email addresses
  - [ ] Set failure email addresses
  - [ ] Test email delivery

### Test Workflow
- [ ] Run workflow manually (don't activate schedule yet)
- [ ] Verify sync executes
- [ ] Verify success/failure detection works
- [ ] Verify email notifications sent
- [ ] Check N8N execution history for errors

### Activate Workflow
- [ ] Review workflow configuration
- [ ] Activate schedule trigger
- [ ] Monitor first scheduled execution

**Status**: 🔴 Waiting for Phase 3

---

## Phase 5: Validation Period (7 Days) 🔴 NOT STARTED

**IMPORTANT**: Do NOT modify application code yet. App continues using `customer_product_pricing` table.

### Day 1
- [ ] Verify sync ran at scheduled time
- [ ] Check pricing_sync_log for success
- [ ] Check email notification received
- [ ] Verify record counts in customer_pricing_sync
- [ ] Spot check 5 products for pricing accuracy

### Day 2
- [ ] Verify sync ran at scheduled time
- [ ] Check pricing_sync_log for success
- [ ] Check email notification received
- [ ] Compare data between old and new tables

### Day 3
- [ ] Verify sync ran at scheduled time
- [ ] Check pricing_sync_log for success
- [ ] Check email notification received
- [ ] Run price comparison query

### Day 4
- [ ] Verify sync ran at scheduled time
- [ ] Check pricing_sync_log for success
- [ ] Check email notification received
- [ ] Review any price changes

### Day 5
- [ ] Verify sync ran at scheduled time
- [ ] Check pricing_sync_log for success
- [ ] Check email notification received
- [ ] Test sync manually to confirm consistency

### Day 6
- [ ] Verify sync ran at scheduled time
- [ ] Check pricing_sync_log for success
- [ ] Check email notification received
- [ ] Prepare for cutover (review checklist)

### Day 7
- [ ] Verify sync ran at scheduled time
- [ ] Check pricing_sync_log for success
- [ ] Check email notification received
- [ ] Final validation before cutover

### Validation Criteria (All Must Pass)
- [ ] 7 consecutive successful syncs
- [ ] Zero errors in pricing_sync_log
- [ ] Zero failed records in all syncs
- [ ] Record counts stable and match expectations
- [ ] Spot checks confirm pricing accuracy
- [ ] No sync failures or error emails
- [ ] Data freshness confirmed (updated_at < 24 hours)

**Status**: 🔴 Waiting for Phase 4

---

## Phase 6: Cutover to Production 🔴 NOT STARTED

**CRITICAL**: Only proceed if all Phase 5 validation criteria passed.

### Pre-Cutover Checks
- [ ] Verify 7 successful syncs in pricing_sync_log
- [ ] Verify no errors or failed records
- [ ] Verify record counts match expectations
- [ ] Review price comparison queries
- [ ] Confirm no application issues
- [ ] Notify team of planned cutover

### Apply Cutover Migration
- [ ] Review migration 052 one more time
- [ ] Run cutover:
  ```bash
  node apply-migration.js 052
  ```
- [ ] Verify output shows success
- [ ] Check tables renamed:
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'customer_p%'
  ORDER BY table_name;
  ```
- [ ] Should see:
  - customer_pricing_sync (temporary, will be gone)
  - customer_product_pricing (now has synced data)
  - customer_product_pricing_backup (original data)

### Test Application
- [ ] Restart Next.js app (if running)
- [ ] Open order portal
- [ ] Process a test order
- [ ] Verify pricing lookups work
- [ ] Check for price variance warnings (should be minimal)
- [ ] Verify no errors in browser console
- [ ] Verify no errors in server logs

### Monitor for 24 Hours
- [ ] Hour 1: Check application logs
- [ ] Hour 2: Process another test order
- [ ] Hour 4: Review application logs
- [ ] Hour 8: Check for any errors
- [ ] Hour 12: Verify sync runs successfully
- [ ] Hour 24: Final review before marking complete

### Rollback Plan (If Issues Found)
- [ ] (Only if needed) Run rollback SQL:
  ```sql
  BEGIN;
  ALTER TABLE customer_product_pricing RENAME TO customer_pricing_sync;
  ALTER TABLE customer_product_pricing_backup RENAME TO customer_product_pricing;
  -- Fix indexes (see PRICING_SYNC_QUICK_REFERENCE.md)
  COMMIT;
  ```
- [ ] Restart application
- [ ] Investigate root cause

**Status**: 🔴 Waiting for Phase 5

---

## Phase 7: Post-Cutover Cleanup 🔴 NOT STARTED

**Wait 30 days after cutover before proceeding.**

### 30-Day Monitoring
- [ ] Day 1-7: Check application daily for issues
- [ ] Day 8-14: Check application every 2 days
- [ ] Day 15-30: Check application weekly
- [ ] Verify pricing accuracy throughout period
- [ ] Verify no order processing issues
- [ ] Verify price variance warnings minimal

### Drop Backup Table
- [ ] Confirm 30 days passed since cutover
- [ ] Confirm zero issues with new table
- [ ] Confirm team approval
- [ ] Drop backup:
  ```sql
  DROP TABLE IF EXISTS customer_product_pricing_backup;
  ```

### Update Documentation
- [ ] Mark implementation as complete
- [ ] Document any lessons learned
- [ ] Update runbook with operational procedures
- [ ] Archive old CSV import process documentation

**Status**: 🔴 Waiting for Phase 6 + 30 days

---

## Optional Enhancements 🔵 FUTURE

### Product Details Enrichment
- [ ] Identify SQL Server products table
- [ ] Add JOIN to sync query for description, brand, category
- [ ] Test enriched sync
- [ ] Update documentation

### Delta Sync
- [ ] Add last_sync_timestamp tracking
- [ ] Modify query to only fetch changed records
- [ ] Test delta sync
- [ ] Compare performance vs full sync

### Real-time Updates
- [ ] Investigate PeopleSoft webhook capabilities
- [ ] Design webhook receiver endpoint
- [ ] Implement immediate price updates
- [ ] Keep nightly sync as safety net

### Pricing History
- [ ] Create pricing_history table
- [ ] Modify sync to archive old prices before update
- [ ] Create price change report queries
- [ ] Build price trend dashboard

### Dashboard
- [ ] Choose dashboard tool (Grafana/Metabase)
- [ ] Create sync monitoring dashboard
- [ ] Create pricing analytics dashboard
- [ ] Set up alerts for anomalies

**Status**: 🔵 Future enhancements

---

## 📊 Progress Summary

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 0: Database Setup | ✅ Complete | Feb 9, 2026 | Feb 9, 2026 |
| Phase 1: Gather Requirements | 🟡 In Progress | | |
| Phase 2: Install & Configure | 🔴 Not Started | | |
| Phase 3: Manual Testing | 🔴 Not Started | | |
| Phase 4: N8N Workflow | 🔴 Not Started | | |
| Phase 5: 7-Day Validation | 🔴 Not Started | | |
| Phase 6: Cutover | 🔴 Not Started | | |
| Phase 7: Cleanup | 🔴 Not Started | | |

**Overall Progress**: 12.5% (1 of 8 phases complete)

---

## 📝 Notes & Issues

### Issues Encountered
(Record any issues here during implementation)

### Lessons Learned
(Record lessons learned here during implementation)

### Team Feedback
(Record feedback from team members here)

---

## 🎯 Success Metrics

Track these metrics to measure success:

### Before Implementation
- [ ] Document current price variance warning frequency: _____ per day
- [ ] Document manual price correction frequency: _____ per week
- [ ] Document order posting errors due to pricing: _____ per month
- [ ] Document time spent on manual pricing updates: _____ hours/month

### After Implementation (30 days)
- [ ] Measure price variance warning frequency: _____ per day
- [ ] Measure manual price correction frequency: _____ per week
- [ ] Measure order posting errors due to pricing: _____ per month
- [ ] Measure time spent on manual pricing updates: _____ hours/month

### Improvement Calculation
- [ ] Price variance reduction: _____%
- [ ] Manual correction reduction: _____%
- [ ] Order error reduction: _____%
- [ ] Time savings: _____ hours/month

---

**Last Updated**: February 9, 2026
**Next Review**: After Phase 1 completion
