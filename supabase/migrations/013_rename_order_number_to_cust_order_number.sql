-- Rename order_number column to cust_order_number in orders table
ALTER TABLE orders 
RENAME COLUMN order_number TO cust_order_number;

