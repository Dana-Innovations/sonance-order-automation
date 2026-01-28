-- Add AI mapping instructions field to customer_child_accounts table
ALTER TABLE customer_child_accounts
ADD COLUMN ai_mapping_instructions TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN customer_child_accounts.ai_mapping_instructions IS 'AI prompt instructions for mapping/routing orders to this specific child account';
