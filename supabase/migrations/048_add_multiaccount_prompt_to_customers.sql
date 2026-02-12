-- Add MultiAccount_Prompt column to customers table for multi-account routing logic
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS MultiAccount_Prompt TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN customers.MultiAccount_Prompt IS 'AI prompt for routing orders to correct child account. Used when PS_customer_id = MULTI. Contains default message if single-account customer.';
