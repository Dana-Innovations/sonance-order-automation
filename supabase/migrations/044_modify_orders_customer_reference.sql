-- Modify orders table to allow ps_customer_id to reference either parent customers or child accounts

-- First, drop the existing foreign key constraint
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_ps_customer_id_fkey;

-- Create a function to validate that ps_customer_id exists in either customers or customer_child_accounts
CREATE OR REPLACE FUNCTION validate_ps_customer_id(p_customer_id VARCHAR(18))
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if it exists in customers table
    IF EXISTS (SELECT 1 FROM customers WHERE ps_customer_id = p_customer_id) THEN
        RETURN TRUE;
    END IF;

    -- Check if it exists in customer_child_accounts table
    IF EXISTS (SELECT 1 FROM customer_child_accounts WHERE child_ps_account_id = p_customer_id) THEN
        RETURN TRUE;
    END IF;

    -- Not found in either table
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add a CHECK constraint using the validation function
ALTER TABLE orders
ADD CONSTRAINT orders_ps_customer_id_valid
CHECK (validate_ps_customer_id(ps_customer_id));

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT orders_ps_customer_id_valid ON orders IS 'Ensures ps_customer_id exists in either customers or customer_child_accounts table';
