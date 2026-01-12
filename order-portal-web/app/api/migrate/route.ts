import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Run the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add line_status field to order_lines table
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'order_lines'
            AND column_name = 'line_status'
          ) THEN
            ALTER TABLE order_lines
            ADD COLUMN line_status VARCHAR(20) DEFAULT 'active';

            COMMENT ON COLUMN order_lines.line_status IS 'Status of the order line: active or cancelled';

            CREATE INDEX idx_order_lines_line_status ON order_lines(line_status);
          END IF;
        END $$;
      `
    })

    if (error) {
      // Try direct SQL execution
      const { error: sqlError } = await supabase.from('order_lines').select('line_status').limit(1)

      if (sqlError && sqlError.message.includes('column "line_status" does not exist')) {
        return NextResponse.json({
          success: false,
          message: 'Migration needs to be run manually. Please run the SQL from the migration file in your Supabase SQL Editor.',
          sql: `
ALTER TABLE order_lines
ADD COLUMN line_status VARCHAR(20) DEFAULT 'active';

COMMENT ON COLUMN order_lines.line_status IS 'Status of the order line: active or cancelled';

CREATE INDEX idx_order_lines_line_status ON order_lines(line_status);
          `
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully!'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
