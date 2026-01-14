-- Add ps_supplier_id field to order_lines table
-- This field stores the PeopleSoft supplier ID for each line item

ALTER TABLE order_lines
ADD COLUMN ps_supplier_id VARCHAR(20);

-- Add comment to clarify field usage
COMMENT ON COLUMN order_lines.ps_supplier_id IS 'PeopleSoft supplier ID for the line item';

-- Create index for faster lookups
CREATE INDEX idx_order_lines_ps_supplier_id ON order_lines(ps_supplier_id);
