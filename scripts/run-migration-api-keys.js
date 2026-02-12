const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('Running API Keys table migration...')

  const migrationSQL = fs.readFileSync(
    path.join(__dirname, 'supabase', 'migrations', '043_create_api_keys_table.sql'),
    'utf8'
  )

  const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL }).single()

  if (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }

  console.log('✅ Migration completed successfully!')
  console.log('API Keys table created with RLS policies')
}

runMigration()
