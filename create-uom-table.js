const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'order-portal-web', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1]

async function createTable() {
  console.log('Creating units_of_measure table in Supabase...\n')

  // Read the migration file
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '049_create_units_of_measure.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  // Try different connection methods
  const connectionStrings = [
    // Session pooler (port 5432)
    `postgresql://postgres.${projectRef}:${serviceRoleKey}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
    // Transaction pooler (port 6543)
    `postgresql://postgres.${projectRef}:${serviceRoleKey}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
    // Direct connection
    `postgresql://postgres:${serviceRoleKey}@db.${projectRef}.supabase.co:5432/postgres`,
  ]

  let connected = false
  let client = null

  for (const connString of connectionStrings) {
    try {
      console.log(`Attempting connection...`)
      client = new Client({
        connectionString: connString,
        ssl: { rejectUnauthorized: false }
      })

      await client.connect()
      console.log('✓ Connected to Supabase database!\n')
      connected = true
      break
    } catch (err) {
      if (client) {
        await client.end().catch(() => {})
      }
      console.log(`✗ Connection attempt failed: ${err.message}`)
    }
  }

  if (!connected) {
    console.error('\n❌ Could not connect to database with service role key.')
    console.error('\nPlease run the SQL manually in Supabase SQL Editor:')
    console.error(`${supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql')}\n`)
    process.exit(1)
  }

  try {
    // Execute the migration
    console.log('Executing migration SQL...')
    await client.query(migrationSQL)

    console.log('✅ Migration completed successfully!\n')

    // Verify the table was created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'units_of_measure'
    `)

    if (result.rows.length > 0) {
      console.log('✓ Table "units_of_measure" verified in database')

      // Check how many UOM codes were inserted
      const countResult = await client.query('SELECT COUNT(*) as count FROM units_of_measure')
      console.log(`✓ ${countResult.rows[0].count} UOM codes inserted\n`)

      // Show the inserted data
      const dataResult = await client.query('SELECT uom_code, uom_description FROM units_of_measure ORDER BY uom_code')
      console.log('📋 Inserted UOM codes:')
      dataResult.rows.forEach(row => {
        console.log(`   ${row.uom_code.padEnd(4)} - ${row.uom_description}`)
      })
    }

    await client.end()
    console.log('\n✅ Done!')

  } catch (error) {
    console.error('❌ Error executing migration:', error.message)
    console.error('\nFull error:', error)
    await client.end()
    process.exit(1)
  }
}

createTable()
