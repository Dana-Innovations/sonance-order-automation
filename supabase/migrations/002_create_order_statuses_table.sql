-- Create order_statuses lookup table
CREATE TABLE IF NOT EXISTS order_statuses (
    status_code TEXT PRIMARY KEY,
    status_name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL
);


