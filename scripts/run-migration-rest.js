/**
 * Run migration using Supabase REST API
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// Try to load .env.local from project root
const envPath = path.join(__dirname, '..', '.env.local')
require('dotenv').config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${supabaseUrl}/rest/v1/rpc/exec_sql`)

    const postData = JSON.stringify({ sql })

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'))
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

async function runMigration() {
  console.log('🔧 Running migration via Supabase REST API...\n')

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '053_fix_child_accounts_foreign_key.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('⏳ Executing migration SQL...')
    await executeSQL(migrationSQL)

    console.log('✅ Migration completed successfully!\n')

  } catch (error) {
    console.error('❌ Migration via REST API not available.')
    console.error('Error:', error.message, '\n')

    console.log('📋 Please run the migration manually in Supabase SQL Editor:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/xgftwwircksmhevzkrhn/sql/new')
    console.log('   2. Copy the SQL from: supabase/migrations/053_fix_child_accounts_foreign_key.sql')
    console.log('   3. Paste and execute\n')

    console.log('Or I can show you the SQL to copy-paste now.')
    process.exit(1)
  }
}

runMigration()
