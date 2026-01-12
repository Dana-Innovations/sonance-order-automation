-- Add line_status field to order_lines table
-- This tracks whether a line is active or cancelled

ALTER TABLE order_lines
ADD COLUMN line_status VARCHAR(20) DEFAULT 'active';

-- Add comment
COMMENT ON COLUMN order_lines.line_status IS 'Status of the order line: active or cancelled';

-- Create index for faster queries
CREATE INDEX idx_order_lines_line_status ON order_lines(line_status);
