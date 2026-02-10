-- Create new table with identical schema to customer_product_pricing
-- This table will be used to test the nightly sync from SQL Server
-- Application will continue using customer_product_pricing until cutover

CREATE TABLE IF NOT EXISTS customer_pricing_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ps_customer_id VARCHAR(20),
    customer_name VARCHAR(255),
    currency_code VARCHAR(10) DEFAULT 'USD',
    catalog_number VARCHAR(50),
    prod_group_catalog VARCHAR(50),
    product_id VARCHAR(50),
    description TEXT,
    brand VARCHAR(100),
    category VARCHAR(100),
    is_kit BOOLEAN DEFAULT FALSE,
    uom VARCHAR(20),
    is_default_uom BOOLEAN,
    pricing_uom VARCHAR(50),
    list_price DECIMAL(12,4),
    discount_pct DECIMAL(5,4),
    dfi_price DECIMAL(12,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create same indexes as original table
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_pricing_sync_unique
    ON customer_pricing_sync(ps_customer_id, product_id, uom, currency_code);

CREATE INDEX IF NOT EXISTS idx_customer_pricing_sync_customer
    ON customer_pricing_sync(ps_customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_pricing_sync_product
    ON customer_pricing_sync(product_id);

CREATE INDEX IF NOT EXISTS idx_customer_pricing_sync_brand
    ON customer_pricing_sync(brand);

-- Enable RLS
ALTER TABLE customer_pricing_sync ENABLE ROW LEVEL SECURITY;

-- Copy RLS policies from original table
CREATE POLICY "Allow authenticated to read pricing sync"
    ON customer_pricing_sync FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated to insert pricing sync"
    ON customer_pricing_sync FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated to update pricing sync"
    ON customer_pricing_sync FOR UPDATE
    TO authenticated
    USING (true);

COMMENT ON TABLE customer_pricing_sync IS 'Nightly sync destination from SQL Server - DO NOT USE IN APP YET. Testing table for pricing sync validation.';
