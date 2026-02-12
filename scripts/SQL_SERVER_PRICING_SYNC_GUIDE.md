# SQL Server to Supabase Pricing Sync - Implementation Guide

**Approach:** Push pricing data from SQL Server directly to Supabase PostgreSQL using a scheduled SQL Server Agent job.

**Benefits:**
- ✅ No VPN/firewall issues (SQL Server initiates outbound connection)
- ✅ No Node.js/N8N infrastructure needed
- ✅ Leverages existing SQL Server expertise
- ✅ Native SQL Server scheduling and error handling
- ✅ Better performance (database-to-database)

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Part 1: Install PostgreSQL ODBC Driver](#part-1-install-postgresql-odbc-driver)
3. [Part 2: Create ODBC Data Source](#part-2-create-odbc-data-source)
4. [Part 3: Create Linked Server to Supabase](#part-3-create-linked-server-to-supabase)
5. [Part 4: Test Linked Server Connection](#part-4-test-linked-server-connection)
6. [Part 5: Create Sync Stored Procedure](#part-5-create-sync-stored-procedure)
7. [Part 6: Set Up SQL Server Agent Job](#part-6-set-up-sql-server-agent-job)
8. [Part 7: Configure Email Notifications](#part-7-configure-email-notifications)
9. [Part 8: Testing and Validation](#part-8-testing-and-validation)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Access
- [ ] SQL Server sysadmin or equivalent permissions
- [ ] Access to install software on SQL Server (for ODBC driver)
- [ ] SQL Server Agent running
- [ ] Database Mail configured (for notifications)

### Information Needed
- **Supabase Connection:**
  - Host: `aws-0-us-west-1.pooler.supabase.com`
  - Port: `5432`
  - Database: `postgres`
  - User: `postgres.xgftwwircksmhevzkrhn`
  - Password: `WMw9Fs0sEe42HrSU`
  - SSL Mode: `require`

- **SQL Server Database:**
  - Server: Your SQL Server instance
  - Database: `FS92STG`
  - Source Table: `insite.psCustomerProdPrice`
  - Products Table: (You'll identify this during testing)

---

## Part 1: Install PostgreSQL ODBC Driver

The PostgreSQL ODBC driver allows SQL Server to connect to PostgreSQL databases like Supabase.

### Step 1.1: Download ODBC Driver

**Download the 64-bit PostgreSQL ODBC driver:**
- URL: https://www.postgresql.org/ftp/odbc/versions/msi/
- Latest version: `psqlodbc_16_00_0000-x64.zip` (or newer)
- Or direct installer: `psqlodbc_x64.msi`

### Step 1.2: Install on SQL Server

**Run the installer on the SQL Server machine:**

1. Extract or run the MSI installer
2. Accept license agreement
3. Choose installation path (default is fine)
4. Complete installation
5. Verify installation:
   - Open **ODBC Data Sources (64-bit)** from Windows Start
   - Go to **Drivers** tab
   - You should see **PostgreSQL Unicode(x64)** or similar

---

## Part 2: Create ODBC Data Source

Create a System DSN that SQL Server can use to connect to Supabase.

### Step 2.1: Open ODBC Data Source Administrator

1. Press `Windows + R`
2. Type: `odbcad32.exe` (for 64-bit)
3. Click **OK**

### Step 2.2: Add System DSN

1. Click **System DSN** tab
2. Click **Add...**
3. Select **PostgreSQL Unicode(x64)**
4. Click **Finish**

### Step 2.3: Configure Connection

**Fill in the PostgreSQL ODBC Driver Setup dialog:**

```
Data Source: SupabaseODBC
Database: postgres
Server: aws-0-us-west-1.pooler.supabase.com
User Name: postgres.xgftwwircksmhevzkrhn
Description: Supabase PostgreSQL Connection
Port: 5432
Password: WMw9Fs0sEe42HrSU
SSL Mode: require
```

**Important settings:**
- ✅ Check **SSL Mode**: `require`
- ✅ Uncheck **Use Declare/Fetch** (for better performance)
- ✅ Check **Unicode** (default for Unicode driver)

### Step 2.4: Test Connection

1. Click **Test** button
2. Should see: **Connection successful**
3. Click **Save**

**If test fails:**
- Verify firewall allows outbound connections on port 5432
- Check credentials are correct
- Ensure SSL Mode is set to `require`

---

## Part 3: Create Linked Server to Supabase

Now configure SQL Server to use the ODBC connection as a linked server.

### Step 3.1: Create Linked Server

Run this in SQL Server Management Studio (SSMS):

```sql
USE [master];
GO

-- Create the linked server
EXEC sp_addlinkedserver
    @server = N'SUPABASE',
    @srvproduct = N'PostgreSQL',
    @provider = N'MSDASQL',
    @datasrc = N'SupabaseODBC';  -- Name of the ODBC DSN we created
GO

-- Configure linked server options
EXEC sp_serveroption 'SUPABASE', 'data access', 'true';
EXEC sp_serveroption 'SUPABASE', 'rpc', 'false';
EXEC sp_serveroption 'SUPABASE', 'rpc out', 'false';
EXEC sp_serveroption 'SUPABASE', 'connect timeout', '60';
EXEC sp_serveroption 'SUPABASE', 'query timeout', '300';  -- 5 minutes
GO
```

### Step 3.2: Add Login Mapping

**Option A: Map all logins to Supabase credential (recommended):**

```sql
-- Map all SQL Server logins to Supabase user
EXEC sp_addlinkedsrvlogin
    @rmtsrvname = N'SUPABASE',
    @useself = N'FALSE',
    @locallogin = NULL,
    @rmtuser = N'postgres.xgftwwircksmhevzkrhn',
    @rmtpassword = N'WMw9Fs0sEe42HrSU';
GO
```

**Option B: Map specific login only:**

```sql
-- Map only your SQL Server login
EXEC sp_addlinkedsrvlogin
    @rmtsrvname = N'SUPABASE',
    @useself = N'FALSE',
    @locallogin = N'YourSQLServerLogin',
    @rmtuser = N'postgres.xgftwwircksmhevzkrhn',
    @rmtpassword = N'WMw9Fs0sEe42HrSU';
GO
```

### Step 3.3: Verify Linked Server

Check the linked server appears in SSMS:

```
Object Explorer → Server Objects → Linked Servers → SUPABASE
```

---

## Part 4: Test Linked Server Connection

Verify you can query Supabase tables from SQL Server.

### Step 4.1: Test Basic Query

```sql
-- Query Supabase customers table
SELECT TOP 5 *
FROM OPENQUERY(SUPABASE, 'SELECT * FROM public.customers LIMIT 5');
```

**Expected result:** Rows from the customers table

### Step 4.2: Test Active Customers Query

```sql
-- Get active customers for sync
SELECT *
FROM OPENQUERY(SUPABASE, '
    SELECT ps_customer_id, customer_name, is_active
    FROM public.customers
    WHERE is_active = true
');
```

### Step 4.3: Test Writing to Supabase

```sql
-- Test insert (will rollback)
BEGIN TRANSACTION;

-- Insert test record
INSERT INTO OPENQUERY(SUPABASE, 'SELECT * FROM public.customer_pricing_sync')
(ps_customer_id, product_id, uom, currency_code, dfi_price, updated_at)
VALUES ('TEST', 'TEST123', 'EA', 'USD', 10.00, GETDATE());

-- Verify insert
SELECT * FROM OPENQUERY(SUPABASE, '
    SELECT * FROM public.customer_pricing_sync WHERE ps_customer_id = ''TEST''
');

-- Rollback test
ROLLBACK TRANSACTION;
```

**If all queries succeed, your linked server is working!** ✅

---

## Part 5: Create Sync Stored Procedure

Now create the stored procedure that performs the actual sync.

### Step 5.1: Identify Products Table

First, find your products table with description field:

```sql
-- Search for products table in your SQL Server
SELECT
    s.name AS schema_name,
    t.name AS table_name
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE t.name LIKE '%product%'
   OR t.name LIKE '%prod%'
ORDER BY s.name, t.name;
```

**Once you identify the table (e.g., `insite.psProducts`), check its columns:**

```sql
-- Replace with your actual table name
SELECT
    c.name AS column_name,
    t.name AS data_type,
    c.max_length
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE object_id = OBJECT_ID('insite.psProducts')  -- Your table name here
ORDER BY c.column_id;
```

**Look for these columns:**
- Product ID (join key) - e.g., `PRODUCT_ID`, `PROD_ID`
- Description - e.g., `DESCR`, `DESCRIPTION`, `PROD_DESC`
- Brand (optional) - e.g., `BRAND`, `BRAND_NAME`
- Category (optional) - e.g., `CATEGORY`, `PROD_CATEGORY`

### Step 5.2: Create Stored Procedure

**IMPORTANT: Replace placeholders with your actual table/column names**

```sql
USE [FS92STG];
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_SyncPricingToSupabase]
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;  -- Rollback on any error

    DECLARE @StartTime DATETIME = GETDATE();
    DECLARE @RecordsProcessed INT = 0;
    DECLARE @RecordsInserted INT = 0;
    DECLARE @RecordsUpdated INT = 0;
    DECLARE @RecordsFailed INT = 0;
    DECLARE @ErrorMessage NVARCHAR(4000);
    DECLARE @SyncStatus VARCHAR(20);

    BEGIN TRY
        PRINT '═══════════════════════════════════════════════════';
        PRINT 'Starting Pricing Sync to Supabase';
        PRINT 'Started at: ' + CONVERT(VARCHAR, @StartTime, 120);
        PRINT '═══════════════════════════════════════════════════';
        PRINT '';

        -- Step 1: Get active customers from Supabase
        PRINT 'Step 1: Fetching active customers from Supabase...';

        IF OBJECT_ID('tempdb..#ActiveCustomers') IS NOT NULL
            DROP TABLE #ActiveCustomers;

        SELECT ps_customer_id, customer_name
        INTO #ActiveCustomers
        FROM OPENQUERY(SUPABASE, '
            SELECT ps_customer_id, customer_name
            FROM public.customers
            WHERE is_active = true AND ps_customer_id IS NOT NULL
            UNION
            SELECT child_ps_account_id as ps_customer_id, child_account_name as customer_name
            FROM public.customer_child_accounts
            WHERE is_active = true AND child_ps_account_id IS NOT NULL
        ');

        DECLARE @CustomerCount INT = @@ROWCOUNT;
        PRINT '✓ Found ' + CAST(@CustomerCount AS VARCHAR) + ' active customers';
        PRINT '';

        -- Step 2: Prepare pricing data with product details
        PRINT 'Step 2: Querying pricing data from SQL Server...';

        IF OBJECT_ID('tempdb..#PricingData') IS NOT NULL
            DROP TABLE #PricingData;

        -- ⚠️ CUSTOMIZE THIS QUERY WITH YOUR ACTUAL TABLE AND COLUMN NAMES ⚠️
        SELECT
            cp.CUST_ID AS ps_customer_id,
            ac.customer_name,
            cp.PRODUCT_ID AS product_id,
            cp.UNIT_OF_MEASURE AS uom,
            cp.UNIT_OF_MEASURE AS pricing_uom,
            'USD' AS currency_code,
            CAST(ISNULL(cp.LIST_PRICE, 0) AS DECIMAL(12,4)) AS list_price,
            CAST(ISNULL(cp.DFI, 0) AS DECIMAL(5,4)) AS discount_pct,
            CAST(ISNULL(cp.NET_PRICE, 0) AS DECIMAL(12,4)) AS dfi_price,
            CASE WHEN ISNULL(cp.QTY, 0) = 1 THEN 1 ELSE 0 END AS is_default_uom,

            -- Product details from products table (CUSTOMIZE THESE)
            p.DESCR AS description,  -- ⚠️ Replace with your actual column name
            NULL AS brand,           -- Set to p.BRAND if you have it
            NULL AS category,        -- Set to p.CATEGORY if you have it
            0 AS is_kit,

            NULL AS catalog_number,
            NULL AS prod_group_catalog
        INTO #PricingData
        FROM insite.psCustomerProdPrice cp
        INNER JOIN #ActiveCustomers ac ON cp.CUST_ID = ac.ps_customer_id
        LEFT JOIN insite.psProducts p ON cp.PRODUCT_ID = p.PRODUCT_ID  -- ⚠️ Customize table and join
        WHERE cp.CUST_ID IS NOT NULL
          AND cp.PRODUCT_ID IS NOT NULL
          AND cp.UNIT_OF_MEASURE IS NOT NULL;

        SET @RecordsProcessed = @@ROWCOUNT;
        PRINT '✓ Retrieved ' + CAST(@RecordsProcessed AS VARCHAR) + ' pricing records';
        PRINT '';

        -- Step 3: Delete existing data in Supabase (clean slate approach)
        PRINT 'Step 3: Clearing existing data in Supabase...';

        DELETE FROM OPENQUERY(SUPABASE, 'SELECT * FROM public.customer_pricing_sync');

        PRINT '✓ Cleared existing records';
        PRINT '';

        -- Step 4: Insert pricing data to Supabase
        PRINT 'Step 4: Inserting pricing data to Supabase...';

        INSERT INTO OPENQUERY(SUPABASE, 'SELECT * FROM public.customer_pricing_sync')
        (
            ps_customer_id,
            customer_name,
            product_id,
            uom,
            pricing_uom,
            currency_code,
            list_price,
            discount_pct,
            dfi_price,
            is_default_uom,
            description,
            brand,
            category,
            is_kit,
            catalog_number,
            prod_group_catalog,
            updated_at
        )
        SELECT
            ps_customer_id,
            customer_name,
            product_id,
            uom,
            pricing_uom,
            currency_code,
            list_price,
            discount_pct,
            dfi_price,
            is_default_uom,
            description,
            brand,
            category,
            is_kit,
            catalog_number,
            prod_group_catalog,
            GETDATE()
        FROM #PricingData;

        SET @RecordsInserted = @@ROWCOUNT;
        SET @SyncStatus = 'success';

        PRINT '✓ Inserted ' + CAST(@RecordsInserted AS VARCHAR) + ' records';
        PRINT '';

        -- Step 5: Log sync results to Supabase
        PRINT 'Step 5: Logging sync results...';

        INSERT INTO OPENQUERY(SUPABASE, 'SELECT * FROM public.pricing_sync_log')
        (
            sync_started_at,
            sync_completed_at,
            status,
            records_processed,
            records_inserted,
            records_updated,
            records_failed,
            error_message
        )
        VALUES
        (
            @StartTime,
            GETDATE(),
            @SyncStatus,
            @RecordsProcessed,
            @RecordsInserted,
            0,
            @RecordsFailed,
            NULL
        );

        PRINT '✓ Logged sync results';
        PRINT '';

        -- Success summary
        DECLARE @Duration INT = DATEDIFF(SECOND, @StartTime, GETDATE());
        PRINT '═══════════════════════════════════════════════════';
        PRINT '✓ Sync completed successfully!';
        PRINT 'Duration: ' + CAST(@Duration AS VARCHAR) + ' seconds';
        PRINT 'Records processed: ' + CAST(@RecordsProcessed AS VARCHAR);
        PRINT 'Records inserted: ' + CAST(@RecordsInserted AS VARCHAR);
        PRINT '═══════════════════════════════════════════════════';

        -- Clean up
        DROP TABLE #ActiveCustomers;
        DROP TABLE #PricingData;

    END TRY
    BEGIN CATCH
        -- Error handling
        SET @ErrorMessage = ERROR_MESSAGE();
        SET @SyncStatus = 'failed';

        PRINT '';
        PRINT '═══════════════════════════════════════════════════';
        PRINT '✗ Sync failed!';
        PRINT 'Error: ' + @ErrorMessage;
        PRINT '═══════════════════════════════════════════════════';

        -- Try to log error to Supabase
        BEGIN TRY
            INSERT INTO OPENQUERY(SUPABASE, 'SELECT * FROM public.pricing_sync_log')
            (
                sync_started_at,
                sync_completed_at,
                status,
                records_processed,
                records_inserted,
                records_updated,
                records_failed,
                error_message
            )
            VALUES
            (
                @StartTime,
                GETDATE(),
                @SyncStatus,
                @RecordsProcessed,
                @RecordsInserted,
                0,
                @RecordsFailed,
                @ErrorMessage
            );
        END TRY
        BEGIN CATCH
            PRINT 'Failed to log error to Supabase: ' + ERROR_MESSAGE();
        END CATCH

        -- Re-throw error for SQL Server Agent to catch
        THROW;
    END CATCH
END;
GO
```

### Step 5.3: Test Stored Procedure

```sql
-- Test the stored procedure
EXEC dbo.sp_SyncPricingToSupabase;
```

**Expected output:**
```
═══════════════════════════════════════════════════
Starting Pricing Sync to Supabase
Started at: 2026-02-09 15:30:00
═══════════════════════════════════════════════════

Step 1: Fetching active customers from Supabase...
✓ Found 6 active customers

Step 2: Querying pricing data from SQL Server...
✓ Retrieved 10247 pricing records

Step 3: Clearing existing data in Supabase...
✓ Cleared existing records

Step 4: Inserting pricing data to Supabase...
✓ Inserted 10247 records

Step 5: Logging sync results...
✓ Logged sync results

═══════════════════════════════════════════════════
✓ Sync completed successfully!
Duration: 45 seconds
Records processed: 10247
Records inserted: 10247
═══════════════════════════════════════════════════
```

**Verify in Supabase:**

```sql
-- Check data in Supabase
SELECT COUNT(*), COUNT(DISTINCT ps_customer_id)
FROM OPENQUERY(SUPABASE, 'SELECT * FROM public.customer_pricing_sync');

-- Check sync log
SELECT *
FROM OPENQUERY(SUPABASE, 'SELECT * FROM public.pricing_sync_log ORDER BY sync_started_at DESC LIMIT 1');
```

---

## Part 6: Set Up SQL Server Agent Job

Create a scheduled job to run the sync nightly.

### Step 6.1: Verify SQL Server Agent is Running

```sql
-- Check if SQL Server Agent is running
EXEC xp_servicecontrol 'QueryState', 'SQLServerAgent';
```

**Expected:** `Running.`

**If not running:**
- Start SQL Server Agent service from SQL Server Configuration Manager
- Or: Services → SQL Server Agent → Start

### Step 6.2: Create SQL Server Agent Job

```sql
USE [msdb];
GO

-- Create the job
EXEC dbo.sp_add_job
    @job_name = N'Nightly Pricing Sync to Supabase',
    @enabled = 1,
    @description = N'Syncs customer pricing data from SQL Server to Supabase PostgreSQL database nightly at 3 AM',
    @category_name = N'Data Collector';
GO

-- Add job step
EXEC sp_add_jobstep
    @job_name = N'Nightly Pricing Sync to Supabase',
    @step_name = N'Execute Sync Procedure',
    @subsystem = N'TSQL',
    @command = N'EXEC dbo.sp_SyncPricingToSupabase',
    @database_name = N'FS92STG',
    @retry_attempts = 2,
    @retry_interval = 5;  -- Wait 5 minutes between retries
GO

-- Create schedule (daily at 3:00 AM)
EXEC sp_add_schedule
    @schedule_name = N'Daily at 3 AM',
    @freq_type = 4,           -- Daily
    @freq_interval = 1,       -- Every 1 day
    @active_start_time = 030000;  -- 03:00:00 (3:00 AM)
GO

-- Attach schedule to job
EXEC sp_attach_schedule
    @job_name = N'Nightly Pricing Sync to Supabase',
    @schedule_name = N'Daily at 3 AM';
GO

-- Add job to local server
EXEC sp_add_jobserver
    @job_name = N'Nightly Pricing Sync to Supabase',
    @server_name = N'(LOCAL)';
GO

PRINT 'Job created successfully!';
PRINT 'Next scheduled run: Tonight at 3:00 AM';
```

### Step 6.3: Verify Job Created

**In SSMS:**
1. Expand **SQL Server Agent** → **Jobs**
2. Find **Nightly Pricing Sync to Supabase**
3. Right-click → **Properties** to review settings

**Or query:**

```sql
-- Check job details
SELECT
    j.name AS job_name,
    j.enabled,
    s.name AS schedule_name,
    s.freq_type,
    s.active_start_time
FROM msdb.dbo.sysjobs j
LEFT JOIN msdb.dbo.sysjobschedules js ON j.job_id = js.job_id
LEFT JOIN msdb.dbo.sysschedules s ON js.schedule_id = s.schedule_id
WHERE j.name = 'Nightly Pricing Sync to Supabase';
```

### Step 6.4: Test Job Manually

```sql
-- Run job manually (don't wait for schedule)
EXEC msdb.dbo.sp_start_job @job_name = N'Nightly Pricing Sync to Supabase';
```

**Check job history:**

```sql
-- View job execution history
SELECT
    j.name AS job_name,
    h.step_name,
    h.run_date,
    h.run_time,
    h.run_duration,
    CASE h.run_status
        WHEN 0 THEN 'Failed'
        WHEN 1 THEN 'Succeeded'
        WHEN 2 THEN 'Retry'
        WHEN 3 THEN 'Canceled'
    END AS run_status,
    h.message
FROM msdb.dbo.sysjobs j
INNER JOIN msdb.dbo.sysjobhistory h ON j.job_id = h.job_id
WHERE j.name = 'Nightly Pricing Sync to Supabase'
ORDER BY h.instance_id DESC;
```

---

## Part 7: Configure Email Notifications

Set up email alerts for sync success/failure.

### Step 7.1: Configure Database Mail

**Skip if Database Mail is already configured.**

```sql
-- Enable Database Mail
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'Database Mail XPs', 1;
RECONFIGURE;
GO

-- Create mail profile
EXECUTE msdb.dbo.sP_add_mail_profile
    @profile_name = 'Default SQL Mail Profile',
    @description = 'Default mail profile for SQL Server';
GO

-- Add mail account
-- ⚠️ CUSTOMIZE WITH YOUR SMTP SETTINGS ⚠️
EXECUTE msdb.dbo.sP_add_mail_account
    @account_name = 'SQL Server Mail Account',
    @email_address = 'sqlserver@yourdomain.com',
    @display_name = 'SQL Server Automated Alerts',
    @mailserver_name = 'smtp.yourdomain.com',
    @port = 587,
    @enable_ssl = 1,
    @username = 'your-smtp-username',
    @password = 'your-smtp-password';
GO

-- Link account to profile
EXECUTE msdb.dbo.sP_add_principalprofile
    @profile_name = 'Default SQL Mail Profile',
    @principal_name = 'public',
    @is_default = 1;
GO

-- Test Database Mail
EXEC msdb.dbo.sp_send_dbmail
    @profile_name = 'Default SQL Mail Profile',
    @recipients = 'your-email@yourdomain.com',
    @subject = 'Database Mail Test',
    @body = 'This is a test email from SQL Server Database Mail.';
GO
```

### Step 7.2: Create Email Operator

```sql
USE [msdb];
GO

-- Create operator for notifications
EXEC msdb.dbo.sp_add_operator
    @name = N'DB Operations Team',
    @enabled = 1,
    @email_address = N'ops@yourdomain.com';  -- ⚠️ CUSTOMIZE
GO
```

### Step 7.3: Add Email Notifications to Job

```sql
-- Update job to send notifications
EXEC sp_update_job
    @job_name = N'Nightly Pricing Sync to Supabase',
    @notify_level_email = 2,  -- 1=On success, 2=On failure, 3=Always
    @notify_email_operator_name = N'DB Operations Team';
GO
```

### Step 7.4: Customize Email Template (Optional)

For more detailed emails, modify the stored procedure to send custom emails:

```sql
-- Add this to the END of the stored procedure (in the TRY block for success)

DECLARE @EmailSubject NVARCHAR(255);
DECLARE @EmailBody NVARCHAR(MAX);

-- Success email
SET @EmailSubject = '✓ Pricing Sync Completed - ' + CAST(@RecordsProcessed AS VARCHAR) + ' records';
SET @EmailBody =
'Pricing Sync Summary:

Status: Success
Records Processed: ' + CAST(@RecordsProcessed AS VARCHAR) + '
Records Inserted: ' + CAST(@RecordsInserted AS VARCHAR) + '
Duration: ' + CAST(@Duration AS VARCHAR) + ' seconds
Timestamp: ' + CONVERT(VARCHAR, GETDATE(), 120) + '

Sync completed successfully.';

EXEC msdb.dbo.sp_send_dbmail
    @profile_name = 'Default SQL Mail Profile',
    @recipients = 'ops@yourdomain.com',
    @subject = @EmailSubject,
    @body = @EmailBody;
```

```sql
-- Add this to the CATCH block for failure emails

SET @EmailSubject = '✗ ALERT: Pricing Sync Failed';
SET @EmailBody =
'PRICING SYNC FAILURE ALERT

The nightly customer pricing sync has failed and requires immediate attention.

Error Details:
' + @ErrorMessage + '

Records Processed: ' + CAST(@RecordsProcessed AS VARCHAR) + '
Timestamp: ' + CONVERT(VARCHAR, GETDATE(), 120) + '

Please investigate the issue in the pricing_sync_log table and check SQL Server logs.';

EXEC msdb.dbo.sp_send_dbmail
    @profile_name = 'Default SQL Mail Profile',
    @recipients = 'ops@yourdomain.com,it@yourdomain.com',
    @subject = @EmailSubject,
    @body = @EmailBody,
    @importance = 'High';
```

---

## Part 8: Testing and Validation

Comprehensive testing before going live.

### Step 8.1: Manual Execution Test

```sql
-- Run stored procedure manually
EXEC dbo.sp_SyncPricingToSupabase;
```

**Verify output shows success messages.**

### Step 8.2: Verify Data in Supabase

```sql
-- Check record counts
SELECT
    COUNT(*) AS total_records,
    COUNT(DISTINCT ps_customer_id) AS unique_customers,
    MAX(updated_at) AS last_sync_time
FROM OPENQUERY(SUPABASE, 'SELECT * FROM public.customer_pricing_sync');

-- Check sync log
SELECT *
FROM OPENQUERY(SUPABASE, '
    SELECT * FROM public.pricing_sync_log
    ORDER BY sync_started_at DESC
    LIMIT 5
');
```

### Step 8.3: Spot Check Pricing Accuracy

```sql
-- Compare SQL Server vs Supabase pricing for sample products
-- SQL Server data
SELECT TOP 10
    CUST_ID,
    PRODUCT_ID,
    UNIT_OF_MEASURE,
    NET_PRICE
FROM insite.psCustomerProdPrice
ORDER BY CUST_ID, PRODUCT_ID;

-- Supabase data (same products)
SELECT *
FROM OPENQUERY(SUPABASE, '
    SELECT ps_customer_id, product_id, uom, dfi_price
    FROM public.customer_pricing_sync
    ORDER BY ps_customer_id, product_id
    LIMIT 10
');

-- Should match!
```

### Step 8.4: Test Job Execution

```sql
-- Start job manually
EXEC msdb.dbo.sp_start_job @job_name = N'Nightly Pricing Sync to Supabase';

-- Wait 1-2 minutes, then check status
SELECT
    name,
    CASE current_execution_status
        WHEN 1 THEN 'Executing'
        WHEN 2 THEN 'Waiting For Thread'
        WHEN 3 THEN 'Between Retries'
        WHEN 4 THEN 'Idle'
        WHEN 5 THEN 'Suspended'
        WHEN 7 THEN 'Performing Completion Actions'
    END AS status
FROM msdb.dbo.sysjobs_view
WHERE name = 'Nightly Pricing Sync to Supabase';
```

### Step 8.5: Test Error Handling

```sql
-- Temporarily break the stored procedure to test error handling
-- (e.g., query non-existent table)

-- Then run job and verify:
-- 1. Error is logged to pricing_sync_log
-- 2. Email notification is sent
-- 3. Job history shows failure

-- REMEMBER TO FIX THE STORED PROCEDURE AFTER TESTING!
```

### Step 8.6: Monitor First Week

Run these queries daily for the first week:

```sql
-- Daily check: Sync status
SELECT
    sync_started_at,
    status,
    records_processed,
    records_failed,
    error_message
FROM OPENQUERY(SUPABASE, '
    SELECT * FROM public.pricing_sync_log
    WHERE sync_started_at > NOW() - INTERVAL ''7 days''
    ORDER BY sync_started_at DESC
');

-- Daily check: Data freshness
SELECT MAX(updated_at) AS last_update
FROM OPENQUERY(SUPABASE, 'SELECT updated_at FROM public.customer_pricing_sync');
```

---

## Troubleshooting

### Issue: Linked Server Connection Fails

**Error:** "Cannot initialize the data source object of OLE DB provider"

**Solutions:**
1. Verify ODBC DSN exists and works (test in ODBC Administrator)
2. Check SQL Server can access the DSN (System DSN, not User DSN)
3. Verify credentials are correct
4. Check firewall allows outbound on port 5432
5. Ensure SSL Mode is set to `require` in ODBC DSN

```sql
-- Test ODBC connection
EXEC sp_testlinkedserver 'SUPABASE';
```

### Issue: SSL Connection Error

**Error:** "SSL connection has been requested but SSL support is not available"

**Solutions:**
1. Install/reinstall PostgreSQL ODBC driver
2. Ensure using the **Unicode** version of the driver
3. Set SSL Mode to `require` in ODBC DSN settings
4. Try `sslmode=require` in connection string

### Issue: Timeout Errors

**Error:** "Timeout expired" or "Query timeout"

**Solutions:**
1. Increase query timeout in linked server:
```sql
EXEC sp_serveroption 'SUPABASE', 'query timeout', '600';  -- 10 minutes
```

2. Add index to Supabase table on `ps_customer_id`:
```sql
-- Run in Supabase SQL Editor
CREATE INDEX IF NOT EXISTS idx_customer_pricing_sync_customer
ON public.customer_pricing_sync(ps_customer_id);
```

3. Process in smaller batches (modify stored procedure)

### Issue: Permission Denied

**Error:** "Permission denied for table"

**Solutions:**
1. Verify Supabase credentials are correct
2. Check RLS policies on Supabase tables allow INSERT/DELETE
3. Use service role key instead of anon key (if you have it)

### Issue: Products Table Join Returns No Data

**Problem:** Description field is NULL for all records

**Solutions:**
1. Verify products table name is correct
2. Check join condition matches on correct column
3. Verify products table has data:
```sql
SELECT COUNT(*) FROM insite.psProducts;  -- Should return > 0
```
4. Check product IDs match between tables:
```sql
SELECT DISTINCT cp.PRODUCT_ID
FROM insite.psCustomerProdPrice cp
WHERE NOT EXISTS (
    SELECT 1 FROM insite.psProducts p
    WHERE p.PRODUCT_ID = cp.PRODUCT_ID
);
-- Should return 0 rows (all products exist)
```

### Issue: Job Runs But Doesn't Execute

**Problem:** Job shows success but stored procedure doesn't run

**Solutions:**
1. Check job step is set to correct database (`FS92STG`)
2. Verify SQL Server Agent has permissions:
```sql
-- Grant execute permission to SQL Agent service account
GRANT EXECUTE ON dbo.sp_SyncPricingToSupabase TO [SQLAgentOperatorRole];
```

3. Check job owner has necessary permissions:
```sql
-- Change job owner to sysadmin
EXEC msdb.dbo.sp_update_job
    @job_name = N'Nightly Pricing Sync to Supabase',
    @owner_login_name = N'sa';
```

### Issue: Email Notifications Not Sending

**Problem:** No emails received after job runs

**Solutions:**
1. Test Database Mail:
```sql
EXEC msdb.dbo.sp_send_dbmail
    @profile_name = 'Default SQL Mail Profile',
    @recipients = 'your-email@yourdomain.com',
    @subject = 'Test',
    @body = 'Test message';

-- Check mail queue
SELECT * FROM msdb.dbo.sysmail_mailitems ORDER BY send_request_date DESC;

-- Check for errors
SELECT * FROM msdb.dbo.sysmail_event_log ORDER BY log_date DESC;
```

2. Verify SMTP settings are correct
3. Check firewall allows outbound on SMTP port (25, 587, or 465)
4. Verify operator email address is correct

---

## Performance Optimization

### For Large Data Volumes (>100K records)

If you have significantly more records, consider these optimizations:

#### Option 1: Batch Processing

```sql
-- Modify stored procedure to process in batches
DECLARE @BatchSize INT = 5000;
DECLARE @Offset INT = 0;

WHILE @Offset < @RecordsProcessed
BEGIN
    INSERT INTO OPENQUERY(SUPABASE, 'SELECT * FROM public.customer_pricing_sync')
    SELECT * FROM #PricingData
    ORDER BY ps_customer_id, product_id
    OFFSET @Offset ROWS
    FETCH NEXT @BatchSize ROWS ONLY;

    SET @Offset = @Offset + @BatchSize;
    PRINT 'Processed batch: ' + CAST(@Offset AS VARCHAR) + ' records';
END
```

#### Option 2: Upsert Instead of Delete + Insert

```sql
-- Use PostgreSQL UPSERT (faster for incremental updates)
-- Requires modifying the approach to send individual statements
-- More complex but better for large datasets with few changes
```

#### Option 3: Parallel Processing

```sql
-- Split by customer and process in parallel
-- Use multiple SQL Server Agent jobs
-- Each job handles a subset of customers
```

---

## Cutover to Production Table

After 7 days of successful syncs, switch from `customer_pricing_sync` (testing) to `customer_product_pricing` (production).

### Step 1: Verify 7 Days of Success

```sql
-- Check last 7 sync runs
SELECT
    sync_started_at,
    status,
    records_processed,
    records_failed
FROM OPENQUERY(SUPABASE, '
    SELECT * FROM public.pricing_sync_log
    WHERE sync_started_at > NOW() - INTERVAL ''7 days''
    ORDER BY sync_started_at DESC
');

-- All should show status = 'success' and records_failed = 0
```

### Step 2: Modify Stored Procedure for Production Table

```sql
-- Update the stored procedure to use customer_product_pricing instead
-- Find and replace all instances of:
-- 'customer_pricing_sync' → 'customer_product_pricing'

-- Or simply run migration 052 in Supabase to rename the table
-- Then no code changes needed!
```

### Step 3: Test Once More

```sql
-- Test sync with production table
EXEC dbo.sp_SyncPricingToSupabase;

-- Verify application still works
```

---

## Summary Checklist

Before going live, ensure:

- [ ] PostgreSQL ODBC driver installed
- [ ] ODBC DSN created and tested
- [ ] Linked server created and tested
- [ ] Can query Supabase tables from SQL Server
- [ ] Products table identified and join working
- [ ] Stored procedure created and tested
- [ ] Stored procedure returns success output
- [ ] Data appears in Supabase correctly
- [ ] Spot checks confirm pricing accuracy
- [ ] SQL Server Agent job created
- [ ] Job schedule set correctly (3 AM daily)
- [ ] Job runs manually successfully
- [ ] Database Mail configured
- [ ] Email notifications working
- [ ] Job history shows success
- [ ] First week monitoring plan in place

---

## Additional Resources

### Query Examples

```sql
-- View all linked servers
SELECT * FROM sys.servers WHERE is_linked = 1;

-- View linked server logins
SELECT * FROM sys.linked_logins WHERE server_id = (
    SELECT server_id FROM sys.servers WHERE name = 'SUPABASE'
);

-- View all SQL Agent jobs
SELECT * FROM msdb.dbo.sysjobs WHERE enabled = 1;

-- View all job schedules
SELECT
    j.name,
    s.name AS schedule_name,
    s.enabled,
    s.freq_type,
    s.active_start_time
FROM msdb.dbo.sysjobs j
INNER JOIN msdb.dbo.sysjobschedules js ON j.job_id = js.job_id
INNER JOIN msdb.dbo.sysschedules s ON js.schedule_id = s.schedule_id;

-- View recent job executions
SELECT TOP 20
    j.name,
    h.step_name,
    CONVERT(VARCHAR, CAST(CAST(h.run_date AS VARCHAR) + ' ' +
        STUFF(STUFF(RIGHT('000000' + CAST(h.run_time AS VARCHAR), 6), 5, 0, ':'), 3, 0, ':') AS DATETIME), 120) AS run_datetime,
    CASE h.run_status
        WHEN 0 THEN 'Failed'
        WHEN 1 THEN 'Succeeded'
        WHEN 2 THEN 'Retry'
        WHEN 3 THEN 'Canceled'
    END AS status,
    h.message
FROM msdb.dbo.sysjobs j
INNER JOIN msdb.dbo.sysjobhistory h ON j.job_id = h.job_id
ORDER BY h.instance_id DESC;
```

### Useful SSMS Shortcuts

- **Execute query:** F5 or Ctrl+E
- **New query:** Ctrl+N
- **Refresh Object Explorer:** F5
- **Results to grid:** Ctrl+D
- **Results to text:** Ctrl+T

---

## Support

If you encounter issues not covered in this guide:

1. **Check SQL Server Error Log:**
   - SSMS → Management → SQL Server Logs → Current

2. **Check SQL Agent Error Log:**
   - SSMS → SQL Server Agent → Error Logs → Current

3. **Check Supabase Logs:**
   - Supabase Dashboard → Logs

4. **Test connectivity:**
   ```bash
   # From SQL Server machine
   telnet aws-0-us-west-1.pooler.supabase.com 5432
   ```

5. **Review this guide's Troubleshooting section**

6. **Contact your DBA or SQL Server administrators**

---

**Implementation Date:** February 9, 2026
**Status:** Ready for implementation
**Estimated Setup Time:** 2-4 hours
**Next Review:** After 7 days of successful syncs

Good luck with the implementation! 🚀
