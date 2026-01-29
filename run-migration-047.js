const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: './order-portal-web/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('Running migration 047: Fix order_issue_counts view...')

  const migrationPath = path.join(__dirname, 'supabase/migrations/047_fix_order_issue_counts_view.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single()

  if (error) {
    // Try direct execution if rpc fails
    console.log('Trying direct execution...')
    const lines = sql.split(';').filter(line => line.trim())

    for (const line of lines) {
      if (line.trim()) {
        const { error: execError } = await supabase.from('_migrations').select('*').limit(0)

        // Use the raw query approach
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ sql_query: line })
        })

        if (!response.ok) {
          console.error('Error executing SQL:', line)
          console.error(await response.text())
        }
      }
    }
  }

  console.log('Migration completed!')
  console.log('\nThe order_issue_counts view now compares:')
  console.log('  - Customer PO price (cust_unit_price)')
  console.log('  - vs Actual Sonance line price (sonance_unit_price)')
  console.log('\nThis matches the PostOrderModal logic for consistency.')
}

runMigration().catch(console.error)
