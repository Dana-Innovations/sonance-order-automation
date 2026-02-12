/**
 * Run migration directly via PostgreSQL connection
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Try to load .env.local from order-portal-web directory
const envPath = path.join(__dirname, 'order-portal-web', '.env.local')
require('dotenv').config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const dbPassword = process.env.SUPABASE_DB_PASSWORD

if (!supabaseUrl || !dbPassword) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_DB_PASSWORD')
  process.exit(1)
}

// Extract project reference from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1]

// Construct PostgreSQL connection string
const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`

async function runMigration() {
  const client = new Client({ connectionString })

  try {
    console.log('🔧 Connecting to Supabase PostgreSQL database...\n')
    await client.connect()
    console.log('✅ Connected!\n')

    // Check existing child accounts
    console.log('📊 Checking existing child accounts...')
    const checkResult = await client.query(`
      SELECT id, parent_ps_customer_id, child_ps_account_id
      FROM customer_child_accounts
      LIMIT 5
    `)

    if (checkResult.rows.length > 0) {
      console.log('Found existing child accounts:')
      checkResult.rows.forEach(acc => {
        console.log(`   - Child Account ${acc.child_ps_account_id} → Parent ${acc.parent_ps_customer_id}`)
      })
      console.log()
    } else {
      console.log('No existing child accounts found.\n')
    }

    // Read migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '053_fix_child_accounts_foreign_key.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('⏳ Executing migration...')
    console.log('   This will:')
    console.log('   1. Drop old foreign key constraint')
    console.log('   2. Add new parent_customer_id column (UUID)')
    console.log('   3. Migrate existing data')
    console.log('   4. Create new foreign key to customers.id')
    console.log('   5. Remove old parent_ps_customer_id column\n')

    // Execute the migration
    await client.query(migrationSQL)

    console.log('✅ Migration executed successfully!\n')

    // Verify the migration
    console.log('📊 Verifying migration...')
    const verifyResult = await client.query(`
      SELECT id, parent_customer_id, child_ps_account_id
      FROM customer_child_accounts
      LIMIT 5
    `)

    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification successful! Child accounts now use parent_customer_id (UUID):')
      verifyResult.rows.forEach(acc => {
        console.log(`   - Child Account ${acc.child_ps_account_id} → Parent UUID ${acc.parent_customer_id}`)
      })
      console.log()
    }

    // Check the schema
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customer_child_accounts'
      ORDER BY ordinal_position
    `)

    console.log('📋 Updated table schema:')
    schemaResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
      console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}`)
    })

    console.log('\n✨ Migration completed successfully!')
    console.log('   • Child accounts now reference parent customer UUIDs')
    console.log('   • Multiple customers can have ps_customer_id = "MULTI"')
    console.log('   • All code has been updated to use parent_customer_id')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
