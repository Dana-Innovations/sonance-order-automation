const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkMigration() {
  console.log('Checking if migration 047 has been applied...\n')

  // Query the view definition from PostgreSQL system catalog
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql_query: `
        SELECT pg_get_viewdef('order_issue_counts', true) as view_definition;
      `
    })

  if (error) {
    console.log('Trying alternative method...\n')

    // Alternative: Check if the view exists and query a test order
    const { data: viewExists, error: viewError } = await supabase
      .from('order_issue_counts')
      .select('*')
      .limit(1)

    if (viewError) {
      console.log('❌ View does not exist or there was an error:', viewError.message)
      console.log('\nMigration 047 has NOT been applied.')
      return
    }

    console.log('✅ View exists and is queryable')
    console.log('\nTo verify the migration was applied, check if the view definition includes:')
    console.log('  - Comparison of ol.cust_unit_price vs ol.sonance_unit_price')
    console.log('  - NOT using cpp.dfi_price in the price_issues_count calculation')
    console.log('\nRun this in Supabase SQL Editor to see the definition:')
    console.log("  SELECT pg_get_viewdef('order_issue_counts', true);")
    return
  }

  if (data && data[0] && data[0].view_definition) {
    const viewDef = data[0].view_definition

    console.log('View Definition:')
    console.log('─'.repeat(80))
    console.log(viewDef)
    console.log('─'.repeat(80))

    // Check if the new logic is present
    const hasNewLogic = viewDef.includes('ol.sonance_unit_price') &&
                        viewDef.includes('ol.cust_unit_price') &&
                        !viewDef.includes('cpp.dfi_price')

    if (hasNewLogic) {
      console.log('\n✅ Migration 047 HAS BEEN APPLIED')
      console.log('   The view now compares ol.cust_unit_price vs ol.sonance_unit_price')
    } else {
      console.log('\n❌ Migration 047 has NOT been applied')
      console.log('   The view still uses the old pricing table comparison logic')
    }
  }
}

checkMigration().catch(console.error)
