-- Create PS Order Sequence Table
-- This table maintains the next available PS Order Number
CREATE TABLE IF NOT EXISTS ps_order_sequence (
    id INTEGER PRIMARY KEY DEFAULT 1,
    current_number BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row_only CHECK (id = 1)
);

-- Insert initial value (you can change 7010000000 to your starting order number)
INSERT INTO ps_order_sequence (id, current_number, updated_at)
VALUES (1, 7010000000, NOW())
ON CONFLICT (id) DO NOTHING;

-- Create atomic function to get and increment PS Order Number
-- This function uses row-level locking to prevent duplicate assignments
CREATE OR REPLACE FUNCTION get_next_ps_order_number()
RETURNS BIGINT AS $$
DECLARE
    next_number BIGINT;
BEGIN
    -- Lock the row for update to prevent concurrent access
    -- This ensures only one transaction can get a number at a time
    UPDATE ps_order_sequence
    SET
        current_number = current_number + 1,
        updated_at = NOW()
    WHERE id = 1
    RETURNING current_number INTO next_number;

    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Add ps_order_number column to orders table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'ps_order_number'
    ) THEN
        ALTER TABLE orders ADD COLUMN ps_order_number BIGINT UNIQUE;
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_ps_order_number ON orders(ps_order_number);

-- Add comment for documentation
COMMENT ON TABLE ps_order_sequence IS 'Maintains the next available PS Order Number. Uses row-level locking to prevent duplicate assignments.';
COMMENT ON FUNCTION get_next_ps_order_number IS 'Atomically retrieves and increments the next PS Order Number. Thread-safe for concurrent users.';
