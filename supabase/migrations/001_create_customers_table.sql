-- Create customers table for authorized customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    PS_customer_id VARCHAR(18) NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    sender_email TEXT NOT NULL UNIQUE,
    customer_prompt_text TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on sender_email for fast lookups
CREATE INDEX IF NOT EXISTS idx_customers_sender_email ON customers(sender_email);
-- Create index on PS_customer_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_customers_ps_customer_id ON customers(PS_customer_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


