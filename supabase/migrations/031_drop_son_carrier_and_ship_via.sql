-- Drop unused Son_Carrier_ID and Son_Ship_via columns from orders table
ALTER TABLE orders DROP COLUMN IF EXISTS "Son_Carrier_ID";
ALTER TABLE orders DROP COLUMN IF EXISTS "Son_Ship_via";

