# Child Accounts Foreign Key Fix - Summary

## Problem Identified

You correctly identified a **critical design flaw** in the `customer_child_accounts` table:

### The Issue
- The foreign key referenced `customers.ps_customer_id` instead of `customers.customer_id` (UUID)
- This meant if multiple customers had `ps_customer_id = "MULTI"`, they would **share the same child accounts**
- This is wrong - each multi-territory customer needs their own set of child accounts

### Example of the Problem
```
Customer A: id = uuid-123, ps_customer_id = "MULTI", name = "Acme Corp"
Customer B: id = uuid-456, ps_customer_id = "MULTI", name = "Widget Inc"

With the old schema:
Both Customer A and B would see the SAME child accounts because they both have ps_customer_id = "MULTI"
```

## Solution Implemented

### 1. Database Migration Created
**File:** `supabase/migrations/053_fix_child_accounts_foreign_key.sql`

This migration:
- ✅ Drops the old foreign key constraint
- ✅ Adds new column `parent_customer_id` (UUID type)
- ✅ Migrates existing data from `parent_ps_customer_id` to `parent_customer_id`
- ✅ Creates new foreign key: `parent_customer_id` → `customers.customer_id`
- ✅ Removes the old `parent_ps_customer_id` column
- ✅ Updates indexes and constraints

### 2. Code Updated

All code that referenced `parent_ps_customer_id` has been updated to use `parent_customer_id`:

#### API Routes Updated:
- ✅ `order-portal-web/app/api/customers/[customerId]/child-accounts/route.ts`
  - GET endpoint now uses `parent_customer_id`
  - POST endpoint inserts with `parent_customer_id: customer.id`

- ✅ `order-portal-web/app/api/customers/[customerId]/child-accounts/[accountId]/route.ts`
  - PATCH endpoint uses `parent_customer_id`
  - DELETE endpoint uses `parent_customer_id`

#### Frontend Components Updated:
- ✅ `order-portal-web/components/settings/ChildAccountsManagement.tsx`
  - TypeScript interface updated to use `parent_customer_id`

#### Other Files Updated:
- ✅ `order-portal-web/app/api/wizard/finalize/route.ts`
  - Child account creation now uses `parent_customer_id: customer.id`

- ✅ `order-portal-web/lib/hooks/useOrders.ts`
  - Updated to query child accounts by `parent_customer_id` (UUID)
  - Fixed lookup of parent customer from child account

## How to Run the Migration

### Option 1: Using the Script (Recommended)
```bash
node run-child-accounts-fix.js
```

### Option 2: Manual Execution in Supabase SQL Editor
1. Go to Supabase SQL Editor
2. Open `supabase/migrations/053_fix_child_accounts_foreign_key.sql`
3. Copy and paste the entire SQL content
4. Execute

## After Migration

### What Changed:
```sql
-- OLD SCHEMA
customer_child_accounts (
  parent_ps_customer_id VARCHAR(18) → customers.ps_customer_id
)

-- NEW SCHEMA
customer_child_accounts (
  parent_customer_id UUID → customers.customer_id
)
```

### Benefits:
1. ✅ Multiple customers can have `ps_customer_id = "MULTI"` without conflicts
2. ✅ Each customer has their own distinct set of child accounts
3. ✅ Foreign key properly enforces referential integrity
4. ✅ Cascade deletes work correctly (delete parent → deletes children)

### Example After Fix:
```
Customer A: id = uuid-123, ps_customer_id = "MULTI", name = "Acme Corp"
  → Child Accounts: [12345, 67890, 55555]

Customer B: id = uuid-456, ps_customer_id = "MULTI", name = "Widget Inc"
  → Child Accounts: [99999, 88888, 77777]

✅ Each customer has their own separate child accounts!
```

## API Route Changes

### Important Note:
The API routes now expect `customerId` to be the **UUID** (customers.id), not the `ps_customer_id`.

If you're calling these endpoints from anywhere, make sure to pass the UUID:

```javascript
// OLD (won't work after migration)
fetch(`/api/customers/MULTI/child-accounts`)

// NEW (correct)
fetch(`/api/customers/${customer.customer_id}/child-accounts`)
```

## Verification Steps

After running the migration:

1. Check that child accounts table has `parent_customer_id` column:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customer_child_accounts';
```

2. Verify foreign key constraint exists:
```sql
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_name = 'customer_child_accounts';
```

3. Test creating a second MULTI customer and adding child accounts

## Files Modified

### Database:
- ✅ `supabase/migrations/053_fix_child_accounts_foreign_key.sql` (created)

### Backend:
- ✅ `order-portal-web/app/api/customers/[customerId]/child-accounts/route.ts`
- ✅ `order-portal-web/app/api/customers/[customerId]/child-accounts/[accountId]/route.ts`
- ✅ `order-portal-web/app/api/wizard/finalize/route.ts`
- ✅ `order-portal-web/lib/hooks/useOrders.ts`

### Frontend:
- ✅ `order-portal-web/components/settings/ChildAccountsManagement.tsx`

### Scripts:
- ✅ `run-child-accounts-fix.js` (created)

## Next Steps

1. **Run the migration** using one of the methods above
2. **Test the fix** by creating a second multi-territory customer
3. **Verify** that each customer has their own separate child accounts
4. **Update any other code** that might be calling the child accounts APIs

---

**Status:** ✅ Ready to migrate
**Impact:** High - Fixes critical multi-customer bug
**Breaking Changes:** API routes now expect UUID instead of ps_customer_id
**Data Loss Risk:** None - existing data will be migrated automatically
