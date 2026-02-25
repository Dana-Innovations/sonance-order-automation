-- Add SQL Server pricing columns to customer_pricing_sync table
-- This aligns the table structure with the SQL Server source

-- Add new columns from SQL Server schema
ALTER TABLE customer_pricing_sync
  ADD COLUMN IF NOT EXISTS setid VARCHAR(5),
  ADD COLUMN IF NOT EXISTS cust_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS prod_setid VARCHAR(5),
  -- product_id already exists
  ADD COLUMN IF NOT EXISTS qty DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(10),
  -- list_price already exists but may need precision adjustment
  ADD COLUMN IF NOT EXISTS net_price DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS msrp_price DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS dfi DECIMAL(18,5),
  ADD COLUMN IF NOT EXISTS net_margin DECIMAL(18,5),
  ADD COLUMN IF NOT EXISTS dst_id_dis VARCHAR(10),
  ADD COLUMN IF NOT EXISTS dst_id_sur VARCHAR(10),
  ADD COLUMN IF NOT EXISTS can_bo VARCHAR(1),
  ADD COLUMN IF NOT EXISTS can_buy VARCHAR(1),
  ADD COLUMN IF NOT EXISTS can_see_msrp VARCHAR(1),
  ADD COLUMN IF NOT EXISTS can_see_wholesale VARCHAR(1),
  ADD COLUMN IF NOT EXISTS varients INTEGER,
  ADD COLUMN IF NOT EXISTS modified TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wholesale_margin DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS record_status VARCHAR(1),
  ADD COLUMN IF NOT EXISTS tariff_surcharge DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS eoep_rule_id VARCHAR(50);

-- Update list_price precision if needed
ALTER TABLE customer_pricing_sync
  ALTER COLUMN list_price TYPE DECIMAL(18,4);

-- Add indexes for new key columns
CREATE INDEX IF NOT EXISTS idx_customer_pricing_sync_setid
  ON customer_pricing_sync(setid);

CREATE INDEX IF NOT EXISTS idx_customer_pricing_sync_cust_id
  ON customer_pricing_sync(cust_id);

CREATE INDEX IF NOT EXISTS idx_customer_pricing_sync_prod_setid
  ON customer_pricing_sync(prod_setid);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_customer_pricing_sync_cust_prod
  ON customer_pricing_sync(cust_id, product_id);

COMMENT ON TABLE customer_pricing_sync IS 'SQL Server pricing sync table - aligned with source schema for nightly updates';
