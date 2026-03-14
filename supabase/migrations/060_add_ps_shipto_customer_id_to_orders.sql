-- Add ps_shipto_customer_id column to orders table
-- This stores the ship-to customer ID for multi-territory customers

ALTER TABLE orders
ADD COLUMN ps_shipto_customer_id VARCHAR(18);

-- Add comment for documentation
COMMENT ON COLUMN orders.ps_shipto_customer_id IS 'Ship-to customer ID for multi-territory customers (can be same as ps_customer_id)';