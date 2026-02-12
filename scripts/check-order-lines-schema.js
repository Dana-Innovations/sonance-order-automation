const { createClient } = require('@supabase/supabase-js')
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

async function checkSchema() {
  console.log('Checking order_lines table schema...\n')

  try {
    // Try to select one row with ps_customer_id
    const { data, error } = await supabase
      .from('order_lines')
      .select('id, ps_customer_id, cust_order_number')
      .limit(1)

    if (error) {
      console.error('Error querying order_lines:', error.message)

      if (error.message.includes('column "ps_customer_id" does not exist')) {
        console.log('\n❌ ps_customer_id column does NOT exist in order_lines table')
        console.log('\nRun this SQL in Supabase SQL Editor to add it:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`
ALTER TABLE order_lines
ADD COLUMN ps_customer_id VARCHAR(18);

ALTER TABLE order_lines
ADD CONSTRAINT fk_order_lines_ps_customer_id
FOREIGN KEY (ps_customer_id)
REFERENCES customers(ps_customer_id)
ON DELETE RESTRICT;

COMMENT ON COLUMN order_lines.ps_customer_id IS 'PeopleSoft customer ID - denormalized from orders table';

CREATE INDEX idx_order_lines_ps_customer_id ON order_lines(ps_customer_id);
`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      }
    } else {
      console.log('✓ ps_customer_id column EXISTS in order_lines table')
      if (data && data.length > 0) {
        console.log('\nSample row:')
        console.log(JSON.stringify(data[0], null, 2))
      } else {
        console.log('\n(No rows in table yet)')
      }
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

checkSchema()
