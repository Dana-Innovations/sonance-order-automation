# n8n PDF Extraction Troubleshooting Guide

## Error
```
"This operation expects the node's input data to contain a binary file 'data', but none was found [item 0]"
```

## Root Cause
The **Extract PDF** node expects a binary property named `data`, but the email trigger node outputs attachments with different property names (e.g., `attachment_0`, `attachment_1`, or the filename).

## Solution Options

### Solution 1: Configure Extract PDF to Use the Correct Binary Property Name (Recommended)

1. **Open your Extract PDF node** in n8n
2. **Check the "Input Binary Field" parameter**
   - By default, it's set to `data`
   - Change it to match the actual binary property name from your email node

3. **To find the correct property name:**
   - Add a temporary "Code" node or "Set" node between your email node and Extract PDF
   - Use it to inspect the output: `{{ $json }}` or `{{ Object.keys($binary) }}`
   - Look for binary properties like:
     - `attachment_0` (if using IMAP Email Trigger with `downloadAttachments: true`)
     - `data` (if using Microsoft Outlook with attachments)
     - The actual filename of the PDF attachment

4. **Update the Extract PDF node:**
   - Set **Input Binary Field** to the correct property name (e.g., `attachment_0`)

### Solution 2: Ensure Email Trigger Downloads Attachments

**For IMAP Email Trigger:**
1. Open your Email Trigger (IMAP) node
2. **Enable "Download Attachments"** checkbox
3. **Set Format** to "Simple" (required for downloadAttachments)
4. Ensure the workflow includes handling for multiple attachments if needed

**For Microsoft Outlook Trigger:**
1. The Outlook trigger should automatically include attachments in the binary data
2. Verify the trigger's output format includes attachment data
3. You may need to add a Microsoft Outlook node after the trigger to explicitly download the attachment

### Solution 3: Use a Set Node to Rename the Binary Property

If you want to keep using `data` as the property name:

1. **Add a "Set" node** between your email node and Extract PDF node
2. Configure it to:
   - **Operation**: "Keep Only Set Fields"
   - Add a field:
     - **Name**: `data` (binary)
     - **Value**: `={{ $binary.attachment_0 }}` (or whatever the actual property name is)

3. This will rename the binary property from `attachment_0` to `data`

### Solution 4: Use Microsoft Outlook Node to Download Attachment Explicitly

If using Microsoft Outlook Trigger:

1. **Add a "Microsoft Outlook" node** after your trigger
2. **Operation**: "Get Attachment"
3. **Message ID**: `={{ $json.id }}` (from the trigger)
4. **Attachment ID**: `={{ $json.attachments[0].id }}` (for the first attachment)
5. This will output the attachment as binary data that can be used by Extract PDF

## Common Binary Property Names by Email Node Type

### IMAP Email Trigger
- **Format: Simple** + **Download Attachments: true**
  - Binary properties: `attachment_0`, `attachment_1`, etc. (indexed)
- **Format: Resolved**
  - Binary properties: Uses "Property Prefix Name" setting (default: `attachment_0`, `attachment_1`)

### Microsoft Outlook Trigger
- Binary properties: Typically `data` or the attachment filename
- May require additional Microsoft Outlook node to download

## Quick Fix Steps

1. **Check what binary properties are available:**
   - Temporarily add a Code node: `return Object.keys($input.item.json.binary || {});`
   
2. **If you see `attachment_0` or similar:**
   - Update Extract PDF node's "Input Binary Field" to `attachment_0`
   
3. **If no binary properties exist:**
   - Enable "Download Attachments" in your email trigger node
   - Or add a Microsoft Outlook node to explicitly download the attachment

4. **Test the workflow** after making changes

## Additional Notes

- The Extract PDF node's **Input Binary Field** parameter is configurable specifically for this purpose
- If you have multiple PDF attachments, you may need to loop through them using a Split In Batches or Loop Over Items node
- Make sure the email actually contains a PDF attachment before the Extract PDF node

