-- Add ps_customer_id field to order_lines table without foreign key constraint
-- This allows more flexibility in data management

-- Add the column if it doesn't exist
ALTER TABLE order_lines
ADD COLUMN IF NOT EXISTS ps_customer_id VARCHAR(18);

-- Add comment to clarify field usage
COMMENT ON COLUMN order_lines.ps_customer_id IS 'PeopleSoft customer ID - denormalized from orders table';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_lines_ps_customer_id ON order_lines(ps_customer_id);

-- Remove ps_supplier_id column if it exists (cleanup from earlier mistake)
ALTER TABLE order_lines
DROP COLUMN IF EXISTS ps_supplier_id;
