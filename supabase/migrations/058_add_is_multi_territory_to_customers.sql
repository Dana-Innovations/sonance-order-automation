-- Add is_multi_territory boolean column to customers table
-- This is for multi-territory customers with multiple ship-to customer IDs

ALTER TABLE customers
ADD COLUMN is_multi_territory BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN customers.is_multi_territory IS 'Indicates if customer has multiple territory ship-to customer IDs';