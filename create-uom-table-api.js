const fs = require('fs')
const path = require('path')
const https = require('https')

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

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    // Try using Supabase's edge function or management API
    const url = new URL(`https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`)

    const data = JSON.stringify({ sql })

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Length': data.length
      }
    }

    const req = https.request(url, options, (res) => {
      let responseData = ''

      res.on('data', (chunk) => {
        responseData += chunk
      })

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: responseData })
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`))
        }
      })
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function createTableViaAPI() {
  console.log('Creating units_of_measure table via Supabase API...\n')

  // Read the migration file
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '049_create_units_of_measure.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  try {
    console.log('Attempting to execute SQL via API...')
    const result = await executeSQL(migrationSQL)
    console.log('✅ Table created successfully!')
    console.log(result)
  } catch (error) {
    console.log(`✗ API execution failed: ${error.message}\n`)

    // Fallback: Open browser to SQL editor
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Since automatic execution failed, please manually run the SQL:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('1. I will open the Supabase SQL Editor in your browser')
    console.log('2. Copy the SQL below')
    console.log('3. Paste and run it in the SQL Editor\n')

    console.log('SQL to run:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(migrationSQL)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const sqlEditorUrl = `${supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql')}`
    console.log(`Opening: ${sqlEditorUrl}\n`)

    // Open browser
    const { exec } = require('child_process')
    const command = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
    exec(`${command} "${sqlEditorUrl}"`)

    console.log('Waiting for you to run the SQL...')
    console.log('(Press Ctrl+C when done)\n')
  }
}

createTableViaAPI()
