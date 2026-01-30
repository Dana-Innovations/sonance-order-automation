-- =====================================================
-- Add Customer Wizard Fields to Prompt Builder Sessions
-- =====================================================
-- This migration adds fields needed for the customer
-- setup wizard to track progress and store customer data
-- =====================================================

-- Add wizard-specific columns to prompt_builder_sessions
ALTER TABLE prompt_builder_sessions
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_customer_wizard BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS wizard_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS child_accounts JSONB DEFAULT '[]';

-- Create index for faster wizard session lookups
CREATE INDEX IF NOT EXISTS idx_prompt_sessions_wizard
  ON prompt_builder_sessions(user_id, is_customer_wizard)
  WHERE is_customer_wizard = true;

-- Comments explaining the new fields
COMMENT ON COLUMN prompt_builder_sessions.customer_name IS
  'Customer name being set up (for customer wizard sessions)';

COMMENT ON COLUMN prompt_builder_sessions.is_customer_wizard IS
  'True if this session is for the customer setup wizard';

COMMENT ON COLUMN prompt_builder_sessions.wizard_step IS
  'Current step number in the wizard (0-30)';

COMMENT ON COLUMN prompt_builder_sessions.customer_data IS
  'JSONB object storing all customer form data during wizard';

COMMENT ON COLUMN prompt_builder_sessions.child_accounts IS
  'JSONB array storing child account details for multi-account customers';

-- Example customer_data structure:
-- {
--   "customer_name": "Acme Corporation",
--   "ps_customer_id": "MULTI" or "actual-id",
--   "is_multi_account": true,
--   "sender_email": "orders@acme.com",
--   "sharepoint_folder_id": "01ABC...",
--   "csr_id": "user-uuid",
--   "default_carrier": "UPS",
--   "default_ship_via": "GROUND",
--   "default_shipto_name": "Acme Warehouse",
--   "is_active": true,
--   "copied_from_customer_id": "uuid" (optional)
-- }

-- Example child_accounts structure:
-- [
--   {
--     "ps_account_id": "12345",
--     "routing_description": "Used for California orders",
--     "display_order": 1
--   },
--   {
--     "ps_account_id": "67890",
--     "routing_description": "Used for Texas orders",
--     "display_order": 2
--   }
-- ]
