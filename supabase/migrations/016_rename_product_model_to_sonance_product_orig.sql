-- Rename product_model to sonance_product_orig in order_lines table
ALTER TABLE order_lines 
RENAME COLUMN product_model TO sonance_product_orig;

