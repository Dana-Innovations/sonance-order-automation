-- Fix order_issue_counts view to compare actual line prices instead of pricing table
-- This ensures the price_issues_count matches what the PostOrderModal shows

DROP VIEW IF EXISTS order_issue_counts;

CREATE OR REPLACE VIEW order_issue_counts AS
SELECT
  o.id AS order_id,
  o.cust_order_number,

  -- Count invalid items: lines with SKU but no matching product in customer pricing
  COUNT(DISTINCT CASE
    WHEN ol.line_status = 'active'
      AND COALESCE(ol.validated_sku, ol.sonance_prod_sku, ol.cust_product_sku) IS NOT NULL
      AND cpp.product_id IS NULL
    THEN ol.id
  END) AS invalid_items_count,

  -- Count price issues: compare customer price vs actual Sonance line price (what gets sent to PeopleSoft)
  -- This matches the logic in PostOrderModal for consistency
  COUNT(DISTINCT CASE
    WHEN ol.line_status = 'active'
      AND ol.cust_unit_price IS NOT NULL
      AND ol.sonance_unit_price IS NOT NULL
      AND ABS(ol.cust_unit_price - ol.sonance_unit_price) / ol.cust_unit_price * 100 > 0.01
    THEN ol.id
  END) AS price_issues_count

FROM orders o
LEFT JOIN order_lines ol ON ol.cust_order_number = o.cust_order_number
LEFT JOIN customer_product_pricing cpp ON (
  cpp.ps_customer_id = o.ps_customer_id
  AND cpp.product_id = COALESCE(ol.validated_sku, ol.sonance_prod_sku, ol.cust_product_sku)
  AND cpp.uom = COALESCE(ol.sonance_uom, 'EA')
)
GROUP BY o.id, o.cust_order_number;

-- Grant access to authenticated users
GRANT SELECT ON order_issue_counts TO authenticated;
GRANT SELECT ON order_issue_counts TO service_role;

-- Add comment for documentation
COMMENT ON VIEW order_issue_counts IS
'Efficiently calculates invalid_items_count and price_issues_count for each order. Price issues compare customer PO price vs actual Sonance line price (what gets sent to PeopleSoft).';
