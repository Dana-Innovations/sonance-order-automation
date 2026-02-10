/**
 * Verify Pricing Sync Database Setup
 *
 * Validates that all required database objects exist and are configured correctly.
 */

const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'order-portal-web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-1-us-west-1.pooler.supabase.com:5432/postgres`;

async function verify() {
  console.log('🔍 Verifying Pricing Sync Database Setup\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase\n');

    // Check tables exist
    console.log('📋 Checking tables...');
    const tablesResult = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('customer_pricing_sync', 'pricing_sync_log', 'customer_product_pricing')
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`   Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   ✓ ${t}`));

    if (!tables.includes('customer_pricing_sync')) {
      console.error('\n❌ customer_pricing_sync table missing! Run: node apply-migration.js 050');
      process.exit(1);
    }

    if (!tables.includes('pricing_sync_log')) {
      console.error('\n❌ pricing_sync_log table missing! Run: node apply-migration.js 051');
      process.exit(1);
    }

    if (!tables.includes('customer_product_pricing')) {
      console.error('\n❌ customer_product_pricing table missing! This is unexpected.');
      process.exit(1);
    }

    console.log('   ✅ All required tables exist\n');

    // Check indexes
    console.log('📊 Checking indexes on customer_pricing_sync...');
    const indexesResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'customer_pricing_sync'
      ORDER BY indexname
    `);

    const indexes = indexesResult.rows.map(r => r.indexname);
    console.log(`   Found ${indexes.length} indexes:`);
    indexes.forEach(i => console.log(`   ✓ ${i}`));

    const requiredIndexes = [
      'idx_customer_pricing_sync_unique',
      'idx_customer_pricing_sync_customer',
      'idx_customer_pricing_sync_product',
      'idx_customer_pricing_sync_brand'
    ];

    const missingIndexes = requiredIndexes.filter(i => !indexes.includes(i));
    if (missingIndexes.length > 0) {
      console.error(`\n❌ Missing indexes: ${missingIndexes.join(', ')}`);
      process.exit(1);
    }

    console.log('   ✅ All required indexes exist\n');

    // Check columns
    console.log('📋 Checking columns on customer_pricing_sync...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'customer_pricing_sync'
      ORDER BY ordinal_position
    `);

    console.log(`   Found ${columnsResult.rows.length} columns:`);
    columnsResult.rows.forEach(c => {
      console.log(`   ✓ ${c.column_name} (${c.data_type}${c.is_nullable === 'NO' ? ', NOT NULL' : ''})`);
    });

    const requiredColumns = [
      'id', 'ps_customer_id', 'customer_name', 'product_id', 'uom',
      'pricing_uom', 'currency_code', 'list_price', 'discount_pct',
      'dfi_price', 'is_default_uom', 'created_at', 'updated_at'
    ];

    const columnNames = columnsResult.rows.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));

    if (missingColumns.length > 0) {
      console.error(`\n❌ Missing columns: ${missingColumns.join(', ')}`);
      process.exit(1);
    }

    console.log('   ✅ All required columns exist\n');

    // Check RLS policies
    console.log('🔒 Checking RLS policies on customer_pricing_sync...');
    const policiesResult = await client.query(`
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'customer_pricing_sync'
      ORDER BY policyname
    `);

    console.log(`   Found ${policiesResult.rows.length} policies:`);
    policiesResult.rows.forEach(p => {
      console.log(`   ✓ ${p.policyname} (${p.cmd})`);
    });

    if (policiesResult.rows.length === 0) {
      console.error('\n❌ No RLS policies found!');
      process.exit(1);
    }

    console.log('   ✅ RLS policies configured\n');

    // Check active customers
    console.log('👥 Checking active customers...');
    const customersResult = await client.query(`
      SELECT COUNT(*) as parent_count
      FROM customers
      WHERE is_active = true AND ps_customer_id IS NOT NULL
    `);

    const childAccountsResult = await client.query(`
      SELECT COUNT(*) as child_count
      FROM customer_child_accounts
      WHERE is_active = true AND child_ps_account_id IS NOT NULL
    `);

    const parentCount = parseInt(customersResult.rows[0].parent_count);
    const childCount = parseInt(childAccountsResult.rows[0].child_count);
    const totalCustomers = parentCount + childCount;

    console.log(`   ✓ ${parentCount} active parent customers`);
    console.log(`   ✓ ${childCount} active child accounts`);
    console.log(`   ✓ ${totalCustomers} total customers for sync`);

    if (totalCustomers === 0) {
      console.warn('\n⚠️  WARNING: No active customers found. Sync will have no data to process.');
    } else {
      console.log('   ✅ Active customers found\n');
    }

    // Check existing pricing data
    console.log('💰 Checking existing pricing data...');
    const oldPricingResult = await client.query(`
      SELECT
        COUNT(*) as total_records,
        COUNT(DISTINCT ps_customer_id) as unique_customers,
        MAX(updated_at) as last_update
      FROM customer_product_pricing
    `);

    const oldPricing = oldPricingResult.rows[0];
    console.log(`   ✓ customer_product_pricing (current table):`);
    console.log(`     - ${oldPricing.total_records} records`);
    console.log(`     - ${oldPricing.unique_customers} customers`);
    console.log(`     - Last update: ${oldPricing.last_update || 'N/A'}`);

    const newPricingResult = await client.query(`
      SELECT
        COUNT(*) as total_records,
        COUNT(DISTINCT ps_customer_id) as unique_customers,
        MAX(updated_at) as last_update
      FROM customer_pricing_sync
    `);

    const newPricing = newPricingResult.rows[0];
    console.log(`   ✓ customer_pricing_sync (testing table):`);
    console.log(`     - ${newPricing.total_records} records`);
    console.log(`     - ${newPricing.unique_customers} customers`);
    console.log(`     - Last update: ${newPricing.last_update || 'Never synced'}`);

    console.log('   ✅ Pricing tables accessible\n');

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Database setup verification PASSED!\n');
    console.log('Next steps:');
    console.log('1. Configure SQL Server credentials in .env.local');
    console.log('2. Install mssql package: npm install mssql');
    console.log('3. Test sync: node run-pricing-sync.js');
    console.log('4. Set up N8N workflow for nightly automation');
    console.log('5. Monitor sync for 7 days before cutover\n');

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

verify();
