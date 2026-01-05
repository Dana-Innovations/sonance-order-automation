-- Add sonance_prod_trans (Sonance product ID transformed) to order_lines table
-- This field stores the cleansed Sonance product ID with prefixes removed, containing only the 5-character product ID
ALTER TABLE order_lines 
ADD COLUMN IF NOT EXISTS sonance_prod_trans TEXT;

