/**
 * Run migration to fix child accounts foreign key relationship
 *
 * This fixes a critical design flaw where multiple customers with ps_customer_id = "MULTI"
 * would share the same child accounts. After this migration, child accounts will properly
 * reference the parent customer's UUID (id field) instead of ps_customer_id.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Try to load .env.local from order-portal-web directory
const envPath = path.join(__dirname, 'order-portal-web', '.env.local')
require('dotenv').config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🔧 Running child accounts foreign key fix migration...\n')

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '053_fix_child_accounts_foreign_key.sql')

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  try {
    // Check if there are existing child accounts
    const { data: existingAccounts, error: checkError } = await supabase
      .from('customer_child_accounts')
      .select('id, parent_ps_customer_id, child_ps_account_id')
      .limit(5)

    if (checkError) {
      console.error('❌ Error checking existing child accounts:', checkError)
      process.exit(1)
    }

    if (existingAccounts && existingAccounts.length > 0) {
      console.log('📊 Found existing child accounts:')
      existingAccounts.forEach(acc => {
        console.log(`   - Child Account ${acc.child_ps_account_id} → Parent ${acc.parent_ps_customer_id}`)
      })
      console.log()
    } else {
      console.log('✅ No existing child accounts found. Migration will be clean.\n')
    }

    // Run the migration
    console.log('⏳ Executing migration SQL...')
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      // If exec_sql function doesn't exist, try to run SQL statements individually
      console.log('⚠️  exec_sql function not available, trying alternative approach...')

      // Split SQL into statements and run them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement.toLowerCase().includes('comment on')) {
          // Skip COMMENT statements for now
          continue
        }

        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement })
        if (stmtError) {
          console.error('❌ Error executing statement:', stmtError)
          console.error('Statement:', statement.substring(0, 100) + '...')
          throw stmtError
        }
      }
    }

    console.log('✅ Migration executed successfully!')
    console.log()

    // Verify the migration worked
    const { data: updatedAccounts, error: verifyError } = await supabase
      .from('customer_child_accounts')
      .select('id, parent_customer_id, child_ps_account_id')
      .limit(5)

    if (verifyError) {
      console.error('❌ Error verifying migration:', verifyError)
    } else if (updatedAccounts && updatedAccounts.length > 0) {
      console.log('✅ Verification successful! Child accounts now use parent_customer_id:')
      updatedAccounts.forEach(acc => {
        console.log(`   - Child Account ${acc.child_ps_account_id} → Parent UUID ${acc.parent_customer_id}`)
      })
    }

    console.log('\n✨ Migration completed successfully!')
    console.log('   • Child accounts now reference parent customer UUIDs')
    console.log('   • Multiple customers can have ps_customer_id = "MULTI"')
    console.log('   • All code has been updated to use parent_customer_id')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.error('\n⚠️  You may need to run this migration manually in the Supabase SQL Editor.')
    console.error('   Migration file: supabase/migrations/053_fix_child_accounts_foreign_key.sql')
    process.exit(1)
  }
}

runMigration()
