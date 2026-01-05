-- Add cust_line_desc (customer line description) to order_lines table
ALTER TABLE order_lines 
ADD COLUMN IF NOT EXISTS cust_line_desc TEXT;

