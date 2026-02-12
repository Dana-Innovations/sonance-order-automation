const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n')

  try {
    // Try to query the line_status column
    const { data, error } = await supabase
      .from('order_lines')
      .select('id, cust_line_number, line_status')
      .limit(5)

    if (error) {
      if (error.message.includes('column "line_status" does not exist')) {
        console.log('❌ Migration NOT completed - line_status column does not exist')
        console.log('\nPlease run the SQL migration in your Supabase dashboard.')
        return false
      }
      throw error
    }

    console.log('✅ Migration successful! line_status column exists\n')

    if (data && data.length > 0) {
      console.log('Sample data from order_lines:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      data.forEach(line => {
        console.log(`Line ${line.cust_line_number}: status = "${line.line_status || 'active'}"`)
      })
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    } else {
      console.log('No order lines found in database')
    }

    // Count lines by status
    const { data: statusCounts, error: countError } = await supabase
      .from('order_lines')
      .select('line_status', { count: 'exact' })

    if (!countError && statusCounts) {
      console.log(`\n📊 Total order lines: ${statusCounts.length}`)
      const active = statusCounts.filter(l => l.line_status === 'active' || l.line_status === null).length
      const cancelled = statusCounts.filter(l => l.line_status === 'cancelled').length
      console.log(`   Active: ${active}`)
      console.log(`   Cancelled: ${cancelled}`)
    }

    console.log('\n✅ Line cancellation feature is ready to use!')
    return true

  } catch (error) {
    console.error('❌ Error verifying migration:', error.message)
    return false
  }
}

verifyMigration().then(success => {
  process.exit(success ? 0 : 1)
})
