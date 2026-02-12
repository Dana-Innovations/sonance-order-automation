const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'order-portal-web', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

// Extract the project reference from the Supabase URL
const projectRef = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1]

if (!projectRef) {
  console.error('Could not extract project reference from Supabase URL')
  process.exit(1)
}

// Construct the direct PostgreSQL connection string
// Note: This uses the pooler connection string format
const connectionString = `postgresql://postgres.${projectRef}:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

console.log('⚠️  Direct PostgreSQL connection requires database password.')
console.log('Please set the DATABASE_URL in your .env.local file with the full connection string.')
console.log('\nYou can find your connection string in Supabase Dashboard:')
console.log('Project Settings > Database > Connection String > URI')
console.log('\nFor now, I\'ll show you the SQL to execute manually:\n')

// Read and display the migration SQL
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '038_create_order_issue_counts_view.sql')
const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(migrationSQL)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('\nPlease execute this SQL in your Supabase SQL Editor:')
console.log(supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'))

// If DATABASE_URL is provided, try to execute
if (process.env.DATABASE_URL) {
  console.log('\n✓ Found DATABASE_URL, attempting to execute migration...\n')

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  async function executeMigration() {
    try {
      await client.connect()
      console.log('✓ Connected to database')

      await client.query(migrationSQL)
      console.log('✓ Migration executed successfully!')
      console.log('✓ Created view: order_issue_counts')

    } catch (error) {
      console.error('✗ Error executing migration:', error.message)
    } finally {
      await client.end()
    }
  }

  executeMigration()
}
