// Script to set up child accounts for multi-account customer
// Run with: node setup-child-accounts.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  console.log('📊 Running migrations...\n');

  // Read and execute migration 043
  const fs = require('fs');
  const path = require('path');

  try {
    const migration043 = fs.readFileSync(
      path.join(__dirname, 'supabase/migrations/043_create_customer_child_accounts.sql'),
      'utf8'
    );

    console.log('Running migration 043: Create customer_child_accounts table...');
    const { error: error043 } = await supabase.rpc('exec_sql', { sql: migration043 });
    if (error043) {
      console.error('❌ Error in migration 043:', error043);
    } else {
      console.log('✅ Migration 043 completed\n');
    }

    const migration044 = fs.readFileSync(
      path.join(__dirname, 'supabase/migrations/044_modify_orders_customer_reference.sql'),
      'utf8'
    );

    console.log('Running migration 044: Modify orders customer reference...');
    const { error: error044 } = await supabase.rpc('exec_sql', { sql: migration044 });
    if (error044) {
      console.error('❌ Error in migration 044:', error044);
    } else {
      console.log('✅ Migration 044 completed\n');
    }
  } catch (err) {
    console.error('❌ Error reading migration files:', err.message);
    console.log('\n⚠️  You may need to run these migrations manually via Supabase dashboard SQL editor\n');
  }
}

async function findOrphanedOrders() {
  console.log('🔍 Checking for orders with missing customer references...\n');

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, ps_customer_id')
    .limit(1000);

  if (error) {
    console.error('❌ Error fetching orders:', error);
    return [];
  }

  const orphaned = [];

  for (const order of orders) {
    const { data: customer } = await supabase
      .from('customers')
      .select('ps_customer_id')
      .eq('ps_customer_id', order.ps_customer_id)
      .single();

    if (!customer) {
      orphaned.push(order);
    }
  }

  if (orphaned.length > 0) {
    console.log(`⚠️  Found ${orphaned.length} orders with missing customer references:\n`);
    orphaned.slice(0, 10).forEach(order => {
      console.log(`   Order ${order.order_number}: ps_customer_id = "${order.ps_customer_id}"`);
    });
    if (orphaned.length > 10) {
      console.log(`   ... and ${orphaned.length - 10} more`);
    }
    console.log();
  } else {
    console.log('✅ No orphaned orders found\n');
  }

  return orphaned;
}

async function suggestChildAccounts(orphanedOrders) {
  if (orphanedOrders.length === 0) return;

  console.log('💡 Suggested child accounts to create:\n');

  // Group by ps_customer_id
  const accounts = {};
  orphanedOrders.forEach(order => {
    if (!accounts[order.ps_customer_id]) {
      accounts[order.ps_customer_id] = 0;
    }
    accounts[order.ps_customer_id]++;
  });

  console.log('Child PS Account ID | Order Count | Action Needed');
  console.log('--------------------+-------------+----------------------------------');

  Object.entries(accounts).forEach(([accountId, count]) => {
    console.log(`${accountId.padEnd(19)} | ${count.toString().padStart(11)} | Add to customer_child_accounts`);
  });

  console.log('\n📝 To add these child accounts, you can:');
  console.log('   1. Use the Customer Settings wizard UI (recommended)');
  console.log('   2. Manually insert into customer_child_accounts table');
  console.log('\n   Example SQL:');
  console.log('   INSERT INTO customer_child_accounts (parent_ps_customer_id, child_ps_account_id, routing_description)');
  console.log(`   VALUES ('MULTI', '${Object.keys(accounts)[0]}', 'Description of when to use this account');`);
}

async function listMultiCustomers() {
  console.log('🏢 Multi-account customers in your database:\n');

  const { data: customers, error } = await supabase
    .from('customers')
    .select('ps_customer_id, customer_name')
    .eq('ps_customer_id', 'MULTI');

  if (error) {
    console.error('❌ Error fetching customers:', error);
    return;
  }

  if (customers.length === 0) {
    console.log('⚠️  No MULTI customers found. You may need to set up a customer with ps_customer_id = "MULTI" first.\n');
  } else {
    customers.forEach(customer => {
      console.log(`   ${customer.customer_name} (${customer.ps_customer_id})`);
    });
    console.log();
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Child Account Setup for Multi-Account Customers');
  console.log('═══════════════════════════════════════════════════════════\n');

  await listMultiCustomers();
  await runMigrations();
  const orphaned = await findOrphanedOrders();
  await suggestChildAccounts(orphaned);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Setup Complete!');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Next steps:');
  console.log('1. Add child accounts via Customer Settings page');
  console.log('2. Or insert manually into customer_child_accounts table');
  console.log('3. Orders will automatically use child accounts once added\n');
}

main().catch(console.error);
