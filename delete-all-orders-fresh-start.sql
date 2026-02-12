-- Clean slate: Delete all orders and start fresh
-- WARNING: This will delete ALL orders. Make sure you want to do this!

-- Step 1: Delete all order lines first (foreign key dependency)
DELETE FROM order_lines;

-- Step 2: Delete all orders
DELETE FROM orders;

-- Step 3: Verify everything is deleted
SELECT 'order_lines' as table_name, COUNT(*) as remaining_rows FROM order_lines
UNION ALL
SELECT 'orders' as table_name, COUNT(*) as remaining_rows FROM orders;

-- Expected result: Both tables should show 0 rows

-- Step 4: Now you can run the migrations cleanly
-- Run: supabase/migrations/043_create_customer_child_accounts.sql
-- Run: supabase/migrations/044_modify_orders_customer_reference.sql

-- Step 5: Set up your child accounts for the MULTI customer
-- Example:
/*
INSERT INTO customer_child_accounts
  (parent_ps_customer_id, child_ps_account_id, routing_description, display_order)
VALUES
  ('MULTI', 'CHILD_ACCT_1', 'Description of when to use this account - at least 20 characters', 1),
  ('MULTI', 'CHILD_ACCT_2', 'Another child account description - at least 20 characters here', 2);
*/

-- Step 6: When new orders arrive, they'll use the correct child account IDs
