-- Add city, state, zip to customer_child_accounts and remove ai_mapping_instructions
ALTER TABLE customer_child_accounts
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state VARCHAR(10),
  ADD COLUMN IF NOT EXISTS zip VARCHAR(20),
  DROP COLUMN IF EXISTS ai_mapping_instructions;
