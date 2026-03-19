-- ============================================================
-- ROLLBACK for Migration 061: Orders List View
-- ============================================================

DROP VIEW IF EXISTS v_orders_list;
DROP VIEW IF EXISTS order_issue_counts;

-- Drop indexes (only the ones we added)
DROP INDEX IF EXISTS idx_customers_ps_customer_id;
DROP INDEX IF EXISTS idx_child_accounts_child_ps;
DROP INDEX IF EXISTS idx_order_lines_cust_order_num;
DROP INDEX IF EXISTS idx_orders_status_created;
DROP INDEX IF EXISTS idx_orders_ps_customer_id;
DROP INDEX IF EXISTS idx_orders_csr_id;
DROP INDEX IF EXISTS idx_orders_customername;
