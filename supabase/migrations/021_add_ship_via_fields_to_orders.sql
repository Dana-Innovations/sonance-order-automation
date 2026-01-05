-- Add ship via fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cust_ship_via TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS "Son_Ship_via" TEXT;


