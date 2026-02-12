-- Add default value fields to customers table
ALTER TABLE customers
ADD COLUMN default_carrier TEXT,
ADD COLUMN default_ship_via TEXT,
ADD COLUMN default_shipto_name TEXT;

-- Add comment explaining these fields
COMMENT ON COLUMN customers.default_carrier IS 'Default carrier code to use for new orders from this customer';
COMMENT ON COLUMN customers.default_ship_via IS 'Default ship via code to use for new orders from this customer';
COMMENT ON COLUMN customers.default_shipto_name IS 'Default ship-to name to use for new orders from this customer';
