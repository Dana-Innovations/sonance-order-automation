-- Create orders table for order header information
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    PS_customer_id VARCHAR(18) NOT NULL REFERENCES customers(PS_customer_id) ON DELETE RESTRICT,
    order_date DATE,
    currency_code TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    address_line3 TEXT,
    city TEXT,
    state CHAR(2),
    country TEXT,
    postal_code TEXT,
    status_code TEXT NOT NULL DEFAULT '01' REFERENCES order_statuses(status_code) ON DELETE RESTRICT,
    pdf_file_path TEXT,
    email_subject TEXT,
    email_sender TEXT,
    email_received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_ps_customer_id ON orders(PS_customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_code ON orders(status_code);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


