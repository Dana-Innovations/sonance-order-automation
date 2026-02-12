/**
 * SQL Server Connection Test
 *
 * Tests connectivity to SQL Server through Cisco firewall
 * Verifies credentials and database access
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'order-portal-web', '.env.local') });

// SQL Server configuration
const config = {
  server: process.env.SQL_SERVER_HOST,
  port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
  database: process.env.SQL_SERVER_DATABASE || 'FS92STG',
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

async function testConnection() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  SQL Server Connection Test');
  console.log('═══════════════════════════════════════════════════\n');

  // Validate configuration
  console.log('📋 Configuration Check:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const missing = [];

  console.log(`   Server: ${config.server || '❌ MISSING'}`);
  if (!config.server) missing.push('SQL_SERVER_HOST');

  console.log(`   Port: ${config.port}`);

  console.log(`   Database: ${config.database}`);

  console.log(`   User: ${config.user || '❌ MISSING'}`);
  if (!config.user) missing.push('SQL_SERVER_USER');

  console.log(`   Password: ${config.password ? '✓ Set (' + config.password.length + ' chars)' : '❌ MISSING'}`);
  if (!config.password) missing.push('SQL_SERVER_PASSWORD');

  console.log(`   Encrypt: ${config.options.encrypt}`);
  console.log(`   Trust Cert: ${config.options.trustServerCertificate}\n`);

  if (missing.length > 0) {
    console.error('❌ Missing required configuration:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nAdd these to order-portal-web/.env.local\n');
    process.exit(1);
  }

  console.log('✅ Configuration complete\n');

  // Test connection
  console.log('🔌 Connection Test:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let pool;

  try {
    console.log(`⏳ Connecting to ${config.server}:${config.port}...`);
    const startTime = Date.now();

    pool = await sql.connect(config);

    const duration = Date.now() - startTime;
    console.log(`✅ Connected successfully in ${duration}ms\n`);

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nPossible issues:');
    console.error('  1. Server hostname/IP incorrect');
    console.error('  2. Firewall blocking connection');
    console.error('  3. VPN not connected');
    console.error('  4. Invalid credentials');
    console.error('  5. Database server not running\n');

    console.error('Detailed error:');
    console.error(error);
    process.exit(1);
  }

  // Test database access
  console.log('🗄️  Database Access Test:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log('⏳ Testing database access...');
    const result = await pool.request().query('SELECT DB_NAME() as current_db, @@VERSION as version');

    console.log(`✅ Database: ${result.recordset[0].current_db}`);
    console.log(`✅ SQL Server Version: ${result.recordset[0].version.split('\n')[0]}\n`);

  } catch (error) {
    console.error('❌ Database access failed:', error.message);
    await pool.close();
    process.exit(1);
  }

  // Test pricing table access
  console.log('📊 Pricing Table Test:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log('⏳ Checking insite.psCustomerProdPrice table...');

    // Check if table exists
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as exists
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'insite'
        AND TABLE_NAME = 'psCustomerProdPrice'
    `);

    if (tableCheck.recordset[0].exists === 0) {
      console.error('❌ Table insite.psCustomerProdPrice not found');
      await pool.close();
      process.exit(1);
    }

    console.log('✅ Table exists');

    // Count total records
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total_records
      FROM insite.psCustomerProdPrice
    `);

    console.log(`✅ Total pricing records: ${countResult.recordset[0].total_records.toLocaleString()}`);

    // Get sample data
    const sampleResult = await pool.request().query(`
      SELECT TOP 3
        CUST_ID,
        PRODUCT_ID,
        UNIT_OF_MEASURE,
        LIST_PRICE,
        NET_PRICE,
        DFI
      FROM insite.psCustomerProdPrice
      ORDER BY CUST_ID
    `);

    console.log('\n📝 Sample pricing records:');
    sampleResult.recordset.forEach((row, i) => {
      console.log(`\n   Record ${i + 1}:`);
      console.log(`   - Customer: ${row.CUST_ID}`);
      console.log(`   - Product: ${row.PRODUCT_ID}`);
      console.log(`   - UOM: ${row.UNIT_OF_MEASURE}`);
      console.log(`   - List Price: $${row.LIST_PRICE}`);
      console.log(`   - Net Price: $${row.NET_PRICE}`);
      console.log(`   - Discount: ${row.DFI}`);
    });

    console.log('\n✅ Pricing table accessible\n');

  } catch (error) {
    console.error('❌ Pricing table access failed:', error.message);
    console.error('\nPossible issues:');
    console.error('  1. User lacks SELECT permission');
    console.error('  2. Table name incorrect');
    console.error('  3. Schema name incorrect\n');
    await pool.close();
    process.exit(1);
  }

  // Test products table access
  console.log('📦 Products Table Test:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log('⏳ Searching for products table...');

    // Search for products table in common schemas
    const productsSearch = await pool.request().query(`
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME LIKE '%product%'
        OR TABLE_NAME LIKE '%prod%'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    if (productsSearch.recordset.length === 0) {
      console.warn('⚠️  No products table found');
      console.log('   Will need to populate description from another source\n');
    } else {
      console.log('✅ Found potential products tables:\n');
      productsSearch.recordset.forEach(table => {
        console.log(`   - ${table.TABLE_SCHEMA}.${table.TABLE_NAME}`);
      });

      // Try to get columns from first match
      const firstTable = productsSearch.recordset[0];
      console.log(`\n📋 Columns in ${firstTable.TABLE_SCHEMA}.${firstTable.TABLE_NAME}:\n`);

      const columnsResult = await pool.request().query(`
        SELECT
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '${firstTable.TABLE_SCHEMA}'
          AND TABLE_NAME = '${firstTable.TABLE_NAME}'
        ORDER BY ORDINAL_POSITION
      `);

      columnsResult.recordset.forEach(col => {
        const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
        console.log(`   - ${col.COLUMN_NAME} ${col.DATA_TYPE}${length}`);
      });

      // Get sample data
      console.log(`\n📝 Sample data from ${firstTable.TABLE_SCHEMA}.${firstTable.TABLE_NAME}:\n`);

      const sampleData = await pool.request().query(`
        SELECT TOP 3 *
        FROM ${firstTable.TABLE_SCHEMA}.${firstTable.TABLE_NAME}
      `);

      if (sampleData.recordset.length > 0) {
        console.log('   First record:');
        const record = sampleData.recordset[0];
        Object.keys(record).forEach(key => {
          const value = record[key];
          const displayValue = value === null ? 'NULL' :
                              typeof value === 'string' ? `"${value}"` :
                              value;
          console.log(`   - ${key}: ${displayValue}`);
        });
      }

      console.log('\n✅ Products table accessible\n');
    }

  } catch (error) {
    console.warn('⚠️  Could not access products table:', error.message);
    console.log('   This is OK - we can populate description later\n');
  }

  // Close connection
  await pool.close();
  console.log('🔌 Connection closed\n');

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('  ✅ Connection Test PASSED');
  console.log('═══════════════════════════════════════════════════\n');
  console.log('Next steps:');
  console.log('1. Review the products table schema above');
  console.log('2. Identify which table has product descriptions');
  console.log('3. Update sync script with JOIN query');
  console.log('4. Run manual sync test: node run-pricing-sync.js\n');

  process.exit(0);
}

// Run test
testConnection().catch(error => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});
