-- Create CSRs (Customer Service Representatives) table
-- Primary key is email address
CREATE TABLE IF NOT EXISTS csrs (
    email VARCHAR(255) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    teams_id VARCHAR(255),
    slack_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on names for searching
CREATE INDEX IF NOT EXISTS idx_csrs_name ON csrs(last_name, first_name);

-- Add comment to table
COMMENT ON TABLE csrs IS 'Customer Service Representatives - users who manage customer orders';
COMMENT ON COLUMN csrs.email IS 'Primary identifier - CSR email address';
COMMENT ON COLUMN csrs.teams_id IS 'Microsoft Teams user ID for notifications';
COMMENT ON COLUMN csrs.slack_id IS 'Slack user ID for notifications';

