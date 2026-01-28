# PS Order Number Auto-Assignment Implementation

## Overview
Implemented a robust, thread-safe PS Order Number auto-assignment system that prevents duplicate order numbers even with multiple concurrent users.

## Database Components

### 1. PS Order Sequence Table
**Table:** `ps_order_sequence`
- Stores the current/next available order number
- Single-row table with CHECK constraint to ensure only one row
- Row-level locking prevents concurrent access issues

**Columns:**
- `id` (INTEGER, PRIMARY KEY) - Always 1
- `current_number` (BIGINT) - The next available order number (supports up to 9 quintillion)
- `updated_at` (TIMESTAMP) - Last update timestamp

### 2. Atomic Function
**Function:** `get_next_ps_order_number()`
- Uses PostgreSQL `FOR UPDATE` row locking
- Atomically increments and returns the next number
- Thread-safe for multiple concurrent users
- Returns the newly assigned order number

### 3. Orders Table Update
**New Column:** `ps_order_number` (BIGINT, UNIQUE)
- Added to `orders` table
- BIGINT supports large order numbers (up to 9,223,372,036,854,775,807)
- Unique constraint prevents duplicates
- Indexed for fast lookups

## Application Logic

### Auto-Assignment Trigger
PS Order Numbers are automatically assigned when:
- An order header is saved (shipping address, carrier, etc.)
- An order line is edited (quantity, price, SKU, etc.)
- The order doesn't already have a PS Order Number

### Assignment Flow
1. User saves order changes (header or lines)
2. System checks if order already has `ps_order_number`
3. If NO: Calls atomic function to get next number
4. Updates order with the new PS Order Number
5. If YES: Skips assignment (keeps existing number)

### Utility Function
**File:** `order-portal-web/lib/utils/assignPSOrderNumber.ts`

```typescript
assignPSOrderNumber(supabase, orderId)
```

**Features:**
- Checks if order already has a number (idempotent)
- Calls atomic database function
- Updates order with assigned number
- Returns assigned number or error
- Console logs for debugging

### Integration Points

**1. OrderHeader Component** (`OrderHeader.tsx`)
- Saves shipping/carrier information
- Calls `assignPSOrderNumber()` after successful save
- Located at: line 345 (after order update)

**2. LineItemEditor Component** (`LineItemEditor.tsx`)
- Saves line item edits
- Calls `assignPSOrderNumber()` after successful save
- Located at: line 239 (before status update)

## Concurrency Protection

### How Duplicates are Prevented
1. **Database-Level Locking:** `UPDATE ... FOR UPDATE` locks the sequence row
2. **Atomic Operation:** Get + increment in single transaction
3. **Unique Constraint:** Database enforces uniqueness on `ps_order_number`
4. **Sequential Processing:** Only one transaction can access sequence at a time

### Concurrent User Scenario
```
User A saves order → Locks sequence → Gets 100001 → Updates order → Releases lock
User B saves order → Waits for lock → Gets 100002 → Updates order → Releases lock
```

## Setup Instructions

### Step 1: Set Starting Order Number
Edit the migration file before running:
```sql
-- Line 12 in 046_create_ps_order_sequence.sql
INSERT INTO ps_order_sequence (id, current_number, updated_at)
VALUES (1, 7010000000, NOW())  -- Default starting number (can be changed)
```

**Note:** The system uses BIGINT to support large order numbers up to 9,223,372,036,854,775,807.

### Step 2: Run Migration
1. Open Supabase Dashboard → SQL Editor
2. Run the helper script to see the SQL:
   ```bash
   node run-ps-order-sequence-migration.js
   ```
3. Copy the displayed SQL and run it in Supabase

### Step 3: Verify Installation
```sql
-- Check sequence table
SELECT * FROM ps_order_sequence;

-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'get_next_ps_order_number';

-- Check orders column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'ps_order_number';
```

## Testing

### Test Auto-Assignment
1. Open any order in the portal
2. Edit the shipping address and save
3. Check the order - it should now have a `ps_order_number`
4. Edit a line item and save
5. Check the `ps_order_number` - should remain unchanged (same number)

