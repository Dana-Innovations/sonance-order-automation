-- Migration to split ship_to_address into separate address fields
-- This migration replaces the single ship_to_address TEXT field with structured address fields

-- Step 1: Add new address fields to orders table
-- Note: state is already created as CHAR(2) in migration 003, but included here for completeness
ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS address_line1 TEXT,
    ADD COLUMN IF NOT EXISTS address_line2 TEXT,
    ADD COLUMN IF NOT EXISTS address_line3 TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state CHAR(2),
    ADD COLUMN IF NOT EXISTS country TEXT,
    ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Step 2: Drop the old ship_to_address column
-- Since the table is empty, we can safely drop it
ALTER TABLE orders DROP COLUMN IF EXISTS ship_to_address;

