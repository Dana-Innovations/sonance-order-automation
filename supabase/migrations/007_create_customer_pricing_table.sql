-- Create customer_pricing table for customer-specific negotiated pricing
CREATE TABLE IF NOT EXISTS customer_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    PS_customer_id VARCHAR(18) NOT NULL REFERENCES customers(PS_customer_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    uom TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    unit_price NUMERIC(15, 4) NOT NULL,
    effective_date DATE NOT NULL,
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create composite index for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_pricing_lookup ON customer_pricing(PS_customer_id, product_id, uom, currency_code);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_ps_customer_id ON customer_pricing(PS_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_product_id ON customer_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_effective_date ON customer_pricing(effective_date);

-- Create trigger for updated_at
CREATE TRIGGER update_customer_pricing_updated_at
    BEFORE UPDATE ON customer_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


