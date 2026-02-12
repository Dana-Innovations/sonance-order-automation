# SQL Server Pricing Sync - Quick Reference

## 🔧 Connection Info

### Supabase PostgreSQL
```
Host: aws-0-us-west-1.pooler.supabase.com
Port: 5432
Database: postgres
User: postgres.xgftwwircksmhevzkrhn
Password: WMw9Fs0sEe42HrSU
SSL Mode: require
```

### SQL Server
```
Database: FS92STG
Source Table: insite.psCustomerProdPrice
Products Table: insite.psProducts (customize)
```

---

## ⚡ Quick Setup Commands

### 1. Create ODBC DSN
```
Windows + R → odbcad32.exe
System DSN → Add → PostgreSQL Unicode(x64)
Data Source: SupabaseODBC
(Fill in connection details above)
```

### 2. Create Linked Server
```sql
EXEC sp_addlinkedserver
    @server = N'SUPABASE',
    @srvproduct = N'PostgreSQL',
    @provider = N'MSDASQL',
    @datasrc = N'SupabaseODBC';

EXEC sp_addlinkedsrvlogin
    @rmtsrvname = N'SUPABASE',
    @useself = N'FALSE',
    @locallogin = NULL,
    @rmtuser = N'postgres.xgftwwircksmhevzkrhn',
    @rmtpassword = N'WMw9Fs0sEe42HrSU';
```

### 3. Test Connection
```sql
SELECT * FROM OPENQUERY(SUPABASE, 'SELECT 1 as test');
```

### 4. Run Sync
```sql
EXEC dbo.sp_SyncPricingToSupabase;
```

---

## 📋 Common Queries

### Check Sync Status
```sql
SELECT *
FROM OPENQUERY(SUPABASE, '
    SELECT * FROM public.pricing_sync_log
    ORDER BY sync_started_at DESC
    LIMIT 5
');
```

### Check Data in Supabase
```sql
SELECT COUNT(*), COUNT(DISTINCT ps_customer_id)
FROM OPENQUERY(SUPABASE, 'SELECT * FROM public.customer_pricing_sync');
```

### View Job History
```sql
SELECT TOP 10
    h.run_date,
    h.run_time,
    CASE h.run_status
        WHEN 1 THEN 'Success'
        WHEN 0 THEN 'Failed'
    END AS status,
    h.message
FROM msdb.dbo.sysjobs j
INNER JOIN msdb.dbo.sysjobhistory h ON j.job_id = h.job_id
WHERE j.name = 'Nightly Pricing Sync to Supabase'
ORDER BY h.instance_id DESC;
```

### Run Job Manually
```sql
EXEC msdb.dbo.sp_start_job @job_name = N'Nightly Pricing Sync to Supabase';
```

---

## 🔍 Troubleshooting

### Linked Server Won't Connect
```sql
-- Test linked server
EXEC sp_testlinkedserver 'SUPABASE';

-- Check ODBC DSN exists (run in PowerShell)
Get-OdbcDsn -Name "SupabaseODBC"

-- Increase timeout
EXEC sp_serveroption 'SUPABASE', 'query timeout', '600';
```

### Job Not Running
```sql
-- Check SQL Agent is running
EXEC xp_servicecontrol 'QueryState', 'SQLServerAgent';

-- View job configuration
SELECT * FROM msdb.dbo.sysjobs
WHERE name = 'Nightly Pricing Sync to Supabase';

-- Check next run time
EXEC msdb.dbo.sp_help_job @job_name = 'Nightly Pricing Sync to Supabase';
```

### Email Not Sending
```sql
-- Test Database Mail
EXEC msdb.dbo.sp_send_dbmail
    @profile_name = 'Default SQL Mail Profile',
    @recipients = 'your-email@domain.com',
    @subject = 'Test',
    @body = 'Test email';

-- Check mail queue
SELECT * FROM msdb.dbo.sysmail_mailitems
ORDER BY send_request_date DESC;

-- Check for errors
SELECT * FROM msdb.dbo.sysmail_event_log
ORDER BY log_date DESC;
```

---

## 📊 Monitoring Queries

