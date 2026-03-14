-- Create customer_territory_shipto table for multi-territory ship-to management

CREATE TABLE customer_territory_shipto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_ps_customer_id VARCHAR(18) NOT NULL,
  shipto_ps_customer_id VARCHAR(18) NOT NULL,
  city TEXT NOT NULL,
  state VARCHAR(10) NOT NULL,
  country_code VARCHAR(3) DEFAULT 'USA',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint to customers table
ALTER TABLE customer_territory_shipto
ADD CONSTRAINT customer_territory_shipto_parent_ps_customer_id_fkey
FOREIGN KEY (parent_ps_customer_id)
REFERENCES customers (ps_customer_id)
ON DELETE CASCADE;

-- Create index on parent_ps_customer_id for faster lookups
CREATE INDEX idx_customer_territory_shipto_parent_ps_customer_id
ON customer_territory_shipto (parent_ps_customer_id);

-- Create unique constraint on parent_customer_id + city + state + country_code
CREATE UNIQUE INDEX idx_customer_territory_shipto_unique_location
ON customer_territory_shipto (parent_ps_customer_id, LOWER(city), UPPER(state), UPPER(country_code));

-- Create updated_at trigger using existing function
CREATE TRIGGER update_customer_territory_shipto_updated_at
  BEFORE UPDATE ON customer_territory_shipto
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE customer_territory_shipto IS 'Territory-based ship-to customer IDs for multi-territory customers';
COMMENT ON COLUMN customer_territory_shipto.parent_ps_customer_id IS 'Parent customer PS customer ID';
COMMENT ON COLUMN customer_territory_shipto.shipto_ps_customer_id IS 'Ship-to customer ID for this territory';
COMMENT ON COLUMN customer_territory_shipto.city IS 'City for territory matching (case-insensitive)';
COMMENT ON COLUMN customer_territory_shipto.state IS 'State/province for territory matching';
COMMENT ON COLUMN customer_territory_shipto.country_code IS 'Country code (default USA)';
COMMENT ON COLUMN customer_territory_shipto.description IS 'Human-readable description of this territory mapping';