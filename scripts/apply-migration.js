const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const dbPassword = process.env.SUPABASE_DB_PASSWORD

if (!supabaseUrl || !dbPassword) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_DB_PASSWORD')
  process.exit(1)
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1]

async function applyMigration(migrationFile) {
  console.log(`\n🚀 Applying migration: ${path.basename(migrationFile)}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Read the migration file
  const migrationSQL = fs.readFileSync(migrationFile, 'utf8')

  // Build connection string using Session Pooler (IPv4 compatible)
  const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-1-us-west-1.pooler.supabase.com:5432/postgres`

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('📡 Connecting to Supabase database...')
    await client.connect()
    console.log('✅ Connected!\n')

    console.log('⚙️  Executing migration...')
    await client.query(migrationSQL)
    console.log('✅ Migration executed successfully!\n')

    await client.end()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Migration completed!\n')

    return true

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('\nFull error:', error)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

// Get migration file from command line argument
const migrationArg = process.argv[2]

if (!migrationArg) {
  console.error('Usage: node apply-migration.js <migration-number>')
  console.error('Example: node apply-migration.js 049')
  console.error('\nOr provide full path:')
  console.error('Example: node apply-migration.js supabase/migrations/049_create_units_of_measure.sql')
  process.exit(1)
}

// Find the migration file
let migrationFile
if (migrationArg.endsWith('.sql')) {
  migrationFile = migrationArg
} else {
  // Find migration file by number
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations')
  const files = fs.readdirSync(migrationsDir)
  const matchingFile = files.find(f => f.startsWith(migrationArg + '_'))

  if (!matchingFile) {
    console.error(`❌ Migration ${migrationArg} not found in supabase/migrations/`)
    process.exit(1)
  }

  migrationFile = path.join(migrationsDir, matchingFile)
}

if (!fs.existsSync(migrationFile)) {
  console.error(`❌ Migration file not found: ${migrationFile}`)
  process.exit(1)
}

applyMigration(migrationFile)
