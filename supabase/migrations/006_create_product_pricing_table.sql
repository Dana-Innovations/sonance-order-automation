-- Create product_pricing table for list pricing by UOM and currency
CREATE TABLE IF NOT EXISTS product_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    uom TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    unit_price NUMERIC(15, 4) NOT NULL,
    effective_date DATE NOT NULL,
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_pricing_product_id ON product_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_product_pricing_effective_date ON product_pricing(effective_date);
CREATE INDEX IF NOT EXISTS idx_product_pricing_expiration_date ON product_pricing(expiration_date);


