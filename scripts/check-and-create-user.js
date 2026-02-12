#!/usr/bin/env node
/**
 * Script to check if a user exists in Supabase and create one if needed
 * Run: node scripts/check-and-create-user.js
 */

const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function main() {
  console.log('\n🔍 Supabase User Check & Creation Tool\n')

  // Check if we have the required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase environment variables')
    console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
    process.exit(1)
  }

  console.log(`✓ Connected to Supabase: ${supabaseUrl}\n`)

  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Ask for email
  const email = await question('Enter the email address to check/create: ')

  if (!email || !email.includes('@')) {
    console.error('❌ Invalid email address')
    rl.close()
    process.exit(1)
  }

  // Check if user exists
  console.log(`\n🔍 Checking if user exists: ${email}`)

  const { data: users, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Error listing users:', listError.message)
    rl.close()
    process.exit(1)
  }

  const existingUser = users.users.find(u => u.email === email)

  if (existingUser) {
    console.log('✅ User already exists!')
    console.log(`   User ID: ${existingUser.id}`)
    console.log(`   Email: ${existingUser.email}`)
    console.log(`   Created: ${new Date(existingUser.created_at).toLocaleString()}`)
    console.log(`   Email Confirmed: ${existingUser.email_confirmed_at ? 'Yes' : 'No'}`)

    const updatePassword = await question('\nDo you want to update the password? (y/N): ')

    if (updatePassword.toLowerCase() === 'y') {
      const newPassword = await question('Enter new password: ')

      if (newPassword && newPassword.length >= 6) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password: newPassword }
        )

        if (updateError) {
          console.error('❌ Error updating password:', updateError.message)
        } else {
          console.log('✅ Password updated successfully!')
        }
      } else {
        console.error('❌ Password must be at least 6 characters')
      }
    }
  } else {
    console.log('⚠️  User does not exist')

    const createUser = await question('\nDo you want to create this user? (y/N): ')

    if (createUser.toLowerCase() === 'y') {
      const password = await question('Enter password (min 6 characters): ')

      if (!password || password.length < 6) {
        console.error('❌ Password must be at least 6 characters')
        rl.close()
        process.exit(1)
      }

      console.log('\n📝 Creating user...')

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          created_by: 'admin-script',
          created_at: new Date().toISOString()
        }
      })

      if (createError) {
        console.error('❌ Error creating user:', createError.message)
        rl.close()
        process.exit(1)
      }

      console.log('\n✅ User created successfully!')
      console.log(`   User ID: ${newUser.user.id}`)
      console.log(`   Email: ${newUser.user.email}`)
      console.log(`   Password: ${password}`)
      console.log('\n⚠️  IMPORTANT: Save these credentials securely!')
      console.log('   You can now log in with these credentials at your deployed app.')
    }
  }

  rl.close()
  console.log('\n✨ Done!\n')
}

main().catch(error => {
  console.error('❌ Unexpected error:', error)
  rl.close()
  process.exit(1)
})
