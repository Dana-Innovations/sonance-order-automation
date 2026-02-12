#!/usr/bin/env node
/**
 * Script to reset password for keithh@sonance.com
 * Run: node scripts/reset-password.js
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function main() {
  console.log('\n🔐 Password Reset for keithh@sonance.com\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase environment variables')
    process.exit(1)
  }

  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const email = 'keithh@sonance.com'
  const newPassword = 'Kramer354' // Reset to the password you want

  console.log(`Resetting password for: ${email}`)
  console.log(`New password: ${newPassword}\n`)

  // Find the user
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Error listing users:', listError.message)
    process.exit(1)
  }

  const user = users.users.find(u => u.email === email)

  if (!user) {
    console.error('❌ User not found!')
    process.exit(1)
  }

  console.log(`✓ Found user: ${user.id}`)

  // Update the password
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  )

  if (error) {
    console.error('❌ Error updating password:', error.message)
    process.exit(1)
  }

  console.log('\n✅ Password reset successfully!')
  console.log('\n📝 Your login credentials:')
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${newPassword}`)
  console.log('\n⚠️  You can now log in at: https://sonance-order-automation.vercel.app')
  console.log('\n✨ Done!\n')
}

main().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
