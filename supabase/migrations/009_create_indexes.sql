-- Additional composite indexes for common query patterns

-- Index for finding active customer pricing by customer, product, UOM, and currency
CREATE INDEX IF NOT EXISTS idx_customer_pricing_active_lookup 
ON customer_pricing(PS_customer_id, product_id, uom, currency_code, effective_date, expiration_date);

-- Index for finding current product pricing
CREATE INDEX IF NOT EXISTS idx_product_pricing_current 
ON product_pricing(product_id, uom, currency_code, effective_date, expiration_date);

-- Index for order lines by order and line number (for sorting)
CREATE INDEX IF NOT EXISTS idx_order_lines_order_line_number 
ON order_lines(order_id, line_number);


