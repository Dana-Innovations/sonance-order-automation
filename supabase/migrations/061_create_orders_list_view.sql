-- ============================================================
-- Migration 061: Create v_orders_list view + fix order_issue_counts
-- 
-- Purpose: Eliminate N+1 queries on the orders list page by
-- joining all related data in a single database view.
-- Also recreates order_issue_counts using customer_pricing_sync.
--
-- Rollback: Run 061_create_orders_list_view_ROLLBACK.sql
-- ============================================================

-- Step 1: Recreate order_issue_counts view using customer_pricing_sync
CREATE OR REPLACE VIEW order_issue_counts AS
SELECT
  o.id AS order_id,
  o.cust_order_number,
  COUNT(DISTINCT CASE
    WHEN ol.line_status = 'active'
      AND COALESCE(ol.validated_sku, ol.sonance_prod_sku, ol.cust_product_sku) IS NOT NULL
      AND cps.product_id IS NULL
    THEN ol.id
  END) AS invalid_items_count,
  COUNT(DISTINCT CASE
    WHEN ol.line_status = 'active'
      AND ol.cust_unit_price IS NOT NULL
      AND ol.cust_unit_price > 0
      AND cps.net_price IS NOT NULL
      AND ABS(ol.cust_unit_price - cps.net_price) / ol.cust_unit_price * 100 > 0.01
    THEN ol.id
  END) AS price_issues_count
FROM orders o
LEFT JOIN order_lines ol ON ol.cust_order_number = o.cust_order_number
LEFT JOIN customer_pricing_sync cps ON (
  cps.cust_id = o.ps_customer_id
  AND cps.product_id = COALESCE(ol.validated_sku, ol.sonance_prod_sku, ol.cust_product_sku)
  AND cps.unit_of_measure = COALESCE(ol.sonance_uom, ol.cust_uom, 'EA')
)
GROUP BY o.id, o.cust_order_number;

GRANT SELECT ON order_issue_counts TO authenticated;
GRANT SELECT ON order_issue_counts TO service_role;

-- Step 2: Create the main orders list view
CREATE OR REPLACE VIEW v_orders_list AS
SELECT
  o.*,
  -- Customer name: prefer customers table, fall back to child account parent
  COALESCE(c.customer_name, pc.customer_name, o.customername) AS resolved_customer_name,
  -- Status name from order_statuses
  os.status_name,
  -- CSR full name
  CASE WHEN csr.email IS NOT NULL 
    THEN TRIM(CONCAT(csr.first_name, ' ', csr.last_name))
    ELSE NULL 
  END AS csr_name,
  -- Order total from line items (exclude cancelled lines)
  COALESCE(lt.total_amount, 0) AS total_amount,
  -- Issue counts
  COALESCE(ic.invalid_items_count, 0) AS invalid_items_count,
  COALESCE(ic.price_issues_count, 0) AS price_issues_count
FROM orders o
-- Join customer name (direct match)
LEFT JOIN customers c ON c.ps_customer_id = o.ps_customer_id
-- Join customer name via child accounts (fallback)
LEFT JOIN customer_child_accounts cca ON cca.child_ps_account_id = o.ps_customer_id AND c.customer_id IS NULL
LEFT JOIN customers pc ON pc.customer_id = cca.parent_customer_id
-- Join status
LEFT JOIN order_statuses os ON os.status_code = o.status_code
-- Join CSR
LEFT JOIN csrs csr ON csr.email = o.csr_id
-- Join line totals (aggregated subquery)
LEFT JOIN (
  SELECT cust_order_number, SUM(cust_line_total) AS total_amount
  FROM order_lines
  WHERE line_status != 'cancelled' OR line_status IS NULL
  GROUP BY cust_order_number
) lt ON lt.cust_order_number = o.cust_order_number
-- Join issue counts
LEFT JOIN order_issue_counts ic ON ic.order_id = o.id;

GRANT SELECT ON v_orders_list TO authenticated;
GRANT SELECT ON v_orders_list TO service_role;

COMMENT ON VIEW v_orders_list IS 'Pre-joined orders view for the orders list page — eliminates N+1 queries';

-- Step 3: Add indexes to support the view joins efficiently
CREATE INDEX IF NOT EXISTS idx_customers_ps_customer_id ON customers(ps_customer_id);
CREATE INDEX IF NOT EXISTS idx_child_accounts_child_ps ON customer_child_accounts(child_ps_account_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_cust_order_num ON order_lines(cust_order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_ps_customer_id ON orders(ps_customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_csr_id ON orders(csr_id);
CREATE INDEX IF NOT EXISTS idx_orders_customername ON orders(customername);
