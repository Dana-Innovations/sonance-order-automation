-- Insert initial order statuses
INSERT INTO order_statuses (status_code, status_name, description, sort_order) VALUES
    ('01', 'NEW', 'Order has been imported but not yet reviewed', 1),
    ('02', 'REVIEWED NO CHANGES', 'Order has been reviewed and no changes were made', 2),
    ('03', 'REVIEWED WITH CHANGES', 'Order has been reviewed and changes were made', 3),
    ('04', 'CONFIRMED FOR UPLOAD', 'Order has been confirmed and is ready for upload to PeopleSoft', 4),
    ('05', 'UPLOAD PEOPLESOFT SUCCESSFUL', 'Order has been successfully uploaded to PeopleSoft', 5)
ON CONFLICT (status_code) DO NOTHING;


