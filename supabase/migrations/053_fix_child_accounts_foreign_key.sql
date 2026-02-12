-- Fix customer_child_accounts to reference customers.customer_id (UUID) instead of ps_customer_id
-- This allows multiple customers to have ps_customer_id = "MULTI" without conflicts

-- =============================================================================
-- PART 1: Ensure customer_id is the primary key (should already be)
-- =============================================================================

-- Verify ps_customer_id is NOT the primary key (if it was made primary key, revert it)
-- Drop the primary key constraint on ps_customer_id if it exists
ALTER TABLE customers
DROP CONSTRAINT IF EXISTS customers_pkey CASCADE;

-- Add primary key on customer_id
ALTER TABLE customers
ADD PRIMARY KEY (customer_id);

-- Ensure ps_customer_id can have duplicates (for MULTI customers)
ALTER TABLE customers
DROP CONSTRAINT IF EXISTS customers_ps_customer_id_key;

-- Keep index on ps_customer_id for performance
CREATE INDEX IF NOT EXISTS idx_customers_ps_customer_id ON customers(ps_customer_id);

-- =============================================================================
-- PART 2: Update customer_child_accounts to reference customers.customer_id
-- =============================================================================

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE customer_child_accounts
DROP CONSTRAINT IF EXISTS customer_child_accounts_parent_ps_customer_id_fkey;

-- Step 2: Drop the unique constraint that includes the old column
ALTER TABLE customer_child_accounts
DROP CONSTRAINT IF EXISTS unique_child_account_per_parent;

-- Step 3: Add new column for parent customer UUID
ALTER TABLE customer_child_accounts
ADD COLUMN parent_customer_id UUID;

-- Step 4: Migrate existing data - populate parent_customer_id from parent_ps_customer_id
-- This finds the customers.customer_id that matches the parent_ps_customer_id value
UPDATE customer_child_accounts
SET parent_customer_id = (
    SELECT customer_id FROM customers WHERE ps_customer_id = customer_child_accounts.parent_ps_customer_id
);

-- Step 5: Make the new column NOT NULL (after data is populated)
ALTER TABLE customer_child_accounts
ALTER COLUMN parent_customer_id SET NOT NULL;

-- Step 6: Add the new foreign key constraint referencing customers.customer_id
ALTER TABLE customer_child_accounts
ADD CONSTRAINT customer_child_accounts_parent_customer_id_fkey
    FOREIGN KEY (parent_customer_id)
    REFERENCES customers(customer_id)
    ON DELETE CASCADE;

-- Step 7: Add new unique constraint with the correct column
ALTER TABLE customer_child_accounts
ADD CONSTRAINT unique_child_account_per_parent
    UNIQUE(parent_customer_id, child_ps_account_id);

-- Step 8: Drop the old column
ALTER TABLE customer_child_accounts
DROP COLUMN parent_ps_customer_id;

-- Step 9: Update indexes
DROP INDEX IF EXISTS idx_child_accounts_parent;
CREATE INDEX idx_child_accounts_parent ON customer_child_accounts(parent_customer_id);

-- =============================================================================
-- PART 3: Update comments
-- =============================================================================

COMMENT ON TABLE customers IS 'Authorized customers. Each customer has a unique UUID customer_id. Multiple customers can have ps_customer_id = MULTI for multi-territory accounts.';
COMMENT ON COLUMN customers.customer_id IS 'Primary key (UUID) - unique identifier for each customer';
COMMENT ON COLUMN customers.ps_customer_id IS 'PeopleSoft customer ID. Can be MULTI for multi-territory customers. Each MULTI customer has unique child accounts.';

COMMENT ON TABLE customer_child_accounts IS 'Stores child PeopleSoft account IDs for multi-account customers (parent customer has ps_customer_id = MULTI)';
COMMENT ON COLUMN customer_child_accounts.parent_customer_id IS 'References the parent customer UUID (customers.customer_id)';
COMMENT ON COLUMN customer_child_accounts.child_ps_account_id IS 'The actual PeopleSoft account ID used in orders';
COMMENT ON COLUMN customer_child_accounts.routing_description IS 'Describes when to use this account (used by AI routing logic)';
COMMENT ON COLUMN customer_child_accounts.display_order IS 'Display order in UI (1 = first)';