### Daily Health Check
```sql
-- Last sync status
SELECT
    sync_started_at,
    sync_completed_at,
    status,
    records_processed,
    DATEDIFF(SECOND, sync_started_at, sync_completed_at) AS duration_seconds
FROM OPENQUERY(SUPABASE, '
    SELECT * FROM public.pricing_sync_log
    ORDER BY sync_started_at DESC
    LIMIT 1
');

-- Should show:
-- ✓ status = 'success'
-- ✓ records_processed > 0
-- ✓ duration_seconds < 300 (5 minutes)
```

### Weekly Summary
```sql
SELECT
    CONVERT(DATE, sync_started_at) AS sync_date,
    status,
    records_processed,
    records_failed
FROM OPENQUERY(SUPABASE, '
    SELECT * FROM public.pricing_sync_log
    WHERE sync_started_at > NOW() - INTERVAL ''7 days''
    ORDER BY sync_started_at DESC
');
```

---

## 🚨 Emergency Procedures

### Disable Job
```sql
EXEC msdb.dbo.sp_update_job
    @job_name = N'Nightly Pricing Sync to Supabase',
    @enabled = 0;
```

### Re-enable Job
```sql
EXEC msdb.dbo.sp_update_job
    @job_name = N'Nightly Pricing Sync to Supabase',
    @enabled = 1;
```

### Delete Linked Server
```sql
EXEC sp_dropserver 'SUPABASE', 'droplogins';
```

### Clear Test Data from Supabase
```sql
DELETE FROM OPENQUERY(SUPABASE, 'SELECT * FROM public.customer_pricing_sync');
```

---

## 📝 Customization Points

When implementing, customize these:

1. **Products Table:**
   ```sql
   -- Line ~150 in stored procedure
   LEFT JOIN insite.psProducts p ON cp.PRODUCT_ID = p.PRODUCT_ID
   -- Replace with your actual table name
   ```

2. **Description Column:**
   ```sql
   -- Line ~165 in stored procedure
   p.DESCR AS description
   -- Replace DESCR with your actual column name
   ```

3. **Email Addresses:**
   ```sql
   -- In Database Mail setup
   @recipients = 'ops@yourdomain.com'
   -- Replace with your email
   ```

4. **Sync Schedule:**
   ```sql
   -- In job schedule setup
   @active_start_time = 030000  -- 3:00 AM
   -- Change time as needed (HHMMSS format)
   ```

---

## 📦 File Locations

### Configuration
- ODBC DSN: Windows ODBC Data Source Administrator (64-bit)
- Linked Server: SSMS → Server Objects → Linked Servers → SUPABASE
- Job: SSMS → SQL Server Agent → Jobs → Nightly Pricing Sync to Supabase

### Logs
- SQL Server Error Log: SSMS → Management → SQL Server Logs
- SQL Agent Log: SSMS → SQL Server Agent → Error Logs
- Job History: Right-click job → View History
- Database Mail Log: `msdb.dbo.sysmail_event_log`
- Supabase Sync Log: `public.pricing_sync_log` table

---

## ✅ Go-Live Checklist

- [ ] ODBC driver installed
- [ ] ODBC DSN created and tested
- [ ] Linked server created
- [ ] Test query succeeds: `SELECT * FROM OPENQUERY(SUPABASE, 'SELECT 1')`
- [ ] Products table identified
- [ ] Stored procedure created with correct table/column names
- [ ] Stored procedure runs successfully
- [ ] Data appears in Supabase
- [ ] Pricing spot checks match SQL Server
- [ ] SQL Server Agent job created
- [ ] Job schedule configured (3 AM daily)
- [ ] Job runs manually successfully
- [ ] Database Mail configured (optional)
- [ ] Email notifications working (optional)
- [ ] Monitored for 7 days

---

## 🎯 Success Criteria

**Healthy Sync:**
- Status: `success`
- Records Processed: ~10,000
- Records Failed: 0
- Duration: 30-120 seconds
- Runs nightly without errors

**Investigate If:**
- Status: `failed` or `partial`
- Records Failed > 0
- Duration > 300 seconds
- Sync didn't run (check schedule)
- Email alerts received

---

## 📞 Support Contacts

- **SQL Server Issues:** Your DBA team
- **Supabase Issues:** Database team / DevOps
- **Network/Firewall:** IT Infrastructure
- **SMTP/Email:** Email administrator

---

## 📚 Full Documentation

See `SQL_SERVER_PRICING_SYNC_GUIDE.md` for:
- Detailed step-by-step instructions
- Complete stored procedure code
- Troubleshooting guide
- Performance optimization
- Email notification setup
