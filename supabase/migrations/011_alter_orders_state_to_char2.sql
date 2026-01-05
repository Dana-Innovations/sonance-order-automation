-- Alter orders.state column to CHAR(2)
-- This migration ensures the state column is CHAR(2) regardless of current type
DO $$ 
BEGIN
    -- Check if the column exists and if it's not already CHAR(2)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'state'
        AND data_type != 'character'
    ) THEN
        -- Convert to CHAR(2), truncating longer values
        ALTER TABLE orders 
            ALTER COLUMN state TYPE CHAR(2) 
            USING SUBSTRING(COALESCE(state, ''), 1, 2);
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'state'
        AND character_maximum_length != 2
    ) THEN
        -- Column is character type but wrong length
        ALTER TABLE orders 
            ALTER COLUMN state TYPE CHAR(2) 
            USING SUBSTRING(COALESCE(state, ''), 1, 2);
    END IF;
END $$;

