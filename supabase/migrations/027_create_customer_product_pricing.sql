-- Create customer_product_pricing table from CSV import
-- This table contains detailed customer-specific pricing from PeopleSoft

CREATE TABLE IF NOT EXISTS customer_product_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ps_customer_id VARCHAR(20) NOT NULL,           -- Customer (PS Account ID)
  customer_name VARCHAR(255) NOT NULL,            -- Name
  currency_code VARCHAR(10) NOT NULL DEFAULT 'USD', -- Currency
  catalog_number VARCHAR(50),                     -- Ctlg Nbr
  prod_group_catalog VARCHAR(50),                 -- Prod Group Catalog
  product_id VARCHAR(50) NOT NULL,                -- Product ID
  description TEXT,                               -- Descr
  brand VARCHAR(100),                             -- Brand
  category VARCHAR(100),                          -- Category
  is_kit BOOLEAN DEFAULT FALSE,                   -- Kit (Y/N)
  uom VARCHAR(20),                                -- UOM
  is_default_uom BOOLEAN DEFAULT FALSE,           -- Default UOM (Y/N)
  pricing_uom VARCHAR(50),                        -- Pricing UOM
  list_price DECIMAL(12, 4),                      -- List Price
  discount_pct DECIMAL(5, 4),                     -- Discount_pct (stored as decimal, e.g., 0.25 for 25%)
  dfi_price DECIMAL(12, 4),                       -- DFI_Price
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_customer_product_pricing_customer ON customer_product_pricing(ps_customer_id);
CREATE INDEX idx_customer_product_pricing_product ON customer_product_pricing(product_id);
CREATE INDEX idx_customer_product_pricing_brand ON customer_product_pricing(brand);

-- Add a unique constraint for customer + product + uom + currency combination
CREATE UNIQUE INDEX idx_customer_product_pricing_unique 
ON customer_product_pricing(ps_customer_id, product_id, uom, currency_code);

-- Enable RLS
ALTER TABLE customer_product_pricing ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read
CREATE POLICY "Allow authenticated users to read customer_product_pricing"
ON customer_product_pricing FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert customer_product_pricing"
ON customer_product_pricing FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow authenticated users to update
CREATE POLICY "Allow authenticated users to update customer_product_pricing"
ON customer_product_pricing FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);



