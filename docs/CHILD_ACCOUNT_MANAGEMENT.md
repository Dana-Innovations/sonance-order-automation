# Child Account Management - Implementation Guide

## Overview

For multi-account customers (where `ps_customer_id = "MULTI"`), users need to manage child PeopleSoft account IDs after the customer is created.

This document covers:
1. **Copy from Existing Customer** - Wizard step 0
2. **Child Account CRUD UI** - On customer detail/edit page
3. **Database operations** - Add/remove/edit child accounts

---

## Feature 1: Copy from Existing Customer (Wizard Step 0)

### UI Design

```
┌────────────────────────────────────────────────────────┐
│ 🎉 New Customer Setup Wizard                           │
│ Getting Started                                         │
├────────────────────────────────────────────────────────┤
│                                                         │
│ How would you like to set up this customer?            │
│                                                         │
│ ┌──────────────────────────────────────────────────┐  │
│ │  ○ Start from scratch                            │  │
│ │    Create a completely new customer               │  │
│ │                                                   │  │
│ │  ○ Copy from existing customer                   │  │
│ │    Start with settings from another customer     │  │
│ └──────────────────────────────────────────────────┘  │
│                                                         │
│ [Next: Choose Setup Method →]                          │
└────────────────────────────────────────────────────────┘

↓ If user selects "Copy from existing"

┌────────────────────────────────────────────────────────┐
│ Copy from Existing Customer                             │
│ Step 0 - Select Template                               │
├────────────────────────────────────────────────────────┤
│                                                         │
│ Select a customer to copy settings from:                │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [Search customers...                           ]│   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Customer List:                                          │
│ ┌─────────────────────────────────────────────────┐   │
│ │ ○ Acme Corporation (MULTI)                      │   │
│ │   Multi-Account: 3 child accounts               │   │
│ │   Defaults: UPS Ground                          │   │
│ │   ISR: Sarah Johnson                            │   │
│ │   ✓ Has all 3 AI prompts                        │   │
│ │                                                  │   │
│ │ ○ Smith Audio (CUST-5678)                       │   │
│ │   Single Account                                │   │
│ │   Defaults: FedEx 2-Day                         │   │
│ │   ISR: Mike Chen                                │   │
│ │   ✓ Has all 3 AI prompts                        │   │
│ │                                                  │   │
│ │ ○ Tech Systems Inc (TECH-9999)                  │   │
│ │   Single Account                                │   │
│ │   No defaults set                               │   │
│ │   ISR: Emily Rodriguez                          │   │
│ │   ⚠️ Missing AI prompts                          │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ What will be copied:                                    │
│ ✓ Multi-account status & child accounts (if any)       │
│ ✓ Default carrier, ship via, ship-to name              │
│ ✓ All 3 AI prompts                                     │
│ ✓ SharePoint folder structure (you'll update ID)       │
│                                                         │
│ What you'll need to change:                             │
│ ✗ Customer name (required)                              │
│ ✗ PeopleSoft Customer ID (required if single)          │
│ ✗ Sender email addresses (required)                    │
│ ✗ SharePoint Folder ID (required)                      │
│ ✗ Assigned ISR (optional)                               │
│                                                         │
│ 💡 This saves time by reusing prompts and settings    │
│    from a similar customer.                            │
│                                                         │
│ ← Back                      [Continue with Selected →] │
└────────────────────────────────────────────────────────┘

↓ After selecting customer

┌────────────────────────────────────────────────────────┐
│ Review Copied Settings                                  │
│ Copied from: Acme Corporation                          │
├────────────────────────────────────────────────────────┤
│                                                         │
│ The following settings have been copied:               │
│                                                         │
│ ✓ Multi-Account Customer                               │
│   • Child accounts (3):                                │
│     - 12345: "California orders"                       │
│     - 67890: "Texas orders"                            │
│     - 55555: "Other states"                            │
│                                                         │
│ ✓ Default Values:                                       │
│   • Carrier: UPS                                       │
│   • Ship Via: Ground                                   │
│   • Ship-To Name: Warehouse                            │
│                                                         │
│ ✓ AI Prompts:                                           │
│   • Order Header Prompt (copied)                       │
│   • Order Line Prompt (copied)                         │
│   • Multi-Account Routing Prompt (copied)              │
│                                                         │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│ You can now:                                            │
│ • Edit any of these settings as you go through wizard  │
│ • Skip AI prompt questions (use copied prompts as-is) │
│ • Or regenerate prompts with new answers               │
│                                                         │
│ ← Back to Selection    [Start Wizard with Copied Data →]│
└────────────────────────────────────────────────────────┘
```

