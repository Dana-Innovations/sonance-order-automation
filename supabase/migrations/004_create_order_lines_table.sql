-- Create order_lines table for order line items
CREATE TABLE IF NOT EXISTS order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_sku TEXT,
    product_model TEXT,
    quantity NUMERIC(15, 4),
    uom TEXT,
    unit_price NUMERIC(15, 4),
    line_total NUMERIC(15, 4),
    currency_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for order_id lookups
CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_product_sku ON order_lines(product_sku);