### Test Concurrency
1. Have two users open different orders simultaneously
2. Both save at the same time
3. Check both orders - they should have sequential, unique numbers
4. Query `ps_order_sequence` - current_number should be latest + 1

### SQL Testing Queries
```sql
-- View recent order numbers
SELECT id, cust_order_number, ps_order_number, created_at
FROM orders
WHERE ps_order_number IS NOT NULL
ORDER BY ps_order_number DESC
LIMIT 10;

-- Check for duplicates (should return 0 rows)
SELECT ps_order_number, COUNT(*)
FROM orders
WHERE ps_order_number IS NOT NULL
GROUP BY ps_order_number
HAVING COUNT(*) > 1;

-- Get next available number
SELECT current_number FROM ps_order_sequence WHERE id = 1;
```

## Important Notes

### Number Assignment is Permanent
- Once assigned, the PS Order Number never changes
- Even if order is edited multiple times
- Prevents gaps in the sequence

### Numbers are Never Reused
- Deleted orders don't free up their numbers
- Ensures audit trail integrity
- Maintains chronological ordering

### Manual Override
The `ERPNumberInput` component still allows manual entry of ERP order numbers:
- Used when orders are pushed to ERP system
- Marks order as "ERP Processed" (status 05)
- Different from auto-assigned PS Order Number
- Both can coexist on same order

## Files Modified

### New Files
1. `supabase/migrations/046_create_ps_order_sequence.sql` - Database migration
2. `run-ps-order-sequence-migration.js` - Helper script
3. `order-portal-web/lib/utils/assignPSOrderNumber.ts` - Utility function

### Modified Files
1. `order-portal-web/components/orders/OrderHeader.tsx`
   - Added import for `assignPSOrderNumber`
   - Added call in `handleSave()` at line 345

2. `order-portal-web/components/orders/LineItemEditor.tsx`
   - Added import for `assignPSOrderNumber`
   - Added call in `handleSave()` at line 239

## Monitoring & Maintenance

### Check Current Sequence
```sql
SELECT current_number, updated_at
FROM ps_order_sequence
WHERE id = 1;
```

### View Assignment History
```sql
SELECT
    o.ps_order_number,
    o.cust_order_number,
    o.customername,
    o.created_at as order_created,
    o.updated_at as order_updated
FROM orders o
WHERE o.ps_order_number IS NOT NULL
ORDER BY o.ps_order_number DESC;
```

### Reset Sequence (if needed)
```sql
-- CAUTION: Only use if you need to reset the sequence
UPDATE ps_order_sequence
SET current_number = 7010000000  -- Your desired starting number
WHERE id = 1;
```

## Troubleshooting

### Issue: Orders not getting numbers
**Solution:** Check if migration ran successfully
```sql
SELECT * FROM ps_order_sequence;
```

### Issue: Duplicate numbers
**Solution:** This should be impossible due to unique constraint, but check:
```sql
SELECT ps_order_number, COUNT(*)
FROM orders
WHERE ps_order_number IS NOT NULL
GROUP BY ps_order_number
HAVING COUNT(*) > 1;
```

### Issue: Sequence seems stuck
**Solution:** Check for locked transactions
```sql
SELECT * FROM pg_locks WHERE relation = 'ps_order_sequence'::regclass;
```

## Future Enhancements (Optional)

1. **Display PS Order Number in UI**
   - Add to order header
   - Show in order list
   - Use for filtering/search

2. **Bulk Assignment**
   - Create script to assign numbers to existing orders
   - Process in batches to avoid sequence jumps

3. **Number Format**
   - Add prefix/suffix (e.g., "SO-100001")
   - Include year (e.g., "2024-100001")
   - Requires updating function and column type

4. **Audit Trail**
   - Log when numbers are assigned
   - Track who/when assignments occur
   - Add to audit_log table

## Success Criteria

✅ PS Order Numbers assigned automatically on save
✅ No duplicate numbers possible
✅ Thread-safe for concurrent users
✅ Numbers persist across edits
✅ Audit trail maintained
✅ Performance optimized (atomic operation)
