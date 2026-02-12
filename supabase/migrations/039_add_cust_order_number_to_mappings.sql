-- Add customer order number to customer_product_mappings table
-- This allows tracking which specific order a mapping came from

ALTER TABLE customer_product_mappings
ADD COLUMN IF NOT EXISTS cust_order_number VARCHAR(50);

-- Add index for lookups by order number
CREATE INDEX IF NOT EXISTS idx_customer_product_mappings_order_number
    ON customer_product_mappings(cust_order_number);

-- Add comment for documentation
COMMENT ON COLUMN customer_product_mappings.cust_order_number IS 'Customer order number where this mapping was created or last used';
