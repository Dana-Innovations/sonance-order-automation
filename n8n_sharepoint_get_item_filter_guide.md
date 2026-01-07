# n8n SharePoint: Filter Get Items to Find Recently Uploaded File

## Problem
After uploading a file to SharePoint, you need the list item ID to update metadata. The upload node doesn't return the list item ID, so you need to use a "Get SharePoint Items" node to retrieve it.

## Solution: Filter Get SharePoint Items Node

### Step 1: Identify What Data is Available from Upload Step

The SharePoint "Upload File" node typically outputs:
- `name` or `fileName` - The name of the uploaded file
- `webUrl` - The web URL of the file
- `id` - The file ID (not the list item ID)
- `createdDateTime` - When the file was created

**To check what's available:**
1. Add a temporary "Code" node after your Upload step
2. Use: `return $input.item.json;` to see all available fields

### Step 2: Configure Get SharePoint Items Node

In your **Get SharePoint Items** node, configure the filter to match the file you just uploaded.

#### Option 1: Filter by File Name (Recommended)

This is the most reliable method if the filename is unique:

1. **Operation**: Get Many
2. **Return All**: `false`
3. **Limit**: `1`
4. **Filters** section:
   - **Field**: `Name` (or `FileLeafRef` depending on your SharePoint version)
   - **Operator**: `eq` (equals)
   - **Value**: `={{ $json.name || $json.fileName || $json.displayName }}`
     - Adjust the path based on what your Upload node outputs
     - Common paths: `$json.name`, `$json.fileName`, `$json.displayName`

**Example Expression:**
```
={{ $json.name }}
```

#### Option 2: Filter by Created Date/Time (If filename might not be unique)

If multiple files could have the same name, filter by the most recent creation:

1. **Filters** section:
   - **Field**: `Created`
   - **Operator**: `ge` (greater than or equal)
   - **Value**: `={{ $now.minus({minutes: 5}).toISO() }}`
     - This gets items created in the last 5 minutes
     - Adjust the time window as needed

2. **Additional Filter** (combine with filename):
   - **Field**: `Name`
   - **Operator**: `eq`
   - **Value**: `={{ $json.name }}`

#### Option 3: Filter by File ID (If available)

If your Upload node returns a file ID that can be used:

1. **Filters** section:
   - **Field**: `FileSystemObjectType` (to ensure it's a file)
   - **Operator**: `eq`
   - **Value**: `0`
   
2. **Additional Filter**:
   - **Field**: `UniqueId` or `Id`
   - **Operator**: `eq`
   - **Value**: `={{ $json.id }}` (adjust path as needed)

### Step 3: Extract the List Item ID

After the Get SharePoint Items node executes, the output will contain the list item ID.

**The list item ID is typically in:**
- `{{ $json.id }}` - The list item ID
- `{{ $json.Id }}` - Alternative field name
- `{{ $json.GUID }}` - Sometimes the GUID is used

**To use it in subsequent nodes:**
1. In your next node (e.g., Update SharePoint Item), reference:
   ```
   {{ $json.id }}
   ```
   or
   ```
   {{ $json.Id }}
   ```

### Complete Example Configuration

**Get SharePoint Items Node Settings:**

```
Operation: Get Many
Return All: false
Limit: 1
Filters:
  - Field: Name
    Operator: eq
    Value: ={{ $json.name }}
```

**Then in your Update SharePoint Item node:**
- **Item ID**: `={{ $json.id }}` (from the Get SharePoint Items output)

### Troubleshooting

**If the filter doesn't return results:**

1. **Check the field name**: SharePoint field names can vary. Common names:
   - `Name`
   - `FileLeafRef`
   - `Title`
   - `LinkFilename`

2. **Check the value from Upload node**:
   - Add a Code node after Upload: `return $input.item.json;`
   - Verify the exact field name and value

3. **Try a broader filter first**:
   - Filter by Created date in last 10 minutes
   - Then manually check which item matches

4. **Check SharePoint list settings**:
   - Ensure the field you're filtering on is indexed (for performance)
   - Some fields may not be filterable

### Alternative: Use OData Filter Expression

If the standard filters don't work, you can use an OData filter expression:

**In the "Additional Options" or "Filter" field:**
```
Name eq '{{ $json.name }}'
```

Or for date filtering:
```
Created ge {{ $now.minus({minutes: 5}).toISO() }}
```

### Best Practice: Combine Filters

For maximum reliability, combine filename and date:

```
Filters:
  Filter 1:
    Field: Name
    Operator: eq
    Value: ={{ $json.name }}
  
  Filter 2:
    Field: Created
    Operator: ge
    Value: ={{ $now.minus({minutes: 5}).toISO() }}
```

This ensures you get the exact file you just uploaded, even if there are multiple files with similar names.












