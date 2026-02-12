# N8N Workflow Update Instructions

## Overview
This guide walks you through updating your n8n workflow to automatically enrich order line pricing at creation time.

**Workflow ID:** `WiJuy1l0UxdVNWQI`
**Workflow Name:** OrderEntryAutomation

---

## ✅ Step 1: Backup Your Current Workflow

**IMPORTANT:** Always backup before making changes!

1. Log into n8n.cloud
2. Open the OrderEntryAutomation workflow
3. Click the **"⋯"** menu (top right)
4. Select **"Download"**
5. Save as `workflow-backup-YYYY-MM-DD.json`

---

## 🔧 Step 2: Update the Validation Function Node

### 2.1 Locate the Function Node

1. Open your workflow in n8n
2. Find the Function node that comes **after "Split Order Lines"**
3. This is the node that currently validates product SKUs

### 2.2 Replace the Code

1. Double-click the Function node to open it
2. **Select all existing code** (Ctrl+A or Cmd+A)
3. Open the file: `n8n-enhanced-validation-code.js` (in this directory)
4. **Copy all contents** from that file
5. **Paste** into the n8n Function node (replacing the old code)

### 2.3 Update the Supabase Key

⚠️ **CRITICAL:** Find this line in the code:
```javascript
const supabaseKey = 'YOUR_SUPABASE_KEY'; // ⚠️ REPLACE WITH YOUR ACTUAL KEY
```

Replace `'YOUR_SUPABASE_KEY'` with your actual Supabase service role key.

**Where to find your key:**
- Go to Supabase Dashboard → Project Settings → API
- Copy the **"service_role"** key (NOT the anon key)

### 2.4 Save the Function Node

1. Click **"Save"** in the node editor
2. The node should now show the updated code

---

## 📊 Step 3: Update the "Insert Order Line" Node

### 3.1 Locate the Insert Node

1. In the same workflow, find the **"Insert Order Line"** node
2. This is a Supabase node that inserts into the `order_lines` table

### 3.2 Add Three New Column Mappings

1. Double-click the "Insert Order Line" node
2. Scroll down to the **"Columns"** section
3. You should see existing columns already mapped

### 3.3 Add Column #1: sonance_quantity

1. Click **"Add Column"**
2. Set **Column Name:** `sonance_quantity`
3. Set **Match Column:** `Map Each Column Manually`
4. Set **Value:** `{{ $json.sonance_quantity }}`

### 3.4 Add Column #2: sonance_unit_price

1. Click **"Add Column"** again
2. Set **Column Name:** `sonance_unit_price`
3. Set **Match Column:** `Map Each Column Manually`
4. Set **Value:** `{{ $json.sonance_unit_price }}`

### 3.5 Add Column #3: sonance_uom

1. Click **"Add Column"** again
2. Set **Column Name:** `sonance_uom`
3. Set **Match Column:** `Map Each Column Manually`
4. Set **Value:** `{{ $json.sonance_uom }}`

### 3.6 Save the Insert Node

1. Click **"Save"** to close the node editor
2. The three new columns should now appear in the node configuration

---

## 🧪 Step 4: Test the Workflow

### 4.1 Execute a Test Run

1. Click **"Execute Workflow"** at the bottom of the n8n editor
2. Or use a test webhook to trigger the workflow with sample data

### 4.2 Check the Console Logs

1. Click on the **validation Function node** after execution
2. View the **output** tab
3. You should see log messages like:
   ```
   ═══════════════════════════════════════════════════════════
   ENHANCED VALIDATION WITH PRICING ENRICHMENT
   Processing X line items
   Customer: XXXXX | Currency: USD

   Line 1: CUST-SKU-123
     AI extracted SKU: "96089"
     Customer qty: 10, UOM: EA
     Step 1: Checking pricing table
     ✅ Valid SKU! Found 2 UOM record(s)
     🎯 UOM Match: Customer UOM "EA" matched
     💰 Enriched: qty=10, price=112.50, uom=EA
   ```

### 4.3 Verify Database Records

1. Go to Supabase → Table Editor → order_lines
2. Find the test order you just processed
3. Check that these fields are populated:
   - ✅ `sonance_quantity` (should match customer quantity)
   - ✅ `sonance_unit_price` (should have negotiated price)
   - ✅ `sonance_uom` (should have matched UOM)

---

## ✅ Step 5: Verification Checklist

Run through this checklist to ensure everything works:

- [ ] Backup workflow exported successfully
- [ ] Function node code updated with correct Supabase key
- [ ] Three new columns added to Insert Order Line node
- [ ] Test execution completed without errors
- [ ] Console logs show "Enriched: qty=X, price=Y, uom=Z" messages
- [ ] Database records show populated sonance_* fields
- [ ] Orders with exact UOM match get correct pricing
- [ ] Orders without exact match use default UOM
- [ ] Orders without pricing remain NULL (no errors)

---

## 🐛 Troubleshooting

### Issue: "Cannot read property 'json' of undefined"

**Solution:** The workflow execution order may be incorrect.
- Ensure the Function node runs AFTER "Split Order Lines"
- Ensure it runs BEFORE "Insert Order Line"

### Issue: "Unauthorized" or API errors

**Solution:** Check your Supabase key.
- Make sure you're using the **service_role** key, not anon key
- Verify the key is correctly pasted (no extra spaces)

### Issue: Fields still showing NULL in database

**Solution:** Check column mappings.
- Verify the three new columns are added to Insert Order Line node
- Verify the expressions use `$json.sonance_*` format
- Check n8n execution output to see if enrichment actually happened

### Issue: Prices not matching expected values

**Solution:** Check UOM matching logic.
- View console logs to see which UOM was selected
- Verify customer_product_pricing table has correct data
- Check that currency_code matches (USD, CAD, etc.)

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

1. **OrderLinesTable.tsx** (Web Portal)
   - ✅ Removed automatic price updates when viewing orders
   - ✅ Historical pricing now preserved

2. **N8N Function Node** (Validation)
   - ✅ Extended to fetch pricing during validation
   - ✅ Implements UOM matching (exact → default → NULL)
   - ✅ Populates sonance_quantity, sonance_unit_price, sonance_uom

3. **N8N Insert Order Line Node**
   - ✅ Added three new column mappings
   - ✅ Inserts enriched pricing data at creation time

### Expected Behavior:

- **New orders:** Automatically enriched with pricing at creation
- **Historical orders:** Pricing unchanged (preserved as-is)
- **Manual edits:** Still work through the web portal
- **Validation failures:** Gracefully handle missing pricing (NULL values)

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review n8n execution logs for error messages
3. Verify database schema matches expectations
4. Check that customer_product_pricing table has data

**Files in this directory:**
- `n8n-enhanced-validation-code.js` - The code to paste into n8n Function node
- `N8N_WORKFLOW_UPDATE_INSTRUCTIONS.md` - This file
- `C:\Users\KeithH\.claude\plans\glittery-crunching-hickey.md` - Full implementation plan

---

## Next Steps

After completing these updates:

1. ✅ Process a few test orders
2. ✅ Monitor for any errors in n8n execution logs
3. ✅ Verify web portal displays enriched data correctly
4. ✅ Confirm no automatic price updates occur when viewing orders
5. ✅ Document any edge cases discovered

**Good luck with the update!** 🚀