### Implementation Details

**API Endpoint:** `GET /api/customers/[customerId]/for-copy`

```typescript
// Returns customer data formatted for wizard pre-population
{
  customer_name: "", // Blank - must be unique
  ps_customer_id: "", // Blank if single, "MULTI" if multi
  sender_email: "", // Blank - must be unique
  sharepoint_folder_id: "", // Blank - must be unique
  csr_id: "copied-value", // Pre-filled, can change
  is_active: true,

  // Copied values (pre-filled)
  is_multi_account: true,
  child_accounts: [
    { ps_account_id: "12345", routing_description: "California orders" },
    { ps_account_id: "67890", routing_description: "Texas orders" },
    { ps_account_id: "55555", routing_description: "Other states" }
  ],
  default_carrier: "UPS",
  default_ship_via: "GROUND",
  default_shipto_name: "Warehouse",

  // AI Prompts (copied, can skip regeneration)
  order_header_prompt: "...",
  order_line_prompt: "...",
  MultiAccount_Prompt: "...",

  // Metadata
  copied_from_customer_id: "original-customer-id",
  copied_from_customer_name: "Acme Corporation",
  skip_ai_questions: false // User can toggle to skip AI section
}
```

**Wizard Flow with Copy:**

1. **Step 0a:** Choose "Start from scratch" or "Copy from existing"
2. **Step 0b:** If copy, select customer and review settings
3. **Steps 1-9:** Customer info (pre-filled where applicable)
   - Name: Blank
   - Multi-account: Pre-selected based on copied customer
   - Child accounts: Pre-filled if multi-account
   - Email: Blank
   - SharePoint: Blank
   - ISR: Pre-filled
   - Defaults: Pre-filled
4. **Step 10:** PDF upload (optional if skipping AI regeneration)
5. **Steps 11-30:** AI questions (show option to skip if prompts copied)
6. **Final:** Review and save

**Skip AI Questions Option:**

If user copied prompts and doesn't want to regenerate:
```
┌────────────────────────────────────────────────────────┐
│ AI Prompt Generation                                    │
├────────────────────────────────────────────────────────┤
│                                                         │
│ You've copied AI prompts from Acme Corporation.        │
│                                                         │
│ Choose how to handle prompts:                          │
│                                                         │
│ ○ Use copied prompts as-is                             │
│   Skip AI questions and use the prompts from           │
│   Acme Corporation without changes.                    │
│                                                         │
│ ○ Regenerate prompts with new answers                  │
│   Go through the AI questions to create new prompts    │
│   customized for this customer.                        │
│                                                         │
│ ○ Use copied prompts but allow minor edits             │
│   Use copied prompts and manually edit them if needed. │
│                                                         │
│ 💡 Recommendation: If the new customer has similar    │
│    order formats, using copied prompts saves 15+ min.  │
│                                                         │
│ [Continue →]                                            │
└────────────────────────────────────────────────────────┘
```

---

## Feature 2: Child Account Management UI

### Location: Customer Detail/Edit Page

Add a new section to the existing customer form for managing child accounts.

### UI Design - Display Mode

**On Customer Detail Page (when ps_customer_id = "MULTI"):**

