# SharePoint Get Item Filter Solution

## Problem
The SharePoint "Get Uploaded File Item" node is failing with a 500 error when using OData filters with n8n expressions.

## Root Cause
SharePoint OData filters may not properly evaluate n8n expressions when they're embedded in the filter string. The filter needs to be a properly formatted OData query string.

## Solution Options

### Option 1: Check if Upload Returns Item ID (Best)
The SharePoint Upload node might return the list item ID directly. Check the Upload node output:
- Look for `id` field - this might be the list item ID
- Look for `listItem` field - this might contain the item information
- If found, use "Get" operation instead of "Get All" with filter

### Option 2: Use Code Node to Construct Filter
Add a Code node after Upload to construct the filename, then use it in the filter:

**Code Node:**
```javascript
const psCustomerId = $('AI Agent: Extract Order Data').item.json.output.PS_Customer_ID;
const orderNumber = $('AI Agent: Extract Order Data').item.json.output.orderNumber;
const fileName = `${psCustomerId}-${orderNumber}.pdf`;

return [{
  json: {
    fileName: fileName
  }
}];
```

**Then in Get Uploaded File Item filter:**
```
=fields/FileLeafRef eq '{{ $json.fileName }}'
```

### Option 3: Use Date + Filename Combination
The current filter uses both date and filename. If it still fails, try:

**Filter:**
```
=Created ge {{ $now.minus({minutes: 2}).toISO() }} and fields/FileLeafRef eq 'FILENAME_HERE'
```

But construct the filename in a Set node first, then reference it.

### Option 4: Try Different Field Names
SharePoint might use different field names:
- `FileLeafRef` (current)
- `Name`
- `LinkFilename`
- `Title`

Try each one to see which works.

### Option 5: Use HTTP Request Node
As a last resort, use an HTTP Request node to call the SharePoint API directly with a properly formatted OData filter.

## Recommended Next Steps

1. **First, check what the Upload node returns:**
   - Add a temporary Code node after "Upload file"
   - Use: `return $input.item.json;`
   - Check if there's an `id` or `listItem.id` field

2. **If Upload returns an ID:**
   - Change "Get Uploaded File Item" to use "Get" operation
   - Use the ID directly: `={{ $('Upload file').item.json.id }}` or `={{ $('Upload file').item.json.listItem.id }}`

3. **If Upload doesn't return an ID:**
   - Use Option 2 (Code node to construct filename)
   - Or try Option 4 (different field names)

## Current Filter (May Need Adjustment)
The current filter is:
```
=fields/FileLeafRef eq '{{ $('AI Agent: Extract Order Data').item.json.output.PS_Customer_ID }}-{{ $('AI Agent: Extract Order Data').item.json.output.orderNumber }}.pdf'
```

If this fails, the expression evaluation inside the filter is likely the issue. Use one of the solutions above.












