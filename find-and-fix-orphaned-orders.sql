-- Step 1: Find orders with ps_customer_id that don't exist in customers table
SELECT DISTINCT
    o.ps_customer_id,
    COUNT(*) as order_count,
    MIN(o.order_number) as first_order,
    MAX(o.order_number) as last_order
FROM orders o
LEFT JOIN customers c ON o.ps_customer_id = c.ps_customer_id
WHERE c.ps_customer_id IS NULL
GROUP BY o.ps_customer_id
ORDER BY order_count DESC;

-- This will show you what child account IDs need to be added

-- Step 2: After identifying the accounts above, add them to customer_child_accounts
-- Replace 'MULTI' with your actual parent customer ps_customer_id
-- Replace 'CHILD_ACCOUNT_ID' with each account ID from Step 1
-- Replace the description with something meaningful

/*
INSERT INTO customer_child_accounts
  (parent_ps_customer_id, child_ps_account_id, routing_description, display_order)
VALUES
  ('MULTI', 'CHILD_ACCOUNT_ID_1', 'Description of when to use this account (min 20 chars)', 1),
  ('MULTI', 'CHILD_ACCOUNT_ID_2', 'Description of when to use this account (min 20 chars)', 2);
*/

-- Step 3: After adding child accounts, verify all orders now have valid references
SELECT
    CASE
        WHEN c.ps_customer_id IS NOT NULL THEN 'Parent Customer'
        WHEN ca.child_ps_account_id IS NOT NULL THEN 'Child Account'
        ELSE 'ORPHANED'
    END as account_type,
    COUNT(*) as order_count
FROM orders o
LEFT JOIN customers c ON o.ps_customer_id = c.ps_customer_id
LEFT JOIN customer_child_accounts ca ON o.ps_customer_id = ca.child_ps_account_id
GROUP BY account_type;

-- Step 4: Once verification shows no ORPHANED orders, you can safely add the constraint
-- Run the 044 migration again
