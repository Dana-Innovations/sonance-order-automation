# Fixing PDF Content Reference in n8n Agent Step

## Problem
The agent step is receiving an empty "PDF Content:" section because the PDF data extracted from the Extract PDF node is not correctly referenced in the agent's prompt.

## Solution

In your **Agent** (or AI Agent) node, you need to properly reference the PDF text extracted by the Extract PDF node in your prompt.

### Step 1: Identify the Extract PDF Node Name
First, note the name of your Extract PDF node (e.g., "Extract PDF", "Extract PDF Text", etc.).

### Step 2: Update the Agent Prompt

In your Agent node's prompt/system message, update the "PDF Content:" section to reference the extracted text. Here are the correct ways to reference it:

#### Option A: Reference from Previous Node (If Extract PDF is Directly Before Agent)
```
PDF Content:
{{ $json.text }}
```

#### Option B: Reference by Node Name (Recommended if nodes are not directly connected)
```
PDF Content:
{{ $('Extract PDF').item.json.text }}
```

**Important:** Replace `'Extract PDF'` with the actual name of your Extract PDF node (case-sensitive).

#### Option C: If Using Multiple Attachments or Loop
If you're processing multiple PDFs or using a loop:
```
PDF Content:
{{ $json.text || $json.data || $json.pdfText }}
```

### Step 3: Complete Example Agent Prompt

Here's an example of how your complete agent prompt should look:

```
You are an order processing assistant. Extract order information from the following:

Email Subject: {{ $json.subject || $('Get Emails').item.json.subject }}
Email From: {{ $json.from || $('Get Emails').item.json.from }}
Email Body: {{ $json.html || $json.text || $('Get Emails').item.json.body }}

PDF Content:
{{ $('Extract PDF').item.json.text }}

Please extract the following information from the PDF and return it as structured JSON:
- Order Number / Purchase Order Number
- Order Date
- Ship-to Address
- Currency Code
- Line Items (Product SKU, Product Model, Quantity, UOM, Unit Price, Line Total)
```

### Step 4: Verify the Data Path

To verify what data is available after the Extract PDF node:

1. **Temporarily add a Code node** after Extract PDF
2. Use this code to inspect the output:
   ```javascript
   return {
     json: $input.item.json,
     binaryKeys: Object.keys($input.item.binary || {}),
     allData: $input.all()
   };
   ```
3. Run the workflow to see what data structure is available
4. Adjust your agent prompt expression based on the actual structure

### Common Data Paths After Extract PDF Node

- **Text content**: `$json.text`
- **Page count**: `$json.pageCount`
- **Metadata**: `$json.metadata`
- **Full content**: `$json` (entire object)

### Troubleshooting

**If `$json.text` is empty:**
1. Verify the Extract PDF node successfully processed the PDF (check node execution logs)
2. Ensure the PDF actually contains extractable text (not just images)
3. Check the Extract PDF node's "Options" - you may need to enable OCR for scanned PDFs

**If the expression doesn't resolve:**
1. Use the expression helper in n8n (click the `{{ }}` button in the prompt field)
2. Browse available data from previous nodes
3. Make sure node names in expressions match exactly (case-sensitive)

**If you're using a Loop node:**
When processing multiple items in a loop, use:
```
PDF Content:
{{ $json.text }}
```
This will reference the current item in the loop context.

### Alternative: Pass PDF Text as Context Variable

If the direct reference doesn't work, you can use a Set node between Extract PDF and Agent:

1. **Add a Set node** after Extract PDF
2. Configure it to:
   - **Mode**: "Keep Only Set Fields"
   - **Add field**: 
     - **Name**: `pdfText`
     - **Value**: `={{ $json.text }}`
3. In your Agent node, reference it as: `{{ $json.pdfText }}`

## Quick Reference: n8n Expression Syntax

- `$json.text` - Current node's JSON text property
- `$('Node Name').item.json.text` - Reference specific node's output
- `$input.item.json.text` - Current item's JSON text
- `$binary.data` - Binary data from current node

