const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'order-portal-web', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!supabaseUrl) {
  console.error('Missing Supabase URL in .env.local')
  process.exit(1)
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1]

async function runMigration() {
  console.log('Running migration: 049_create_units_of_measure.sql')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '049_create_units_of_measure.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('To run this migration, copy the SQL below and run it in your Supabase SQL Editor:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log(migrationSQL)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`\nOr visit: ${supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql')}`)
    console.log('\nThis will create:')
    console.log('  ✓ units_of_measure table with UOM code and description')
    console.log('  ✓ 10 pre-populated common UOM codes (EA, CS, BX, etc.)')
    console.log('  ✓ Indexed for fast lookups by code')

    // Attempt to run it directly using pg (requires database password)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Attempting direct execution...')

    // Use service role key as password (this may work for some Supabase setups)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const connectionString = `postgresql://postgres.${projectRef}:${serviceRoleKey}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`

    const client = new Client({ connectionString })

    try {
      await client.connect()
      console.log('✓ Connected to database')

      await client.query(migrationSQL)
      console.log('✓ Migration executed successfully!')

      await client.end()

      console.log('\n✅ Table created: units_of_measure')
      console.log('   Fields: uom_code, uom_description, created_at, updated_at')
      console.log('   Pre-populated with 10 common UOM codes\n')

    } catch (dbError) {
      await client.end().catch(() => {})
      console.log('✗ Direct execution failed:', dbError.message)
      console.log('\n⚠️  Please run the SQL manually in the Supabase SQL Editor (link above)')
    }

  } catch (error) {
    console.error('Error reading migration file:', error.message)
    process.exit(1)
  }
}

runMigration()
