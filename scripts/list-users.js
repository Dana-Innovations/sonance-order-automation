#!/usr/bin/env node
/**
 * Script to list all users in Supabase
 * Run: node scripts/list-users.js
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function main() {
  console.log('\n📋 Listing Supabase Users\n')

  // Check if we have the required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase environment variables')
    console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
    process.exit(1)
  }

  console.log(`✓ Connected to: ${supabaseUrl}\n`)

  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // List all users
  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('❌ Error listing users:', error.message)
    process.exit(1)
  }

  if (!data.users || data.users.length === 0) {
    console.log('⚠️  No users found in the database')
    console.log('\nTo create a user, run:')
    console.log('  node scripts/check-and-create-user.js')
  } else {
    console.log(`Found ${data.users.length} user(s):\n`)

    data.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)
      console.log(`   Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
      console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`)
      console.log('')
    })
  }

  console.log('✨ Done!\n')
}

main().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
