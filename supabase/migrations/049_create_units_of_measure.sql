-- Create units_of_measure table for standardizing UOM codes across orders
-- This table stores unit of measure codes and descriptions used in order processing

CREATE TABLE IF NOT EXISTS units_of_measure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uom_code VARCHAR(20) NOT NULL UNIQUE,          -- Standard UOM code (EA, CS, BX, etc.)
    uom_description TEXT NOT NULL,                 -- Human-readable description
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups by code
CREATE INDEX IF NOT EXISTS idx_units_of_measure_code
    ON units_of_measure(uom_code);

-- Add comments for documentation
COMMENT ON TABLE units_of_measure IS 'Standard units of measure codes and descriptions for order processing';
COMMENT ON COLUMN units_of_measure.uom_code IS 'Standard UOM code (EA=Each, CS=Case, BX=Box, etc.)';
COMMENT ON COLUMN units_of_measure.uom_description IS 'Human-readable description of the unit of measure';

-- Insert common UOM codes
INSERT INTO units_of_measure (uom_code, uom_description) VALUES
    ('EA', 'Each'),
    ('CS', 'Case'),
    ('BX', 'Box'),
    ('PK', 'Package'),
    ('PR', 'Pair'),
    ('ST', 'Set'),
    ('LB', 'Pound'),
    ('KG', 'Kilogram'),
    ('FT', 'Foot'),
    ('MT', 'Meter')
ON CONFLICT (uom_code) DO NOTHING;
