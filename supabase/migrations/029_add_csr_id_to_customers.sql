-- Add csr_id column to customers table
-- This links each customer to their assigned CSR
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS csr_id VARCHAR(255) REFERENCES csrs(email);

-- Create index for faster lookups by CSR
CREATE INDEX IF NOT EXISTS idx_customers_csr_id ON customers(csr_id);

-- Add comment
COMMENT ON COLUMN customers.csr_id IS 'Email of the assigned CSR (references csrs.email)';

