-- Create customer_product_mappings table for ML-style product mapping
-- This table stores learned associations between customer item numbers/descriptions 
-- and Sonance products, enabling the n8n workflow to look up correct products for future orders

CREATE TABLE IF NOT EXISTS customer_product_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ps_customer_id VARCHAR(18) NOT NULL,           -- Links to customer
    cust_product_sku VARCHAR(100),                 -- Customer's item number
    cust_product_desc TEXT,                        -- Customer's description
    sonance_product_sku VARCHAR(100) NOT NULL,     -- Mapped Sonance product
    confidence_score DECIMAL(3,2) DEFAULT 1.00,   -- 1.00 = user confirmed
    times_used INTEGER DEFAULT 1,                  -- How many times this mapping was used
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_order_id UUID,                      -- Order that created this mapping
    
    -- One mapping per customer/item combo
    CONSTRAINT unique_customer_product_mapping UNIQUE(ps_customer_id, cust_product_sku)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_product_mappings_customer 
    ON customer_product_mappings(ps_customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_product_mappings_lookup 
    ON customer_product_mappings(ps_customer_id, cust_product_sku);

CREATE INDEX IF NOT EXISTS idx_customer_product_mappings_sonance_sku 
    ON customer_product_mappings(sonance_product_sku);

-- Add comments for documentation
COMMENT ON TABLE customer_product_mappings IS 'Stores learned associations between customer item numbers and Sonance products for ML-style product matching';
COMMENT ON COLUMN customer_product_mappings.ps_customer_id IS 'PeopleSoft customer ID - each customer has their own mappings';
COMMENT ON COLUMN customer_product_mappings.cust_product_sku IS 'Customer item/product number as sent in their orders';
COMMENT ON COLUMN customer_product_mappings.cust_product_desc IS 'Customer product description as sent in their orders';
COMMENT ON COLUMN customer_product_mappings.sonance_product_sku IS 'The correct Sonance product SKU for this customer item';
COMMENT ON COLUMN customer_product_mappings.confidence_score IS '1.00 = user confirmed, lower values for AI-suggested mappings';
COMMENT ON COLUMN customer_product_mappings.times_used IS 'Number of times this mapping has been used/confirmed';
COMMENT ON COLUMN customer_product_mappings.created_by_order_id IS 'The order ID that first created this mapping';


