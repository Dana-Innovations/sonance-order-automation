// Script to apply child accounts migrations
// Run with: node run-child-accounts-migrations.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Child Accounts Migration');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Read migration files
  const migration043 = fs.readFileSync(
    path.join(__dirname, 'supabase/migrations/043_create_customer_child_accounts.sql'),
    'utf8'
  );

  const migration044 = fs.readFileSync(
    path.join(__dirname, 'supabase/migrations/044_modify_orders_customer_reference.sql'),
    'utf8'
  );

  console.log('📄 Migration files loaded:\n');
  console.log('   ✓ 043_create_customer_child_accounts.sql');
  console.log('   ✓ 044_modify_orders_customer_reference.sql\n');

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('⚠️  IMPORTANT: These migrations need to be run via Supabase SQL Editor\n');
  console.log('Please follow these steps:\n');
  console.log('1. Go to your Supabase Dashboard → SQL Editor');
  console.log('2. Copy and paste the contents of these files in order:');
  console.log('   a. supabase/migrations/043_create_customer_child_accounts.sql');
  console.log('   b. supabase/migrations/044_modify_orders_customer_reference.sql');
  console.log('3. Run each migration');
  console.log('4. Come back here for next steps\n');

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('After migrations, check for orphaned orders:\n');

  // Find orders without matching customers
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_number, ps_customer_id')
    .in('order_number', ['135353', '135358']);

  if (ordersError) {
    console.error('❌ Error fetching orders:', ordersError.message);
    return;
  }

  if (orders && orders.length > 0) {
    console.log('Orders that need child accounts:');
    console.log('─────────────────────────────────────────────────────────');

    for (const order of orders) {
      console.log(`\nOrder ${order.order_number}:`);
      console.log(`  ps_customer_id: ${order.ps_customer_id}`);

      // Check if customer exists
      const { data: customer } = await supabase
        .from('customers')
        .select('ps_customer_id, customer_name')
        .eq('ps_customer_id', order.ps_customer_id)
        .single();

      if (customer) {
        console.log(`  ✓ Customer found: ${customer.customer_name}`);
      } else {
        console.log(`  ❌ No customer found - needs child account setup`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('Next Steps After Running Migrations:\n');
  console.log('1. Find the MULTI parent customer these orders belong to');
  console.log('2. Add child accounts to customer_child_accounts table:');
  console.log('\n   Example SQL:');
  console.log('   INSERT INTO customer_child_accounts');
  console.log('     (parent_ps_customer_id, child_ps_account_id, routing_description)');
  console.log('   VALUES');
  console.log("     ('MULTI', 'CHILD_ACCT_ID_FROM_ORDER', 'Description of this account');\n");
  console.log('3. Orders will then be able to reference the child account IDs\n');
}

main().catch(console.error);
