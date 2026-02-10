-- CUTOVER MIGRATION - DO NOT RUN UNTIL SYNC IS VALIDATED
-- This migration switches the application to use the synced pricing table
-- Prerequisites:
--   1. Sync has run successfully for at least 7 days
--   2. No errors in pricing_sync_log
--   3. Data validation queries show expected results
--   4. Spot-checks confirm pricing accuracy

-- Backup old table (for safety)
ALTER TABLE customer_product_pricing RENAME TO customer_product_pricing_backup;

-- Rename new table to production name
ALTER TABLE customer_pricing_sync RENAME TO customer_product_pricing;

-- Rename indexes to match original names
ALTER INDEX idx_customer_pricing_sync_unique RENAME TO idx_customer_product_pricing_unique;
ALTER INDEX idx_customer_pricing_sync_customer RENAME TO idx_customer_product_pricing_customer;
ALTER INDEX idx_customer_pricing_sync_product RENAME TO idx_customer_product_pricing_product;
ALTER INDEX idx_customer_pricing_sync_brand RENAME TO idx_customer_product_pricing_brand;

-- Update table comment
COMMENT ON TABLE customer_product_pricing IS 'Customer-specific product pricing synced nightly from PeopleSoft SQL Server';

-- After 30 days of successful operation, drop backup with:
-- DROP TABLE IF EXISTS customer_product_pricing_backup;
