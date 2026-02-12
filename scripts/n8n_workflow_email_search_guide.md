# n8n Workflow Update: Searching for Emails in Semicolon-Separated Fields

## Quick Start: Update Your Get Records Node

**To update your "Get Records" node after the "Get Emails" node:**

1. Open your Supabase "Get Records" node in n8n
2. In the **Filters** section, configure:
   - **Field**: `sender_email`
   - **Operator**: `ilike`
   - **Value**: `%{{ $json.from.address || $json.from }}%`
     (This will match emails in semicolon-separated lists like "email1@test.com;email2@test.com")
3. Optionally add a second filter for active customers:
   - **Field**: `is_active`
   - **Operator**: `eq`
   - **Value**: `true`

The `ilike` operator with `%email%` pattern will search for the sender email anywhere in the `sender_email` field, even if it's part of a semicolon-separated list.

## Overview
The `sender_email` field in the `customers` table now supports multiple email addresses separated by semicolons. This guide explains how to update your n8n workflow to search for a sender's email address within these semicolon-separated values.

## Database Changes
A migration has been created (`014_support_multiple_emails_per_customer.sql`) that:
1. Removes the UNIQUE constraint from `sender_email` to allow multiple emails per customer
2. Creates a helper function `email_exists_in_list()` for searching within semicolon-separated email values

## Updating Your n8n Workflow

### Option 1: Using Supabase "Execute Query" Node (Recommended)

In your n8n workflow, replace the Supabase "Get Record" node with a "Execute Query" node, or modify your existing node to use the "Execute Query" operation.

**Query to use:**
```sql
SELECT * 
FROM customers 
WHERE email_exists_in_list(sender_email, {{$json.from}})
AND is_active = true
LIMIT 1
```

Where `{{$json.from}}` is the email address from the Outlook email node (adjust the path based on your workflow structure - it might be `{{$json.from.address}}` or similar).

### Option 2: Using "Get Records" Node with ILIKE Filter (Simpler, works with existing node)

To update your existing "Get Records" node that comes after the "Get Emails" node:

**Step-by-step configuration:**

1. In your Supabase "Get Records" node, go to the **Filters** section
2. Add or update a filter with the following settings:
   - **Field**: `sender_email`
   - **Operator**: `ilike` (case-insensitive LIKE pattern matching)
   - **Value**: Use an expression to wrap the sender email address with wildcards:
     ```
     %{{ $json.from.address || $json.from || $json.senderEmail }}%
     ```
     (Adjust the path based on your email node output structure - common paths are `$json.from.address`, `$json.from`, or `$json.senderEmail`)

3. **Optionally add a second filter** to only get active customers:
   - **Field**: `is_active`
   - **Operator**: `eq` (equals)
   - **Value**: `true`

4. Set **Return All** to `false` and **Limit** to `1` if you only need one matching customer

**Example filter configuration in n8n:**
```
Filter 1:
- Field: sender_email
- Operator: ilike
- Value: %{{ $json.from.address }}%

Filter 2:
- Field: is_active  
- Operator: eq
- Value: true
```

**How this works:**
- The `ilike` operator performs case-insensitive pattern matching
- `%email@example.com%` will match:
  - `email@example.com` (exact match)
  - `email@example.com;backup@example.com` (contains the email)
  - `primary@example.com;email@example.com;secondary@example.com` (contains the email anywhere)
- This works with semicolon-separated emails because the pattern will match if the email appears anywhere in the string

**Note:** This approach works well for exact email addresses. The pattern matching is case-insensitive and will correctly find emails in semicolon-separated lists.

### Option 3: Using Raw SQL with Expression

If your Supabase node supports raw SQL expressions, you can use:

```sql
SELECT * FROM customers 
WHERE email_exists_in_list(sender_email, '{{$json.from}}') 
AND is_active = true
LIMIT 1
```

## Example Email Format in Database

The `sender_email` field can now contain:
- Single email: `customer@example.com`
- Multiple emails: `customer@example.com;backup@example.com;support@example.com`

## Testing

To test the query in Supabase SQL editor:
```sql
-- Test with a single email
SELECT * FROM customers 
WHERE email_exists_in_list(sender_email, 'test@example.com');

-- Test with multiple emails in the field
-- If sender_email contains: "email1@test.com;email2@test.com;email3@test.com"
SELECT * FROM customers 
WHERE email_exists_in_list(sender_email, 'email2@test.com');
```

## Important Notes

1. The `email_exists_in_list()` function performs **exact, case-insensitive matching** on trimmed email addresses
2. Emails in the database should be separated by semicolons (`;`) only
3. Whitespace around emails will be trimmed automatically
4. Make sure to apply the migration `014_support_multiple_emails_per_customer.sql` to your database before updating the workflow

