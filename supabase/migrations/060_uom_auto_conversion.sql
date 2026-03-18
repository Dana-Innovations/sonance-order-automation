-- ============================================================
-- Migration 060: UOM Auto-Conversion on Order Line Insert
-- 
-- Purpose: When customer UOM (EA) differs from Sonance UOM 
-- (6PK, PR, 10PK, etc.), automatically adjust sonance_quantity
-- using the ea_conv factor from units_of_measure table.
--
-- Rollback: Run 060_uom_auto_conversion_ROLLBACK.sql
-- ============================================================

-- Step 1: Add new columns to order_lines
ALTER TABLE order_lines 
  ADD COLUMN IF NOT EXISTS uom_converted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS uom_conversion_note TEXT,
  ADD COLUMN IF NOT EXISTS uom_flagged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS qty_manually_edited BOOLEAN DEFAULT false;

COMMENT ON COLUMN order_lines.uom_converted IS 'True when sonance_quantity was auto-adjusted due to UOM mismatch';
COMMENT ON COLUMN order_lines.uom_conversion_note IS 'Human-readable note of the conversion applied (e.g. 6 EA → 1 6PK)';
COMMENT ON COLUMN order_lines.uom_flagged IS 'True when customer qty did not divide evenly by ea_conv (rounded up)';
COMMENT ON COLUMN order_lines.qty_manually_edited IS 'True when operator manually changed sonance_quantity — prevents auto-conversion on updates';

-- Step 2: Create the trigger function
CREATE OR REPLACE FUNCTION fn_uom_auto_convert()
RETURNS TRIGGER AS $$
DECLARE
  v_ea_conv NUMERIC;
  v_new_qty NUMERIC;
  v_is_flagged BOOLEAN := false;
  v_note TEXT;
BEGIN
  -- Only fire when:
  -- 1. Customer UOM is EA (case-insensitive)
  -- 2. Sonance UOM is NOT EA and is not null
  -- 3. qty_manually_edited is not true
  IF UPPER(COALESCE(NEW.cust_uom, '')) = 'EA'
     AND UPPER(COALESCE(NEW.sonance_uom, '')) <> 'EA'
     AND COALESCE(NEW.sonance_uom, '') <> ''
     AND COALESCE(NEW.qty_manually_edited, false) = false
  THEN
    -- Look up conversion factor
    SELECT ea_conv INTO v_ea_conv
    FROM units_of_measure
    WHERE UPPER(uom_code) = UPPER(NEW.sonance_uom)
      AND ea_conv IS NOT NULL
      AND ea_conv > 0;

    -- If we found a conversion factor, apply it
    IF v_ea_conv IS NOT NULL THEN
      -- Check if division is even
      IF MOD(COALESCE(NEW.cust_quantity, 0), v_ea_conv) <> 0 THEN
        v_is_flagged := true;
      END IF;

      -- Calculate new qty (CEIL for rounding up)
      v_new_qty := CEIL(COALESCE(NEW.cust_quantity, 0) / v_ea_conv);

      -- Build note
      v_note := COALESCE(NEW.cust_quantity, 0)::TEXT || ' EA → ' || v_new_qty::TEXT || ' ' || NEW.sonance_uom || ' (factor: ' || v_ea_conv::TEXT || ')';

      -- Apply changes
      NEW.sonance_quantity := v_new_qty;
      NEW.uom_converted := true;
      NEW.uom_conversion_note := v_note;
      NEW.uom_flagged := v_is_flagged;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create the trigger (BEFORE INSERT so we can modify the row)
DROP TRIGGER IF EXISTS trg_uom_auto_convert ON order_lines;

CREATE TRIGGER trg_uom_auto_convert
  BEFORE INSERT ON order_lines
  FOR EACH ROW
  EXECUTE FUNCTION fn_uom_auto_convert();

-- Step 4: Add index for flagged lines (for easy operator review)
CREATE INDEX IF NOT EXISTS idx_order_lines_uom_flagged 
  ON order_lines(uom_flagged) WHERE uom_flagged = true;

CREATE INDEX IF NOT EXISTS idx_order_lines_uom_converted 
  ON order_lines(uom_converted) WHERE uom_converted = true;
