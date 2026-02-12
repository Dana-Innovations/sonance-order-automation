const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('Running migration: 037_add_is_active_to_carriers.sql')

  try {
    // Check if column already exists
    const { data: columns, error } = await supabase
      .from('carriers')
      .select('is_active')
      .limit(1)

    if (error) {
      // Column doesn't exist, need to add it
      console.log('Adding is_active column to carriers table...')

      console.log('\nPlease run this SQL in your Supabase SQL Editor:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`
-- Add is_active column to carriers table
ALTER TABLE carriers
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index on is_active for better query performance
CREATE INDEX idx_carriers_is_active ON carriers(is_active);
      `)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('\nOr visit: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'))
    } else {
      console.log('✓ is_active column already exists!')
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

runMigration()
