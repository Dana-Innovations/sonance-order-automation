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

async function testMigrationLogic() {
  console.log('Testing migration 047 logic by examining actual data...\n')

  // Get an order with line items that have both prices
  const { data: orderLines, error: linesError } = await supabase
    .from('order_lines')
    .select('id, cust_order_number, cust_unit_price, sonance_unit_price, line_status')
    .not('cust_unit_price', 'is', null)
    .not('sonance_unit_price', 'is', null)
    .eq('line_status', 'active')
    .limit(5)

  if (linesError || !orderLines || orderLines.length === 0) {
    console.log('No suitable order lines found for testing')
    return
  }

  console.log('Found order lines with both prices:')
  orderLines.forEach(line => {
    console.log(`  Line ${line.id}: Cust=$${line.cust_unit_price}, Sonance=$${line.sonance_unit_price}`)
  })

  // Get the order for one of these lines
  const testOrderNumber = orderLines[0].cust_order_number
  console.log(`\nChecking order_issue_counts for order: ${testOrderNumber}\n`)

  const { data: issueCount, error: countError } = await supabase
    .from('order_issue_counts')
    .select('*')
    .eq('cust_order_number', testOrderNumber)
    .single()

  if (countError) {
    console.log('Error querying order_issue_counts:', countError.message)
    return
  }

  console.log('Issue counts from view:')
  console.log('  Invalid items:', issueCount.invalid_items_count)
  console.log('  Price issues:', issueCount.price_issues_count)

  // Now manually calculate what it SHOULD be based on the new logic
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, ps_customer_id')
    .eq('cust_order_number', testOrderNumber)
    .single()

  if (orderError || !order) {
    console.log('Could not find order')
    return
  }

  const { data: allLines, error: allLinesError } = await supabase
    .from('order_lines')
    .select('cust_unit_price, sonance_unit_price, line_status')
    .eq('cust_order_number', testOrderNumber)

  if (allLinesError || !allLines) {
    console.log('Could not get all lines')
    return
  }

  const activeLines = allLines.filter(l => l.line_status === 'active')
  let expectedPriceIssues = 0

  activeLines.forEach(line => {
    if (line.cust_unit_price && line.sonance_unit_price) {
      const variance = Math.abs(line.cust_unit_price - line.sonance_unit_price) / line.cust_unit_price * 100
      if (variance > 0.01) {
        expectedPriceIssues++
        console.log(`    Line has price variance: Cust=$${line.cust_unit_price}, Sonance=$${line.sonance_unit_price}, Variance=${variance.toFixed(2)}%`)
      }
    }
  })

  console.log(`\nExpected price issues (new logic): ${expectedPriceIssues}`)
  console.log(`Actual from view: ${issueCount.price_issues_count}`)

  if (expectedPriceIssues === issueCount.price_issues_count) {
    console.log('\n✅ Migration 047 HAS BEEN APPLIED')
    console.log('   The view is using the new logic (comparing line prices directly)')
  } else {
    console.log('\n❌ Migration 047 has NOT been applied')
    console.log('   The view is still using the old logic (comparing to pricing table)')
  }
}

testMigrationLogic().catch(console.error)
