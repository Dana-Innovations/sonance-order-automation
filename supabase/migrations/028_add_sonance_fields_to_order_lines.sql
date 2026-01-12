-- Add Sonance working fields to order_lines table
-- These fields capture edits while preserving original customer values
-- On initial creation, these will be set to match the cust_* values
-- Only sonance_* fields are editable; cust_* fields are immutable

-- Add new sonance fields
ALTER TABLE order_lines
ADD COLUMN IF NOT EXISTS sonance_prod_sku VARCHAR(100),
ADD COLUMN IF NOT EXISTS sonance_quantity DECIMAL(12, 4),
ADD COLUMN IF NOT EXISTS sonance_uom VARCHAR(20),
ADD COLUMN IF NOT EXISTS sonance_unit_price DECIMAL(12, 4);

-- Drop old/unused columns
ALTER TABLE order_lines
DROP COLUMN IF EXISTS sonance_product_orig,
DROP COLUMN IF EXISTS sonance_prod_trans;

-- Add comments to clarify field usage
COMMENT ON COLUMN order_lines.sonance_prod_sku IS 'Editable product SKU - defaults to cust_product_sku on creation';
COMMENT ON COLUMN order_lines.sonance_quantity IS 'Editable quantity - defaults to cust_quantity on creation';
COMMENT ON COLUMN order_lines.sonance_uom IS 'Editable UOM - defaults to cust_uom on creation';
COMMENT ON COLUMN order_lines.sonance_unit_price IS 'Editable unit price - defaults to cust_unit_price on creation';

-- Note: The cust_* fields should NEVER be updated after initial creation
-- cust_product_sku, cust_quantity, cust_uom, cust_unit_price, cust_line_total, 
-- cust_currency_code, cust_order_number, cust_line_desc are immutable customer values

