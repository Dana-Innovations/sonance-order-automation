/**
 * Customer Pricing Sync - SQL Server to Supabase
 *
 * Syncs customer-specific product pricing from PeopleSoft SQL Server
 * to Supabase for use in order automation system.
 *
 * Target table: customer_pricing_sync (testing table)
 * After validation: will cutover to customer_product_pricing
 */

const sql = require('mssql');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'order-portal-web', '.env.local') });

// Configuration
const BATCH_SIZE = parseInt(process.env.SYNC_BATCH_SIZE || '500');
const TIMEOUT_MS = parseInt(process.env.SYNC_TIMEOUT_MS || '300000');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// SQL Server configuration
const sqlConfig = {
  server: process.env.SQL_SERVER_HOST,
  port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
  database: process.env.SQL_SERVER_DATABASE || 'FS92STG',
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectTimeout: 30000,
    requestTimeout: TIMEOUT_MS
  }
};

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const supabaseConnectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-1-us-west-1.pooler.supabase.com:5432/postgres`;

/**
 * Sleep helper for retries
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Connect to SQL Server with retry logic
 */
async function connectSQLServer(retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📡 Connecting to SQL Server (attempt ${attempt}/${retries})...`);
      const pool = await sql.connect(sqlConfig);
      console.log('✅ Connected to SQL Server\n');
      return pool;
    } catch (error) {
      console.error(`❌ SQL Server connection failed (attempt ${attempt}/${retries}):`, error.message);
      if (attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay/1000} seconds...\n`);
        await sleep(delay);
      } else {
        throw new Error(`Failed to connect to SQL Server after ${retries} attempts: ${error.message}`);
      }
    }
  }
}

/**
 * Get list of active customers from Supabase
 */
async function getActiveCustomers(pgClient) {
  console.log('📋 Fetching active customer list from Supabase...');

  try {
    // Get parent customers
    const parentResult = await pgClient.query(
      'SELECT ps_customer_id, customer_name FROM customers WHERE is_active = true AND ps_customer_id IS NOT NULL'
    );

    // Get child accounts
    const childResult = await pgClient.query(
      'SELECT child_ps_account_id, child_account_name FROM customer_child_accounts WHERE is_active = true AND child_ps_account_id IS NOT NULL'
    );

    // Build customer map (ID -> Name)
    const customerMap = new Map();

    parentResult.rows.forEach(row => {
      customerMap.set(row.ps_customer_id, row.customer_name);
    });

    childResult.rows.forEach(row => {
      customerMap.set(row.child_ps_account_id, row.child_account_name);
    });

    console.log(`✅ Found ${customerMap.size} active customers (${parentResult.rows.length} parent + ${childResult.rows.length} child accounts)\n`);

    return customerMap;
  } catch (error) {
    throw new Error(`Failed to fetch customer list: ${error.message}`);
  }
}

/**
 * Query pricing data from SQL Server for active customers
 */
async function queryPricingData(sqlPool, customerIds) {
  console.log('🔍 Querying pricing data from SQL Server...');

  if (customerIds.length === 0) {
    console.warn('⚠️  No customers to query');
    return [];
  }

  try {
    const request = sqlPool.request();

    // Build parameterized query to prevent SQL injection
    const params = customerIds.map((id, index) => {
      request.input(`custId${index}`, sql.VarChar(20), id);
      return `@custId${index}`;
    });

    const query = `
      SELECT
        CUST_ID,
        PRODUCT_ID,
        UNIT_OF_MEASURE,
        QTY,
        LIST_PRICE,
        NET_PRICE,
        DFI,
        SETID,
        PROD_SETID
      FROM insite.psCustomerProdPrice
      WHERE CUST_ID IN (${params.join(',')})
      ORDER BY CUST_ID, PRODUCT_ID
    `;

    console.log(`   Query: ${customerIds.length} customers`);
    const result = await request.query(query);

    console.log(`✅ Retrieved ${result.recordset.length} pricing records\n`);
    return result.recordset;
  } catch (error) {
    throw new Error(`Failed to query pricing data: ${error.message}`);
  }
}

/**
 * Transform SQL Server data to Supabase schema
 */
function transformData(sqlData, customerMap) {
  console.log('🔄 Transforming data to Supabase schema...');

  const transformed = sqlData.map(row => {
    // Parse numeric values safely
    const parseDecimal = (val) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    const qty = parseDecimal(row.QTY);
    const listPrice = parseDecimal(row.LIST_PRICE);
    const netPrice = parseDecimal(row.NET_PRICE);
    const dfi = parseDecimal(row.DFI);

    return {
      ps_customer_id: row.CUST_ID?.trim() || '',
      customer_name: customerMap.get(row.CUST_ID?.trim()) || '',
      product_id: row.PRODUCT_ID?.trim() || '',
      uom: row.UNIT_OF_MEASURE?.trim() || '',
      pricing_uom: row.UNIT_OF_MEASURE?.trim() || '',
      currency_code: 'USD', // Default currency
      list_price: listPrice,
      discount_pct: dfi, // DFI is discount percentage
      dfi_price: netPrice, // NET_PRICE is the actual customer price
      is_default_uom: qty === 1, // TRUE if QTY = 1

      // Fields not available in SQL Server - set to NULL/defaults
      catalog_number: null,
      prod_group_catalog: null,
      description: null,
      brand: null,
      category: null,
      is_kit: false
    };
  });

  console.log(`✅ Transformed ${transformed.length} records\n`);
  return transformed;
}

/**
 * Upsert pricing data to Supabase in batches
 */
async function upsertPricing(pgClient, data) {
  console.log(`💾 Upserting ${data.length} records to Supabase in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const errors = [];

  // Process in batches
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);

    console.log(`   Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);

    for (const record of batch) {
      try {
        // Validate required fields
        if (!record.ps_customer_id || !record.product_id || !record.uom) {
          failed++;
          errors.push({ record, error: 'Missing required fields' });
          continue;
        }

        const result = await pgClient.query(`
          INSERT INTO customer_pricing_sync (
            ps_customer_id, customer_name, product_id, uom, pricing_uom,
            currency_code, list_price, discount_pct, dfi_price,
            is_default_uom, catalog_number, prod_group_catalog,
            description, brand, category, is_kit, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
          ON CONFLICT (ps_customer_id, product_id, uom, currency_code)
          DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            pricing_uom = EXCLUDED.pricing_uom,
            list_price = EXCLUDED.list_price,
            discount_pct = EXCLUDED.discount_pct,
            dfi_price = EXCLUDED.dfi_price,
            is_default_uom = EXCLUDED.is_default_uom,
            catalog_number = EXCLUDED.catalog_number,
            prod_group_catalog = EXCLUDED.prod_group_catalog,
            description = EXCLUDED.description,
            brand = EXCLUDED.brand,
            category = EXCLUDED.category,
            is_kit = EXCLUDED.is_kit,
            updated_at = NOW()
        `, [
          record.ps_customer_id,
          record.customer_name,
          record.product_id,
          record.uom,
          record.pricing_uom,
          record.currency_code,
          record.list_price,
          record.discount_pct,
          record.dfi_price,
          record.is_default_uom,
          record.catalog_number,
          record.prod_group_catalog,
          record.description,
          record.brand,
          record.category,
          record.is_kit
        ]);

        // Check if it was an insert or update
        if (result.rowCount > 0) {
          // We can't easily distinguish insert vs update with ON CONFLICT
          // So we'll just count as processed
          inserted++;
        }
      } catch (error) {
        failed++;
        errors.push({ record, error: error.message });
        console.error(`      ❌ Failed to upsert record: ${record.ps_customer_id} / ${record.product_id}`);
      }
    }
  }

  console.log(`✅ Upsert complete: ${inserted} processed, ${failed} failed\n`);

  return { inserted, updated, failed, errors };
}

/**
 * Log sync results to pricing_sync_log table
 */
async function logSyncResults(pgClient, startTime, endTime, status, stats, errorMessage = null) {
  console.log('📊 Logging sync results...');

  try {
    await pgClient.query(`
      INSERT INTO pricing_sync_log (
        sync_started_at, sync_completed_at, status,
        records_processed, records_inserted, records_updated, records_failed,
        error_message, error_details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      startTime,
      endTime,
      status,
      stats.processed || 0,
      stats.inserted || 0,
      stats.updated || 0,
      stats.failed || 0,
      errorMessage,
      stats.errors ? JSON.stringify(stats.errors.slice(0, 10)) : null // Store first 10 errors
    ]);

    console.log('✅ Sync results logged\n');
  } catch (error) {
    console.error('❌ Failed to log sync results:', error.message);
  }
}

