-- Remove the foreign key constraint from order_lines.ps_customer_id
-- This allows inserting order lines even if the customer doesn't exist in the customers table

ALTER TABLE order_lines
DROP CONSTRAINT IF EXISTS fk_order_lines_ps_customer_id;

-- The column and index remain, just no foreign key enforcement
