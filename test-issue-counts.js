const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'order-portal-web', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testIssueCounts() {
  console.log('Testing order_issue_counts view...\n')

  try {
    // Test 1: Query the view to see if it exists
    console.log('Test 1: Checking if view exists and returns data...')
    const { data: viewData, error: viewError } = await supabase
      .from('order_issue_counts')
      .select('*')
      .limit(10)

    if (viewError) {
      console.error('❌ Error querying view:', viewError.message)
      console.log('\nThe view may not have been created yet. Please run the migration SQL in Supabase SQL Editor.')
      return
    }

    console.log('✅ View exists and is queryable!')
    console.log(`   Found ${viewData?.length || 0} orders with issue counts\n`)

    // Test 2: Show sample results
    if (viewData && viewData.length > 0) {
      console.log('Test 2: Sample issue counts from the view:')
      console.log('─────────────────────────────────────────────────────────────')
      console.log('Order ID                              | Invalid | Price Issues')
      console.log('─────────────────────────────────────────────────────────────')

      viewData.slice(0, 5).forEach(row => {
        const orderId = row.order_id.substring(0, 20) + '...'
        const invalid = String(row.invalid_items_count).padStart(7, ' ')
        const price = String(row.price_issues_count).padStart(12, ' ')
        console.log(`${orderId} | ${invalid} | ${price}`)
      })
      console.log('─────────────────────────────────────────────────────────────\n')

      // Test 3: Count orders with issues
      const ordersWithInvalidItems = viewData.filter(r => r.invalid_items_count > 0).length
      const ordersWithPriceIssues = viewData.filter(r => r.price_issues_count > 0).length
      const ordersWithNoIssues = viewData.filter(r => r.invalid_items_count === 0 && r.price_issues_count === 0).length

      console.log('Test 3: Summary statistics (from sample):')
      console.log(`   Orders with invalid items: ${ordersWithInvalidItems}`)
      console.log(`   Orders with price issues:  ${ordersWithPriceIssues}`)
      console.log(`   Orders with no issues:     ${ordersWithNoIssues}`)
      console.log('\n✅ All tests passed!')
      console.log('\nNow check your app at http://localhost:3000 to see the Issues column!')
    } else {
      console.log('ℹ️  No orders found in the view. This could mean:')
      console.log('   - You have no orders in the database yet')
      console.log('   - The view is working but returning empty results')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

testIssueCounts()
