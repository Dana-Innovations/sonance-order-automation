-- Drop the csr_assignments table
-- CSR assignments are now handled via customers.csr_id and orders.csr_id
DROP TABLE IF EXISTS csr_assignments CASCADE;
