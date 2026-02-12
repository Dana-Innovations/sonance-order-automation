-- Add is_active column to carriers table
ALTER TABLE carriers
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index on is_active for better query performance
CREATE INDEX idx_carriers_is_active ON carriers(is_active);
