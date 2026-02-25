-- Remove old columns from customer_pricing_sync table
-- Keeping only the SQL Server schema columns

ALTER TABLE customer_pricing_sync
  DROP COLUMN IF EXISTS ps_customer_id,
  DROP COLUMN IF EXISTS customer_name,
  DROP COLUMN IF EXISTS currency_code,
  DROP COLUMN IF EXISTS catalog_number,
  DROP COLUMN IF EXISTS prod_group_catalog,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS brand,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS is_kit,
  DROP COLUMN IF EXISTS uom,
  DROP COLUMN IF EXISTS is_default_uom,
  DROP COLUMN IF EXISTS pricing_uom,
  DROP COLUMN IF EXISTS discount_pct,
  DROP COLUMN IF EXISTS dfi_price;

-- Drop old indexes that referenced removed columns
DROP INDEX IF EXISTS idx_customer_pricing_sync_unique;
DROP INDEX IF EXISTS idx_customer_pricing_sync_customer;
DROP INDEX IF EXISTS idx_customer_pricing_sync_product;
DROP INDEX IF EXISTS idx_customer_pricing_sync_brand;

-- Create new unique index based on SQL Server schema
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_pricing_sync_unique_new
  ON customer_pricing_sync(cust_id, product_id, unit_of_measure, setid);

COMMENT ON TABLE customer_pricing_sync IS 'SQL Server pricing sync table - matches source schema exactly';