```
┌────────────────────────────────────────────────────────┐
│ Customer Details: Acme Corporation                      │
├────────────────────────────────────────────────────────┤
│                                                         │
│ [Existing customer fields...]                          │
│                                                         │
│ ═══════════════════════════════════════════════════════│
│ MULTI-ACCOUNT CONFIGURATION                             │
│ ═══════════════════════════════════════════════════════│
│                                                         │
│ PeopleSoft Customer ID: MULTI                          │
│ Status: Multi-territory account                         │
│                                                         │
│ ─────────────────────────────────────────────────────  │
│ Child Accounts (3)                    [+ Add Account]  │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Account #1                           [Edit] [×] │   │
│ │ PS Account ID: 12345                            │   │
│ │ Used When: California orders (ship-to state CA) │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Account #2                           [Edit] [×] │   │
│ │ PS Account ID: 67890                            │   │
│ │ Used When: Texas orders (ship-to state TX)      │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Account #3                           [Edit] [×] │   │
│ │ PS Account ID: 55555                            │   │
│ │ Used When: All other states (default account)   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ 💡 Changes to child accounts require regenerating     │
│    the Multi-Account Routing Prompt to work correctly. │
│                                                         │
│ [Regenerate Routing Prompt]                            │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Add Child Account Modal

```
┌────────────────────────────────────────────────────────┐
│ Add Child Account                                   [×] │
├────────────────────────────────────────────────────────┤
│                                                         │
│ Customer: Acme Corporation (MULTI)                     │
│                                                         │
│ PeopleSoft Account ID *                                │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Enter PS Account ID (e.g., 99999)              │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Used When (Routing Description) *                      │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Describe when to use this account              │   │
│ │                                                  │   │
│ │ Example: "Arizona orders (ship-to state AZ)"   │   │
│ │          "Project XYZ orders"                   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ 💡 Be specific about what determines this account.    │
│    This helps the AI route orders correctly.           │
│                                                         │
│ ⚠️  After adding, you should regenerate the            │
│    Multi-Account Routing Prompt to include this        │
│    new account in the AI logic.                        │
│                                                         │
│ [Cancel]                           [Add Account]       │
└────────────────────────────────────────────────────────┘
```

### Edit Child Account Modal

```
┌────────────────────────────────────────────────────────┐
│ Edit Child Account                                  [×] │
├────────────────────────────────────────────────────────┤
│                                                         │
│ Customer: Acme Corporation (MULTI)                     │
│                                                         │
│ PeopleSoft Account ID *                                │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 12345                                           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Used When (Routing Description) *                      │
│ ┌─────────────────────────────────────────────────┐   │
│ │ California orders (ship-to state = CA)          │   │
│ │                                                  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ⚠️  Changes to routing descriptions require             │
│    regenerating the Multi-Account Routing Prompt.      │
│                                                         │
│ [Cancel]                           [Save Changes]      │
└────────────────────────────────────────────────────────┘
```

### Delete Child Account Confirmation

```
┌────────────────────────────────────────────────────────┐
│ Delete Child Account?                               [×] │
├────────────────────────────────────────────────────────┤
│                                                         │
│ ⚠️  Are you sure you want to delete this account?      │
│                                                         │
│ Account: 67890                                          │
│ Used for: Texas orders (ship-to state TX)              │
│                                                         │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│ This will:                                              │
│ • Remove this account from the customer configuration  │
│ • Require regenerating the Multi-Account Routing       │
│   Prompt (AI will no longer route to this account)     │
│                                                         │
│ ⚠️  WARNING: Any orders currently using this account   │
│    ID may fail to process correctly after deletion.    │
│                                                         │
│ 💡 Consider marking the customer inactive instead of  │
│    deleting the account if you have existing orders.   │
│                                                         │
│ [Cancel]                           [Delete Account]    │
└────────────────────────────────────────────────────────┘
```

### Regenerate Routing Prompt Flow

When user modifies child accounts, prompt to regenerate:

```
┌────────────────────────────────────────────────────────┐
│ Child Account Updated                                   │
├────────────────────────────────────────────────────────┤
│                                                         │
│ ✓ Child account successfully updated!                  │
│                                                         │
│ ⚠️  Your Multi-Account Routing Prompt is now outdated. │
│                                                         │
│ Current prompt was created for:                         │
│ • Account 12345 (California)                           │
│ • Account 67890 (Texas)                                │
│ • Account 55555 (Default)                              │
│                                                         │
│ But you now have:                                       │
│ • Account 12345 (California)                           │
│ • Account 67890 (Texas)                                │
│ • Account 88888 (Arizona) ← NEW                        │
│ • Account 55555 (Default)                              │
│                                                         │
│ What would you like to do?                             │
│                                                         │
│ ○ Regenerate routing prompt now                        │
│   Launch the AI wizard to create a new routing prompt  │
│   that includes all current accounts.                  │
│   (Recommended - Takes 5-7 minutes)                    │
│                                                         │
│ ○ Manually edit the existing prompt                    │
│   Update the prompt text yourself to include the new   │
│   account routing logic.                               │
│   (Advanced users only)                                │
│                                                         │
│ ○ Do nothing (risky)                                   │
│   Keep the old prompt. Orders won't route to the new   │
│   account correctly.                                   │
│   (Not recommended)                                    │
│                                                         │
│ [Close]                    [Regenerate Routing Prompt] │
└────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Child Account CRUD

