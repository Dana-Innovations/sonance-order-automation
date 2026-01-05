-- Make PS_customer_id the primary key and remove id column
-- First, drop the existing primary key constraint on id
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_pkey;

-- Make PS_customer_id the primary key
-- Note: PS_customer_id already has UNIQUE constraint from migration 001, so this should work
ALTER TABLE customers ADD PRIMARY KEY (PS_customer_id);

-- Drop the id column
-- This is safe since orders table already references PS_customer_id, not id
ALTER TABLE customers DROP COLUMN IF EXISTS id;

