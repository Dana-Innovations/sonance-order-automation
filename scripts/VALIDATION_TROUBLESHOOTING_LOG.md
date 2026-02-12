# Validation Implementation Troubleshooting Log

## Issue History & Resolutions

### Issue 1: Missing $ Variables
**Error**: `SyntaxError: Unexpected token '.'`
**Cause**: API update stripped `$input` and `$node` prefixes
**Resolution**: Added back `$input` and `$node` prefixes to all variable references

### Issue 2: $input.item() Not a Function
**Error**: `TypeError: $input.item is not a function`
**Cause**: Used incorrect n8n Code node API method
**Resolution**: Changed to `$input.all().map()` and `$input.first()` which are the correct methods

### Issue 3: Cannot Read Properties of Undefined (reading 'output')
**Error**: `TypeError: Cannot read properties of undefined (reading 'output')`
**Cause**: Trying to access AI Agent node output which is not in the execution path after Split Order Lines
**Resolution**: Changed to access PS_Customer_ID from "Insert Order Header" node which IS in the execution path

## Final Working Code

### Execution Flow
```
Insert Order Header (has ps_customer_id)
    ↓
Set Line Items Array
    ↓
Split Order Lines
    ↓
Add Header Context to Line ← Gets ps_customer_id from Insert Order Header
    ↓
Lookup Product Mapping ← Uses $json.ps_customer_id from current item
    ↓
Apply Product Mapping ← Applies correction if needed
    ↓
Insert Order Line
```

### 1️⃣ Add Header Context to Line (Code Node)

```javascript
// Add PS_Customer_ID to each line item for lookup
// Get PS_Customer_ID from the Insert Order Header node (which is in execution path)
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;

// Process all input items and add ps_customer_id to each
return $input.all().map(item => ({
  json: {
    ...item.json,
    ps_customer_id: psCustomerId
  }
}));
```

**Key Points:**
- Uses `$("Insert Order Header").first().json.ps_customer_id` to get PS_Customer_ID
- Uses `$input.all().map()` to process all incoming line items
- Returns array of enriched items with ps_customer_id field added

### 2️⃣ Lookup Product Mapping (Supabase Node)

**Filters:**
```json
{
  "conditions": [
    {
      "keyName": "ps_customer_id",
      "condition": "eq",
      "keyValue": "={{ $json.ps_customer_id }}"
    },
    {
      "keyName": "cust_product_sku",
      "condition": "eq",
      "keyValue": "={{ $json.custproductsku }}"
    }
  ]
}
```

**Key Points:**
- Uses `$json.ps_customer_id` from current item (added by previous node)
- Uses `$json.custproductsku` from current item (from Split Order Lines)
- Queries customer_product_mappings table for exact match
- Returns mapping if found, or empty result if not found

### 3️⃣ Apply Product Mapping (Code Node)

```javascript
// Apply product mapping if found and sonanceProductOrig is null/empty
// Get the original line item from Add Header Context node (before Supabase lookup)
const contextItem = $("Add Header Context to Line").first().json;

// Get the current item which is the result from Supabase lookup
const currentItem = $input.first().json;

// The lookup result is in currentItem
const mapping = (currentItem && currentItem.sonance_product_sku) ? currentItem : null;

// Check if sonanceProductOrig is null/empty
const sonanceSkuEmpty = !contextItem.sonanceProductOrig ||
                        (typeof contextItem.sonanceProductOrig === 'string' &&
                         contextItem.sonanceProductOrig.trim() === "");

if (sonanceSkuEmpty && mapping && mapping.sonance_product_sku) {
  // Update with mapped value from customer_product_mappings table
  contextItem.sonanceProductOrig = mapping.sonance_product_sku;
  contextItem.mappingSource = "customer_product_mappings";
  contextItem.mappingConfidence = mapping.confidence_score || 1.0;
  contextItem.mappingTimesUsed = mapping.times_used || 0;
} else {
  // Keep original value (could be from AI extraction or still null)
  contextItem.mappingSource = sonanceSkuEmpty ? "none" : "ai_extraction";
}

// Remove temporary ps_customer_id field
delete contextItem.ps_customer_id;

return { json: contextItem };
```

**Key Points:**
- Gets original line item from "Add Header Context to Line" node
- Gets Supabase lookup result from current item
- Only updates if sonanceProductOrig is null/empty AND mapping exists
- Adds metadata fields: mappingSource, mappingConfidence, mappingTimesUsed
- Removes temporary ps_customer_id field before returning

## n8n Code Node API Reference

### Correct Methods:
- `$input.all()` - Returns array of all input items
- `$input.first()` - Returns first input item
- `$(nodeName).first()` - Returns first item from named node
- `$(nodeName).all()` - Returns all items from named node

### Incorrect Methods (Don't Use):
- ❌ `$input.item()` - Does not exist
- ❌ `$node["Name"]` - Use `$("Name")` instead in Code nodes

## Validation Logic Guarantee

The code **ONLY updates** `sonanceProductOrig` when ALL these conditions are met:

1. ✅ Original value is `null`, `undefined`, empty string `""`, or whitespace
2. ✅ A mapping was found in `customer_product_mappings` table
3. ✅ The mapping has a non-empty `sonance_product_sku` value

**If ANY condition fails, the original value is preserved.**

## Testing Checklist

- [ ] Order with null Sonance SKU + existing mapping → Should populate from mapping
- [ ] Order with null Sonance SKU + no mapping → Should remain null with mappingSource: "none"
- [ ] Order with valid AI-extracted SKU → Should keep original with mappingSource: "ai_extraction"
- [ ] Order with whitespace-only SKU → Should be treated as null and populate from mapping
- [ ] Multiple line items in one order → Each should be processed independently

## Status

✅ **READY FOR TESTING**

All validation nodes are now correctly configured with proper n8n syntax and execution path references.

---

**Last Updated**: January 13, 2026
**Workflow ID**: WiJuy1l0UxdVNWQI
**Total Nodes**: 29
