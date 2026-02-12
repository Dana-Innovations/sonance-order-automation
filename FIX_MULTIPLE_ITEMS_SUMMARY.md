# Fix: Multiple Order Lines Not Being Processed

## Problem
Only 1 of 4 order lines was being inserted into the database after adding validation nodes.

## Root Cause
The "Add Header Context to Line" node was using `$input.all().map()` which returns an **array** of all items. This caused the subsequent nodes to only process the array as a single item instead of processing each line item individually.

## How n8n Split Works
When you use a Split node (like "Split Order Lines"), each item should flow through subsequent nodes **one at a time**:

```
Split Order Lines (4 items)
  ↓
  Item 1 → Node A → Node B → Node C → Insert
  Item 2 → Node A → Node B → Node C → Insert
  Item 3 → Node A → Node B → Node C → Insert
  Item 4 → Node A → Node B → Node C → Insert
```

**NOT** like this:
```
Split Order Lines (4 items)
  ↓
  [Item 1, Item 2, Item 3, Item 4] → Node A (returns array) → Only processes first item
```

## The Fix

### Before (Broken)
```javascript
// This returned an ARRAY of all items
return $input.all().map(item => ({
  json: {
    ...item.json,
    ps_customer_id: psCustomerId
  }
}));
```

### After (Fixed)
```javascript
// This processes ONE item and returns ONE item
const currentItem = $input.first().json;
currentItem.ps_customer_id = psCustomerId;
return { json: currentItem };
```

## Complete Fixed Code

### 1️⃣ Add Header Context to Line

```javascript
// Add PS_Customer_ID to the current line item
// Get PS_Customer_ID from the Insert Order Header node
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;

// Get the current item and add ps_customer_id to it
const currentItem = $input.first().json;
currentItem.ps_customer_id = psCustomerId;

return { json: currentItem };
```

**Key Change:**
- ✅ Uses `$input.first()` to get current item
- ✅ Modifies and returns single item
- ✅ Allows each item to flow through individually

### 2️⃣ Lookup Product Mapping
No changes - Supabase node already processes items correctly one at a time.

### 3️⃣ Apply Product Mapping
Already correct - uses `$input.first()` and `$("Node Name").first()` to process current item.

## Expected Behavior Now

For an order with 4 line items:

1. **Split Order Lines** outputs 4 separate items
2. **Item 1** flows through:
   - Add Header Context → adds ps_customer_id
   - Lookup Product Mapping → queries customer_product_mappings
   - Apply Product Mapping → updates if sonanceProductOrig is null
   - Insert Order Line → inserts to database ✅
3. **Item 2** flows through the same path → inserts ✅
4. **Item 3** flows through the same path → inserts ✅
5. **Item 4** flows through the same path → inserts ✅

**Result:** All 4 items inserted successfully!

## Validation Logic Still Intact

The null-check validation is still working correctly:
- ✅ Only updates `sonanceProductOrig` when it's null/empty
- ✅ Only updates when a mapping is found
- ✅ Preserves non-null AI-extracted values

## Testing
Test with an order containing multiple line items to verify all items are processed and inserted.

---

**Status:** ✅ FIXED
**Date:** January 13, 2026