#### 1. List Child Accounts
```typescript
GET /api/customers/[customerId]/child-accounts

Response:
{
  success: true,
  child_accounts: [
    {
      id: "uuid",
      customer_ps_id: "MULTI",
      child_ps_account_id: "12345",
      routing_description: "California orders",
      display_order: 1,
      created_at: "2026-01-26T10:00:00Z",
      updated_at: "2026-01-26T10:00:00Z"
    },
    ...
  ]
}
```

#### 2. Add Child Account
```typescript
POST /api/customers/[customerId]/child-accounts

Request:
{
  child_ps_account_id: "88888",
  routing_description: "Arizona orders (ship-to state AZ)"
}

Response:
{
  success: true,
  child_account: {
    id: "uuid",
    customer_ps_id: "MULTI",
    child_ps_account_id: "88888",
    routing_description: "Arizona orders (ship-to state AZ)",
    display_order: 4,
    created_at: "2026-01-26T11:00:00Z"
  },
  prompt_outdated: true, // Indicates routing prompt needs regeneration
  message: "Child account added. Please regenerate routing prompt."
}
```

#### 3. Update Child Account
```typescript
PATCH /api/customers/[customerId]/child-accounts/[accountId]

Request:
{
  child_ps_account_id?: "88888", // Optional
  routing_description?: "Updated description" // Optional
}

Response:
{
  success: true,
  child_account: { ... },
  prompt_outdated: true
}
```

#### 4. Delete Child Account
```typescript
DELETE /api/customers/[customerId]/child-accounts/[accountId]

Response:
{
  success: true,
  message: "Child account deleted",
  prompt_outdated: true,
  remaining_accounts_count: 3
}
```

#### 5. Reorder Child Accounts
```typescript
POST /api/customers/[customerId]/child-accounts/reorder

Request:
{
  account_ids: ["uuid1", "uuid2", "uuid3"] // New order
}

Response:
{
  success: true,
  message: "Child accounts reordered"
}
```

---

## Database Operations

### Table: `customer_child_accounts`

Already defined in main plan. Key operations:

#### Insert Child Account
```sql
INSERT INTO customer_child_accounts (
  customer_ps_id,
  child_ps_account_id,
  routing_description,
  display_order
)
VALUES ($1, $2, $3, $4)
RETURNING *;
```

