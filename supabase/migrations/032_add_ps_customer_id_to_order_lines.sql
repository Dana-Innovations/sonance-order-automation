-- Add ps_customer_id field to order_lines table for denormalization
-- This matches the ps_customer_id field in the orders table

ALTER TABLE order_lines
ADD COLUMN ps_customer_id VARCHAR(18);

-- Add foreign key constraint to match orders table
ALTER TABLE order_lines
ADD CONSTRAINT fk_order_lines_ps_customer_id
FOREIGN KEY (ps_customer_id)
REFERENCES customers(ps_customer_id)
ON DELETE RESTRICT;

-- Add comment to clarify field usage
COMMENT ON COLUMN order_lines.ps_customer_id IS 'PeopleSoft customer ID - denormalized from orders table for easier querying';

-- Create index for faster lookups
CREATE INDEX idx_order_lines_ps_customer_id ON order_lines(ps_customer_id);

-- Remove ps_supplier_id column if it was added by mistake
ALTER TABLE order_lines
DROP COLUMN IF EXISTS ps_supplier_id;
