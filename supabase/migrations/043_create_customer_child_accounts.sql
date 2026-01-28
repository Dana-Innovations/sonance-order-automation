-- Create customer_child_accounts table for multi-account customer management
CREATE TABLE IF NOT EXISTS customer_child_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_ps_customer_id VARCHAR(18) NOT NULL REFERENCES customers(ps_customer_id) ON DELETE CASCADE,
    child_ps_account_id VARCHAR(18) NOT NULL UNIQUE,
    routing_description TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_routing_description_length CHECK (char_length(routing_description) >= 20),
    CONSTRAINT unique_child_account_per_parent UNIQUE(parent_ps_customer_id, child_ps_account_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_child_accounts_parent ON customer_child_accounts(parent_ps_customer_id);
CREATE INDEX IF NOT EXISTS idx_child_accounts_child ON customer_child_accounts(child_ps_account_id);

-- Create trigger for updated_at
CREATE TRIGGER update_customer_child_accounts_updated_at
    BEFORE UPDATE ON customer_child_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment explaining the table
COMMENT ON TABLE customer_child_accounts IS 'Stores child PeopleSoft account IDs for multi-account customers (parent ps_customer_id = MULTI)';
COMMENT ON COLUMN customer_child_accounts.parent_ps_customer_id IS 'References the parent customer (typically MULTI)';
COMMENT ON COLUMN customer_child_accounts.child_ps_account_id IS 'The actual PeopleSoft account ID used in orders';
COMMENT ON COLUMN customer_child_accounts.routing_description IS 'Describes when to use this account (used by AI routing logic)';
COMMENT ON COLUMN customer_child_accounts.display_order IS 'Display order in UI (1 = first)';
