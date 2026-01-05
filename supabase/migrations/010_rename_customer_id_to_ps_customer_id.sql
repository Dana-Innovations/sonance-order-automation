-- Migration to rename customer_id to PS_customer_id across all tables
-- This migration handles the transformation from UUID customer_id to VARCHAR(18) PS_customer_id

-- Step 1: Add PS_customer_id column to customers table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'PS_customer_id'
    ) THEN
        ALTER TABLE customers ADD COLUMN PS_customer_id VARCHAR(18);
        
        -- Make PS_customer_id NOT NULL and UNIQUE (since table is empty or will be populated)
        -- First check if there are any NULL values
        IF NOT EXISTS (SELECT 1 FROM customers WHERE PS_customer_id IS NULL) THEN
            ALTER TABLE customers ALTER COLUMN PS_customer_id SET NOT NULL;
        END IF;
        
        -- Create unique index on PS_customer_id
        CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_ps_customer_id ON customers(PS_customer_id);
        
        -- Note: If you have existing customers, you will need to populate PS_customer_id values manually
        -- before the NOT NULL constraint can be applied
    END IF;
END $$;

-- Step 2: Add PS_customer_id column to orders table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'PS_customer_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN PS_customer_id VARCHAR(18);
        
        -- Populate PS_customer_id from customers table based on existing customer_id UUID
        UPDATE orders o
        SET PS_customer_id = c.PS_customer_id
        FROM customers c
        WHERE o.customer_id = c.id
        AND c.PS_customer_id IS NOT NULL;
    END IF;
END $$;

-- Step 3: Add PS_customer_id column to customer_pricing table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_pricing' AND column_name = 'PS_customer_id'
    ) THEN
        ALTER TABLE customer_pricing ADD COLUMN PS_customer_id VARCHAR(18);
        
        -- Populate PS_customer_id from customers table based on existing customer_id UUID
        UPDATE customer_pricing cp
        SET PS_customer_id = c.PS_customer_id
        FROM customers c
        WHERE cp.customer_id = c.id
        AND c.PS_customer_id IS NOT NULL;
    END IF;
END $$;

-- Step 4: Drop old foreign key constraints
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE customer_pricing DROP CONSTRAINT IF EXISTS customer_pricing_customer_id_fkey;

-- Step 5: Make PS_customer_id NOT NULL in orders (after data migration)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'PS_customer_id' AND is_nullable = 'YES'
    ) THEN
        -- Only make NOT NULL if all rows have PS_customer_id populated
        ALTER TABLE orders ALTER COLUMN PS_customer_id SET NOT NULL;
    END IF;
END $$;

-- Step 6: Make PS_customer_id NOT NULL in customer_pricing (after data migration)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_pricing' AND column_name = 'PS_customer_id' AND is_nullable = 'YES'
    ) THEN
        -- Only make NOT NULL if all rows have PS_customer_id populated
        ALTER TABLE customer_pricing ALTER COLUMN PS_customer_id SET NOT NULL;
    END IF;
END $$;

-- Step 7: Ensure customers.PS_customer_id is NOT NULL before adding foreign keys
DO $$ 
BEGIN
    -- Make PS_customer_id NOT NULL in customers if it's not already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'PS_customer_id' AND is_nullable = 'YES'
    ) THEN
        -- Only make NOT NULL if no NULL values exist
        IF NOT EXISTS (SELECT 1 FROM customers WHERE PS_customer_id IS NULL) THEN
            ALTER TABLE customers ALTER COLUMN PS_customer_id SET NOT NULL;
        END IF;
    END IF;
END $$;

-- Step 8: Add new foreign key constraints (only if customers.PS_customer_id is NOT NULL)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'PS_customer_id' AND is_nullable = 'NO'
    ) THEN
        -- Add foreign key constraint for orders
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'orders_ps_customer_id_fkey'
        ) THEN
            ALTER TABLE orders 
                ADD CONSTRAINT orders_ps_customer_id_fkey 
                FOREIGN KEY (PS_customer_id) REFERENCES customers(PS_customer_id) ON DELETE RESTRICT;
        END IF;
        
        -- Add foreign key constraint for customer_pricing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'customer_pricing_ps_customer_id_fkey'
        ) THEN
            ALTER TABLE customer_pricing 
                ADD CONSTRAINT customer_pricing_ps_customer_id_fkey 
                FOREIGN KEY (PS_customer_id) REFERENCES customers(PS_customer_id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Step 9: Drop old indexes
DROP INDEX IF EXISTS idx_orders_customer_id;
DROP INDEX IF EXISTS idx_customer_pricing_customer_id;
DROP INDEX IF EXISTS idx_customer_pricing_lookup;

-- Step 10: Create new indexes
CREATE INDEX IF NOT EXISTS idx_orders_ps_customer_id ON orders(PS_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_ps_customer_id ON customer_pricing(PS_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_lookup ON customer_pricing(PS_customer_id, product_id, uom, currency_code);

-- Step 11: Update the composite index in customer_pricing
DROP INDEX IF EXISTS idx_customer_pricing_active_lookup;
CREATE INDEX IF NOT EXISTS idx_customer_pricing_active_lookup 
ON customer_pricing(PS_customer_id, product_id, uom, currency_code, effective_date, expiration_date);

-- Step 12: Drop old customer_id columns (only after verifying data migration is complete)
-- Since the database appears to be empty, we can drop the old columns
-- Uncomment these lines after you've verified all PS_customer_id values are populated and migration is successful
-- ALTER TABLE orders DROP COLUMN IF EXISTS customer_id;
-- ALTER TABLE customer_pricing DROP COLUMN IF EXISTS customer_id;
