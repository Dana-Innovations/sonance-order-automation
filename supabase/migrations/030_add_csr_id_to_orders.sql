-- Add csr_id column to orders table
-- This links each order to the assigned CSR at the time of order creation
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS csr_id VARCHAR(255) REFERENCES csrs(email);

-- Create index for faster lookups by CSR
CREATE INDEX IF NOT EXISTS idx_orders_csr_id ON orders(csr_id);

-- Add comment
COMMENT ON COLUMN orders.csr_id IS 'Email of the assigned CSR (references csrs.email)';

