const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
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

async function runMigration() {
  console.log('Running migration: 038_create_order_issue_counts_view.sql')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '038_create_order_issue_counts_view.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('\nTo run this migration, please execute the following SQL in your Supabase SQL Editor:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(migrationSQL)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\nOr visit: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'))
    console.log('\nThis will create a database view that efficiently calculates issue counts for orders.')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

runMigration()
