-- Add validation fields to order_lines table
-- These fields track product SKU validation status and results

-- Add validation_source field
ALTER TABLE order_lines
ADD COLUMN validation_source VARCHAR(100);

-- Add validated_sku field
ALTER TABLE order_lines
ADD COLUMN validated_sku VARCHAR(100);

-- Add is_validated field (boolean, defaults to false)
ALTER TABLE order_lines
ADD COLUMN is_validated BOOLEAN DEFAULT false;

-- Add comments to clarify field usage
COMMENT ON COLUMN order_lines.validation_source IS 'Source of the SKU validation (e.g., customer_product_mapping, product_pricing, manual)';
COMMENT ON COLUMN order_lines.validated_sku IS 'The validated Sonance product SKU after validation';
COMMENT ON COLUMN order_lines.is_validated IS 'Whether the line item SKU has been validated (true/false)';

-- Create index on is_validated for faster queries filtering by validation status
CREATE INDEX idx_order_lines_is_validated ON order_lines(is_validated);

-- Create index on validated_sku for faster lookups
CREATE INDEX idx_order_lines_validated_sku ON order_lines(validated_sku);