/**
 * Main sync function
 */
async function syncPricing() {
  const startTime = new Date();
  console.log('🚀 Starting Customer Pricing Sync');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`📅 Started at: ${startTime.toISOString()}\n`);

  // Validate configuration
  if (!sqlConfig.server || !sqlConfig.user || !sqlConfig.password) {
    throw new Error('Missing SQL Server credentials. Check .env.local file.');
  }

  if (!supabaseUrl || !dbPassword) {
    throw new Error('Missing Supabase credentials. Check .env.local file.');
  }

  let sqlPool = null;
  let pgClient = null;
  let stats = { processed: 0, inserted: 0, updated: 0, failed: 0, errors: [] };
  let status = 'failed';
  let errorMessage = null;

  try {
    // Connect to SQL Server
    sqlPool = await connectSQLServer();

    // Connect to Supabase
    console.log('📡 Connecting to Supabase...');
    pgClient = new Client({
      connectionString: supabaseConnectionString,
      ssl: { rejectUnauthorized: false }
    });
    await pgClient.connect();
    console.log('✅ Connected to Supabase\n');

    // Get active customers
    const customerMap = await getActiveCustomers(pgClient);
    const customerIds = Array.from(customerMap.keys());

    if (customerIds.length === 0) {
      throw new Error('No active customers found');
    }

    // Query pricing data from SQL Server
    const pricingData = await queryPricingData(sqlPool, customerIds);

    if (pricingData.length === 0) {
      console.warn('⚠️  No pricing data found for active customers');
      status = 'success';
      return {
        success: true,
        status,
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        duration: Date.now() - startTime.getTime()
      };
    }

    // Transform data
    const transformedData = transformData(pricingData, customerMap);
    stats.processed = transformedData.length;

    // Upsert to Supabase
    const upsertResults = await upsertPricing(pgClient, transformedData);
    stats.inserted = upsertResults.inserted;
    stats.updated = upsertResults.updated;
    stats.failed = upsertResults.failed;
    stats.errors = upsertResults.errors;

    // Determine status
    if (stats.failed === 0) {
      status = 'success';
    } else if (stats.failed < stats.processed) {
      status = 'partial';
    } else {
      status = 'failed';
      errorMessage = `All ${stats.failed} records failed`;
    }

    const endTime = new Date();
    const duration = endTime - startTime;

    // Log results
    await logSyncResults(pgClient, startTime, endTime, status, stats, errorMessage);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Sync completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Status: ${status}`);
    console.log(`   - Records processed: ${stats.processed}`);
    console.log(`   - Records inserted/updated: ${stats.inserted}`);
    console.log(`   - Records failed: ${stats.failed}`);
    console.log(`   - Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.log(`📅 Completed at: ${endTime.toISOString()}\n`);

    return {
      success: status === 'success' || status === 'partial',
      status,
      recordsProcessed: stats.processed,
      recordsInserted: stats.inserted,
      recordsUpdated: stats.updated,
      recordsFailed: stats.failed,
      duration,
      errors: stats.errors.slice(0, 5) // Return first 5 errors
    };

  } catch (error) {
    const endTime = new Date();
    errorMessage = error.message;

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Sync failed:', error.message);
    console.error('Stack trace:', error.stack);

    // Try to log error
    if (pgClient) {
      try {
        await logSyncResults(pgClient, startTime, endTime, 'failed', stats, errorMessage);
      } catch (logError) {
        console.error('Failed to log error:', logError.message);
      }
    }

    return {
      success: false,
      status: 'failed',
      error: errorMessage,
      stack: error.stack,
      recordsProcessed: stats.processed,
      recordsFailed: stats.failed,
      duration: Date.now() - startTime.getTime()
    };

  } finally {
    // Clean up connections
    if (sqlPool) {
      try {
        await sqlPool.close();
        console.log('🔌 Closed SQL Server connection');
      } catch (error) {
        console.error('Failed to close SQL Server connection:', error.message);
      }
    }

    if (pgClient) {
      try {
        await pgClient.end();
        console.log('🔌 Closed Supabase connection');
      } catch (error) {
        console.error('Failed to close Supabase connection:', error.message);
      }
    }
  }
}

// Export for use in other scripts
module.exports = { syncPricing };

// Run if called directly
if (require.main === module) {
  syncPricing()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}
