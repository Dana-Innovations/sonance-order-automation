# N8N Workflow Update Instructions (UPDATED FOR YOUR WORKFLOW)

## Overview
This guide walks you through updating your n8n workflow to automatically enrich order line pricing at creation time.

**Workflow ID:** `WiJuy1l0UxdVNWQI`
**Workflow Name:** OrderEntryAutomation

**Your Current Workflow Structure:**
1. Split Order Lines → (items flow one-at-a-time through nodes)
2. **"Validate Products Against Mapping Table"** → Checks customer_product_mappings
3. **"Validate Products against Prod Pricing Table"** → Checks customer_product_pricing (**WE'RE UPDATING THIS ONE**)
4. "Insert Order Line" → Inserts into database

---

## ✅ Step 1: Backup Your Current Workflow

**IMPORTANT:** Always backup before making changes!

1. Log into n8n.cloud
2. Open the OrderEntryAutomation workflow
3. Click the **"⋯"** menu (top right)
4. Select **"Download"**
5. Save as `workflow-backup-YYYY-MM-DD.json`

---

## 🔧 Step 2: Update the "Validate Products against Prod Pricing Table" Node

### 2.1 Locate the Correct Code Node

1. Open your workflow in n8n
2. Find the node named: **"Validate Products against Prod Pricing Table"**
   - This is the SECOND validation node (after "Validate Products Against Mapping Table")
   - It's positioned at coordinates [4032, 288] in your workflow
   - It comes RIGHT BEFORE "Insert Order Line"

### 2.2 Replace the Code

1. Double-click the **"Validate Products against Prod Pricing Table"** node
2. **Select all existing code** (Ctrl+A or Cmd+A)
3. Open the file: **`n8n-enhanced-validation-PER-ITEM-VERSION.js`** (in this directory)
4. **Copy all contents** from that file
5. **Paste** into the n8n Code node (replacing the old code)

### 2.3 Verify the Supabase Key

The code already includes your Supabase key:
```javascript
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZnR3d2lyY2tzbWhldnprcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzIxNTMsImV4cCI6MjA4MjAwODE1M30.7a5JX1ZM4uHiGS8uTfO42DVsgk2gREkBWuvVWnNpsv8';
```

This is the same key from your existing code, so no changes needed.

### 2.4 What Changed in the Code?

**Added:**
- Fetches `dfi_price`, `uom`, `is_default_uom` from customer_product_pricing
- UOM matching logic (exact match → default UOM → NULL)
- Three new output fields: `sonance_quantity`, `sonance_unit_price`, `sonance_uom`

**Kept:**
- All existing validation logic
- Same Supabase credentials
- Same per-item processing structure
- Skips already-validated items

---

## 📊 Step 3: Update the "Insert Order Line" Node

### 3.1 Locate the Insert Node

1. In the same workflow, find the **"Insert Order Line"** node
2. ID: `insert-line`
3. Position: [4304, 288]
4. This is a Supabase node that inserts into the `order_lines` table

### 3.2 Add Three New Column Mappings

1. Double-click the "Insert Order Line" node
2. Scroll down to the **"Columns"** section
3. You should see existing columns already mapped

### 3.3 Add Column #1: sonance_quantity

1. Click **"Add Column"**
2. Set **Column Name:** `sonance_quantity`
3. Set **Match Column:** `Map Each Column Manually`
4. Set **Value:** `={{ $json.sonance_quantity }}`

### 3.4 Add Column #2: sonance_unit_price

1. Click **"Add Column"** again
2. Set **Column Name:** `sonance_unit_price`
3. Set **Match Column:** `Map Each Column Manually`
4. Set **Value:** `={{ $json.sonance_unit_price }}`

### 3.5 Add Column #3: sonance_uom

1. Click **"Add Column"** again
2. Set **Column Name:** `sonance_uom`
3. Set **Match Column:** `Map Each Column Manually`
4. Set **Value:** `={{ $json.sonance_uom }}`

### 3.6 Save the Insert Node

1. Click **"Save"** to close the node editor
2. The three new columns should now appear in the node configuration

---

## 🧪 Step 4: Test the Workflow

### 4.1 Execute a Test Run

1. Click **"Execute Workflow"** at the bottom of the n8n editor
2. Or use a test webhook/email to trigger the workflow

### 4.2 Check the Output

1. Click on the **"Validate Products against Prod Pricing Table"** node after execution
2. View the **output** tab
3. You should now see these NEW fields in the output:
   ```json
   {
     "...existing fields...",
     "sonance_quantity": 10,
     "sonance_unit_price": 112.50,
     "sonance_uom": "EA"
   }
   ```

### 4.3 Verify Database Records

1. Go to Supabase → Table Editor → order_lines
2. Find the test order you just processed
3. Check that these fields are populated:
   - ✅ `sonance_quantity` (should match customer quantity)
   - ✅ `sonance_unit_price` (should have negotiated price if found)
   - ✅ `sonance_uom` (should have matched UOM if found)

---

## ✅ Step 5: Verification Checklist

Run through this checklist to ensure everything works:

- [ ] Backup workflow exported successfully
- [ ] Code updated in "Validate Products against Prod Pricing Table" node
- [ ] Three new columns added to "Insert Order Line" node
- [ ] Test execution completed without errors
- [ ] Output shows sonance_quantity, sonance_unit_price, sonance_uom fields
- [ ] Database records show populated sonance_* fields
- [ ] Orders with exact UOM match get correct pricing
- [ ] Orders without exact match use default UOM
- [ ] Orders without pricing remain NULL (no errors)
- [ ] Web portal shows NO automatic price updates when viewing orders

---

## 🐛 Troubleshooting

### Issue: Fields still showing NULL in database

**Solution:** Check column mappings.
- Verify the three new columns are added to Insert Order Line node
- Verify the expressions use `$json.sonance_*` format
- Check n8n execution output to see if enrichment actually happened

### Issue: "Cannot read property 'sonance_quantity' of undefined"

**Solution:** Make sure you updated the correct node.
- You should update "Validate Products against Prod Pricing Table" (the SECOND validation node)
- NOT "Validate Products Against Mapping Table" (the first one)

### Issue: Prices not matching expected values

**Solution:** Check UOM matching logic.
- View node output to see which UOM was selected
- Verify customer_product_pricing table has correct data
- Check that currency_code matches (USD, CAD, etc.)

### Issue: Some items get pricing, some don't

**Expected behavior!** This is correct:
- Items validated in first pass (mapping table) → enriched with mapped product's pricing
- Items validated in second pass (pricing table) → enriched with direct pricing
- Items not validated → NULL values (no pricing data)

---

## 🔄 Rollback Instructions

If you need to revert the changes:

1. Go to n8n workflow
2. Click **"⋯"** menu → **"Import from File"**
3. Select your backup JSON file
4. Confirm the import
5. Your workflow will be restored to the pre-update state

---

## 📋 Summary of Changes

### What Changed:

1. **OrderLinesTable.tsx** (Web Portal) ✅ DONE
   - Removed automatic price updates when viewing orders
   - Historical pricing now preserved

2. **"Validate Products against Prod Pricing Table"** Node (N8N) ⏳ TO DO
   - Extended to fetch pricing during validation
   - Implements UOM matching (exact → default → NULL)
   - Outputs sonance_quantity, sonance_unit_price, sonance_uom

3. **"Insert Order Line"** Node (N8N) ⏳ TO DO
   - Added three new column mappings
   - Inserts enriched pricing data at creation time

### Expected Behavior:

- **New orders:** Automatically enriched with pricing at creation
- **Historical orders:** Pricing unchanged (preserved as-is)
- **Manual edits:** Still work through the web portal
- **Validation failures:** Gracefully handle missing pricing (NULL values)

### UOM Matching Priority:

1. **Exact match:** Customer UOM = Pricing table UOM → Use that record
2. **Default UOM:** No exact match → Use record where `is_default_uom = true`
3. **NULL:** No match found → Leave pricing fields as NULL (no arbitrary fallback)

---

## 📞 Next Steps

After completing these updates:

1. ✅ Process a few test orders
2. ✅ Monitor for any errors in n8n execution logs
3. ✅ Verify web portal displays enriched data correctly
4. ✅ Confirm no automatic price updates occur when viewing orders
5. ✅ Document any edge cases discovered

**Files in this directory:**
- `n8n-enhanced-validation-PER-ITEM-VERSION.js` - **USE THIS FILE** (per-item version)
- `n8n-enhanced-validation-code.js` - (batch version - NOT for your workflow)
- `N8N_WORKFLOW_UPDATE_INSTRUCTIONS_UPDATED.md` - This file (updated instructions)

**Good luck with the update!** 🚀
