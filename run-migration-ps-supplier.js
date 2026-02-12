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
  console.log('Running migration: 031_add_ps_supplier_id_to_order_lines.sql')

  try {
    // Check if column already exists
    const { data: columns, error } = await supabase
      .from('order_lines')
      .select('ps_supplier_id')
      .limit(1)

    if (error && error.message.includes('column "ps_supplier_id" does not exist')) {
      // Column doesn't exist, need to add it
      console.log('Adding ps_supplier_id column to order_lines table...')

      // Read the migration file
      const migrationSQL = fs.readFileSync(
        path.join(__dirname, 'supabase', 'migrations', '031_add_ps_supplier_id_to_order_lines.sql'),
        'utf8'
      )

      console.log('\nPlease run this SQL in your Supabase SQL Editor:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(migrationSQL)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('\nOr visit: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'))
      console.log('\nCopy the SQL above and paste it into the SQL Editor, then click "Run".')
    } else {
      console.log('✓ ps_supplier_id column already exists!')
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

runMigration()
