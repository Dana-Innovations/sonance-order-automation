-- Add carrier fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cust_carrier TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS "Son_Carrier_ID" TEXT;