#### Update Child Account
```sql
UPDATE customer_child_accounts
SET
  child_ps_account_id = COALESCE($1, child_ps_account_id),
  routing_description = COALESCE($2, routing_description),
  updated_at = NOW()
WHERE id = $3 AND customer_ps_id = $4
RETURNING *;
```

#### Delete Child Account
```sql
DELETE FROM customer_child_accounts
WHERE id = $1 AND customer_ps_id = $2
RETURNING *;
```

#### Check Account Usage (Before Delete)
```sql
-- Check if any orders are using this child account
SELECT COUNT(*) as order_count
FROM orders
WHERE ps_customer_id = $1 -- The child account ID
  AND created_at > NOW() - INTERVAL '90 days';
-- If order_count > 0, show warning to user
```

#### Reorder Accounts
```sql
-- Update display_order for each account
UPDATE customer_child_accounts
SET display_order = CASE id
  WHEN $1 THEN 1
  WHEN $2 THEN 2
  WHEN $3 THEN 3
  ELSE display_order
END
WHERE customer_ps_id = $4;
```

---

## Validation Rules

### Adding Child Account
- ✓ `child_ps_account_id` is required
- ✓ `child_ps_account_id` must be unique within customer
- ✓ `routing_description` is required (min 20 chars)
- ✓ Customer must have `ps_customer_id = "MULTI"`
- ✓ Maximum 10 child accounts per customer

### Updating Child Account
- ✓ Cannot change to duplicate `child_ps_account_id`
- ✓ `routing_description` min 20 chars if provided
- ✓ Must own the child account (customer_ps_id matches)

### Deleting Child Account
- ✓ Must have at least 2 child accounts remaining (enforce minimum)
- ⚠️ Warn if recent orders exist using this account
- ✓ Must own the child account

---

## Integration with Existing Customer Form

### Update CustomerForm.tsx

Add new section after AI Prompts section:

```tsx
// Only show if ps_customer_id === "MULTI"
{formData.ps_customer_id === 'MULTI' && (
  <div className="pt-4 border-t border-gray-200">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-[#333F48]">
          Multi-Account Configuration
        </h3>
        <p className="text-xs text-[#6b7a85] mt-1">
          Manage child PeopleSoft account IDs and routing rules
        </p>
      </div>
      <button
        type="button"
        onClick={handleAddChildAccount}
        className="py-1.5 text-xs font-medium"
        style={{
          border: '1px solid #00A3E1',
          borderRadius: '20px',
          backgroundColor: 'white',
          color: '#00A3E1',
          paddingLeft: '16px',
          paddingRight: '16px'
        }}
      >
        + Add Account
      </button>
    </div>

    {/* Child Accounts List */}
    <ChildAccountsList
      customerId={customer?.ps_customer_id}
      onUpdate={handleChildAccountsChange}
    />

    {/* Warning about prompt regeneration */}
    {childAccountsModified && (
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-xs text-yellow-800">
          ⚠️ Child accounts have been modified. Consider regenerating
          the Multi-Account Routing Prompt to ensure orders route correctly.
        </p>
        <button
          type="button"
          onClick={handleRegenerateRoutingPrompt}
          className="mt-2 text-xs text-blue-600 underline"
        >
          Regenerate Routing Prompt
        </button>
      </div>
    )}
  </div>
)}
```

### Create ChildAccountsList Component

```tsx
// components/settings/ChildAccountsList.tsx
interface ChildAccountsListProps {
  customerId: string
  onUpdate: () => void
}

export function ChildAccountsList({ customerId, onUpdate }: ChildAccountsListProps) {
  // Fetch child accounts
  // Display in cards
  // Handle edit/delete actions
  // Show drag handles for reordering
}
```

---

## User Flow Examples

### Example 1: Creating Multi-Account Customer from Scratch

