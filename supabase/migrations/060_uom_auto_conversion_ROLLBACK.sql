-- ============================================================
-- ROLLBACK for Migration 060: UOM Auto-Conversion
-- 
-- This completely reverses migration 060:
-- 1. Drops the trigger
-- 2. Drops the trigger function
-- 3. Drops the indexes
-- 4. Removes the added columns
-- 5. Resets any converted lines back to original customer qty
--
-- Run this if testing goes badly.
-- ============================================================

-- Step 1: Drop trigger
DROP TRIGGER IF EXISTS trg_uom_auto_convert ON order_lines;

-- Step 2: Drop trigger function
DROP FUNCTION IF EXISTS fn_uom_auto_convert();

-- Step 3: Drop indexes
DROP INDEX IF EXISTS idx_order_lines_uom_flagged;
DROP INDEX IF EXISTS idx_order_lines_uom_converted;

-- Step 4: Reset any converted lines — restore sonance_quantity to cust_quantity
-- (This undoes any auto-conversions that were applied, EXCEPT manually edited ones)
UPDATE order_lines 
SET sonance_quantity = cust_quantity
WHERE uom_converted = true 
  AND qty_manually_edited = false;

-- Step 5: Remove columns
ALTER TABLE order_lines 
  DROP COLUMN IF EXISTS uom_converted,
  DROP COLUMN IF EXISTS uom_conversion_note,
  DROP COLUMN IF EXISTS uom_flagged,
  DROP COLUMN IF EXISTS qty_manually_edited;
