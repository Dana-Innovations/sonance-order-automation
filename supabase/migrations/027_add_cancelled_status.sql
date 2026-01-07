-- Add Cancelled status for orders
INSERT INTO order_statuses (status_code, status_name, description, sort_order) VALUES
    ('06', 'CANCELLED', 'Order has been cancelled', 6)
ON CONFLICT (status_code) DO NOTHING;

