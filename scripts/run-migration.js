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
  console.log('Running migration: 029_add_line_status_to_order_lines.sql')

  try {
    // Check if column already exists
    const { data: columns } = await supabase
      .from('order_lines')
      .select('line_status')
      .limit(1)

    if (!columns || columns.error) {
      // Column doesn't exist, need to add it
      console.log('Adding line_status column to order_lines table...')

      // Unfortunately, Supabase JS client doesn't support DDL directly
      // We need to use SQL Editor or pg library
      console.log('\nPlease run this SQL in your Supabase SQL Editor:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`
ALTER TABLE order_lines
ADD COLUMN line_status VARCHAR(20) DEFAULT 'active';

COMMENT ON COLUMN order_lines.line_status IS 'Status of the order line: active or cancelled';

CREATE INDEX idx_order_lines_line_status ON order_lines(line_status);
      `)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('\nOr visit: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'))
    } else {
      console.log('✓ line_status column already exists!')
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

runMigration()