1. Click "New Customer Wizard"
2. Choose "Start from scratch"
3. Enter customer name: "New Corp"
4. Select "Yes" for multi-account
5. PS ID auto-set to "MULTI"
6. Add 3 child accounts with descriptions
7. Continue through wizard
8. Generate routing prompt with 5 questions
9. Save customer
10. ✓ Customer created with 3 child accounts

### Example 2: Copying from Existing Customer

1. Click "New Customer Wizard"
2. Choose "Copy from existing customer"
3. Search and select "Acme Corporation"
4. Review copied settings (3 child accounts, prompts, etc.)
5. Continue to wizard
6. Change customer name to "New Corp West"
7. Keep multi-account status
8. Edit child account #1 description
9. Skip AI questions (use copied prompts)
10. Save customer
11. ✓ Customer created with copied + edited settings

### Example 3: Adding Child Account After Setup

1. Navigate to customer detail page for "Acme Corporation"
2. Scroll to "Multi-Account Configuration" section
3. Click "+ Add Account" button
4. Enter PS Account ID: "88888"
5. Enter description: "Arizona orders (ship-to state AZ)"
6. Click "Add Account"
7. See warning: "Routing prompt outdated"
8. Click "Regenerate Routing Prompt"
9. Answer 5 routing questions (now including Arizona account)
10. Generate new routing prompt
11. ✓ Child account added and routing prompt updated

### Example 4: Removing Child Account

1. View customer with 4 child accounts
2. Click [×] on account #3
3. See warning: "Account used in 12 recent orders"
4. Choose to continue deletion
5. Click "Delete Account"
6. See prompt to regenerate routing prompt
7. Either regenerate or manually edit prompt
8. ✓ Child account removed

---

## Cursor Implementation Prompts

### Implement Copy from Existing Customer

```
Add "Copy from Existing Customer" feature to wizard:

1. Create Step 0 before customer info:
   - Radio buttons: "Start from scratch" or "Copy from existing"
   - If copy selected, show customer search/select modal

2. Customer selection modal:
   - Search bar (filter by name)
   - List all customers with key info:
     * Name and PS ID
     * Multi-account status
     * Default values
     * ISR assigned
     * Prompt availability (checkmarks or warnings)
   - Select button for each

3. Copy logic:
   - Fetch customer data via API: GET /api/customers/[id]/for-copy
   - Pre-populate wizard form with copied values:
     * is_multi_account → Pre-select radio
     * child_accounts → Pre-fill array
     * defaults → Pre-fill fields
     * prompts → Store for later
   - Leave blank: name, ps_customer_id (if single), email, sharepoint_folder_id

4. Show "Copied from" indicator throughout wizard:
   - Header badge: "Copied from: Acme Corporation"
   - Pre-filled fields marked with icon

5. AI Questions skip option:
   - Before AI section, show modal:
     "Use copied prompts or regenerate?"
   - If skip, go straight to review
   - If regenerate, go through questions as normal

6. Review screen shows:
   - What was copied
   - What was changed
   - Copied prompt source

Create API endpoint: /api/customers/[id]/for-copy
Returns customer data formatted for wizard initialization.
```

### Implement Child Account Management UI

```
Add child account management to customer detail page:

1. Add new section after AI Prompts (only if ps_customer_id = "MULTI"):
   - Section title: "Multi-Account Configuration"
   - Display: "PeopleSoft Customer ID: MULTI"
   - Status badge: "Multi-territory account"

2. Child accounts list:
   - Fetch from: GET /api/customers/[id]/child-accounts
   - Display each in a card:
     * Account number as heading
     * PS Account ID (large, prominent)
     * Routing description (smaller text)
     * [Edit] and [×] buttons
   - Show count: "Child Accounts (3)"
   - [+ Add Account] button in header

3. Add Child Account modal:
   - Two fields:
     * PS Account ID (text input, required)
     * Routing description (textarea, required, min 20 chars)
   - Validation:
     * Check uniqueness within customer
     * Show error if duplicate
   - On save:
     * POST /api/customers/[id]/child-accounts
     * Show success message
     * Show "regenerate prompt" suggestion
     * Refresh list

4. Edit Child Account modal:
   - Similar to add, but pre-filled
   - PATCH /api/customers/[id]/child-accounts/[accountId]
   - Warning about prompt regeneration

5. Delete Child Account confirmation:
   - Warning modal with:
     * Account details
     * Impact explanation
     * Usage check (orders using this account)
   - On confirm:
     * DELETE /api/customers/[id]/child-accounts/[accountId]
     * Show "regenerate prompt" modal
     * Refresh list

6. Regenerate prompt button:
   - Shows if childAccountsModified = true
   - Links to prompt regeneration wizard
   - Passes customer context

Create component: components/settings/ChildAccountsManagement.tsx
Create API routes: /api/customers/[id]/child-accounts/*
```

### Create Child Accounts API Routes

```
Create CRUD API routes for child accounts:

1. GET /api/customers/[customerId]/child-accounts/route.ts
   - Verify customer exists and ps_customer_id = "MULTI"
   - Query customer_child_accounts table
   - Order by display_order ASC
   - Return array of child accounts

2. POST /api/customers/[customerId]/child-accounts/route.ts
   - Validate request:
     * child_ps_account_id required, alphanumeric
     * routing_description required, min 20 chars
     * Check uniqueness within customer
     * Customer must be multi-account
   - Get max display_order, increment by 1
   - Insert into customer_child_accounts table
   - Return: new account + prompt_outdated flag

3. PATCH /api/customers/[customerId]/child-accounts/[accountId]/route.ts
   - Validate ownership (customer_ps_id matches)
   - Update allowed fields
   - Check uniqueness if ps_account_id changed
   - Return: updated account + prompt_outdated flag

4. DELETE /api/customers/[customerId]/child-accounts/[accountId]/route.ts
   - Validate ownership
   - Check remaining accounts count (min 2 required)
   - Check for recent order usage (warn if > 0)
   - Delete from customer_child_accounts table
   - Return: success + prompt_outdated flag

5. POST /api/customers/[customerId]/child-accounts/reorder/route.ts
   - Accept array of account IDs in new order
   - Update display_order for each
   - Return success

All routes require authentication.
All routes validate customer exists and user has permission.
Include comprehensive error handling.
```

---

## Testing Checklist

### Copy from Existing Customer
- [ ] Can select customer to copy from
- [ ] All settings copied correctly
- [ ] Required fields remain blank
- [ ] Child accounts copied for multi-account customers
- [ ] Prompts copied and accessible
- [ ] Can skip AI questions with copied prompts
- [ ] Can edit copied values during wizard
- [ ] Final save creates new customer (not update existing)

### Child Account Management
- [ ] Section only shows for MULTI customers
- [ ] Can view list of child accounts
- [ ] Can add new child account
- [ ] Cannot add duplicate account ID
- [ ] Can edit account description
- [ ] Can delete account (with confirmation)
- [ ] Cannot delete if < 2 accounts remain
- [ ] Warning shown if deleting account with recent orders
- [ ] Prompt outdated warning appears after changes
- [ ] Can regenerate routing prompt
- [ ] Can reorder accounts (drag and drop)

### Validation
- [ ] PS Account ID alphanumeric validation
- [ ] Routing description min 20 chars
- [ ] Uniqueness check works
- [ ] Max 10 child accounts enforced
- [ ] Min 2 child accounts enforced for MULTI customers

---

## Next Steps

1. **Review these designs** - Do they match your requirements?
2. **Implement Copy feature** - Add to wizard step 0
3. **Implement Child Account CRUD** - Add to customer detail page
4. **Create API endpoints** - Build the backend routes
5. **Test with real data** - Validate all flows work correctly

Last Updated: January 26, 2026
Ready for Implementation
