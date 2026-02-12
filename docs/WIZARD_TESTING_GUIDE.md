# Customer Setup Wizard - Testing Guide

## 🎯 Quick Start

### Prerequisites

1. **Database Migration**
   ```bash
   # Ensure migration 042 is applied
   # This adds wizard fields to prompt_builder_sessions table
   ```

2. **Development Server**
   ```bash
   cd order-portal-web
   npm run dev
   ```

3. **Test Data**
   - At least one existing customer in the database (for "Copy from existing" test)
   - Active CSRs in `csrs` table
   - Active carriers in `carriers` table
   - Ship via methods in `ship_vias` table

## 🚀 Testing Flow

### 1. Access the Wizard

**Path**: Settings → Customer Setup Wizard

1. Navigate to `http://localhost:3000/settings`
2. Look for the "Customer Setup Wizard" card (blue gradient border, "NEW" badge)
3. Click the card to go to wizard landing page
4. Click "Start New Customer Setup" button
5. Verify redirect to wizard session page with Step 0

**Expected**:
- Session created in database
- URL format: `/settings/wizard/[uuid]`
- Progress bar shows "Step 1 of 25" (or 30 if multi-account)

---

### 2. Step 0: Copy or Start from Scratch

**Test A: Start from Scratch**
1. Click "Start from Scratch" card
2. Click "Continue" button
3. Verify advancement to Step 1

**Test B: Copy from Existing**
1. Click "Copy from Existing" card
2. Verify customer list loads
3. Use search box to filter customers
4. Select a customer (single-account)
5. Verify "What will be copied" section shows
6. Click "Continue"
7. Verify Step 1 shows with pre-populated fields

**Test C: Copy Multi-Account Customer**
1. Select a customer with `ps_customer_id = 'MULTI'`
2. Verify "Multi-Account" badge shown
3. Verify child accounts will be copied
4. Click "Continue"
5. Verify Step 2 shows with "Yes" pre-selected

**Expected**:
- Search filters customers in real-time
- Selected customer shows checkmark
- Can change selection by clicking "Change selection" link
- Continue button disabled until selection made

---

### 3. Step 1: Customer Name

**Test A: Validation**
1. Try clicking "Continue" with empty field
2. Verify error message: "Customer name is required"
3. Enter a name
4. Verify error clears
5. Click "Continue"

**Test B: If Copied**
1. If came from "Copy from existing", verify "Copying from" badge shown
2. Verify customer name field is empty (must be unique)

**Expected**:
- Field has auto-focus
- Error message shown for empty field
- Can't continue with empty name
- "Copying from" indicator if applicable

---

### 4. Step 2: Multi-Account Question

**Test A: Yes Selection**
1. Click "Yes - Multi-territory/multi-account customer" card
2. Verify blue border and checkmark appear
3. Click "Continue"
4. Verify advancement to Step 3a (child accounts)

**Test B: No Selection**
1. Click "No - Single account customer" card
2. Verify blue border and checkmark appear
3. Click "Continue"
4. Verify advancement to Step 3b (PS Customer ID)

**Test C: No Selection**
1. Reload page or click Back then Next
2. Try clicking "Continue" without selecting
3. Verify button is disabled

**Expected**:
- Cards have hover effect
- Selected card has blue border and background
- Warning box explains multi-account concept
- Tip box recommends single account for most cases
- Can't continue without selection

---

### 5a. Step 3a: Child Accounts (Multi-Account)

**Test A: Minimum Accounts**
1. Verify "MULTI" shown as read-only PS Customer ID
2. Verify 2 child account forms shown by default
3. Try to remove a child account
4. Verify can't remove when only 2 remain

**Test B: Add Child Account**
1. Click "Add Account" button
2. Verify third child account form appears
3. Verify display order numbers update (1, 2, 3)

**Test C: Remove Child Account**
1. With 3+ accounts, click remove button (trash icon)
2. Verify account is removed
3. Verify display order numbers update

**Test D: Validation - Empty Fields**
1. Leave PS Account ID empty on first account
2. Try clicking "Continue"
3. Verify error message on that account
4. Leave routing description empty
5. Try clicking "Continue"
6. Verify error message shown

**Test E: Validation - Duplicates**
1. Enter "ACME-WEST" in first account PS ID
2. Enter "ACME-WEST" in second account PS ID
3. Try clicking "Continue"
4. Verify "Duplicate PS Account ID" error on both

**Test F: Success**
1. Fill in all fields with unique PS Account IDs
2. Add descriptive routing descriptions
3. Click "Continue"
4. Verify advancement to Step 4

**Expected**:
- Minimum 2 accounts enforced
- Drag handles shown (visual only, no drag implemented)
- Account numbers shown in blue circles
- Duplicate detection works
- Error highlights entire account card in red
- Can add unlimited accounts

---

### 5b. Step 3b: PS Customer ID (Single-Account)

**Test A: Empty Field**
1. Leave field empty
2. Try clicking "Continue"
3. Verify error: "PeopleSoft Customer ID is required"

**Test B: Invalid Format**
1. Enter "ACME CORP" (with space)
2. Verify error: "Only letters, numbers, hyphens, and underscores are allowed"

**Test C: Reserved Value**
1. Enter "MULTI"
2. Verify error: "This value is reserved for multi-account customers"

**Test D: Duplicate Check**
1. Enter an existing customer's PS Customer ID
2. Wait 500ms for debounced check
3. Verify orange warning icon and message: "This ID is already in use"
4. Verify "Continue" button is disabled

**Test E: Available ID**
1. Enter a unique PS Customer ID (e.g., "TEST-ACME-123")
2. Wait 500ms for debounced check
3. Verify green checkmark icon
4. Verify message: "This ID is available"
5. Click "Continue"
6. Verify advancement to Step 4

**Expected**:
- Real-time validation with 500ms debounce
- Spinner shows during availability check
- Green checkmark for available
- Orange warning for in-use
- Examples shown in blue info box
- Warning box emphasizes importance

---

### 6. Step 4: Sender Email Addresses

**Test A: Single Email**
1. Verify one email input shown by default
2. Enter invalid email (e.g., "notanemail")
3. Verify error: "Invalid email format"
4. Enter valid email
5. Verify error clears

**Test B: Add Multiple Emails**
1. Click "Add Email" button
2. Verify second email input appears
3. Add 2-3 more emails
4. Verify all show with remove buttons

**Test C: Remove Email**
1. With multiple emails, click X button
2. Verify email is removed
3. With only 1 email, verify X button is disabled

**Test D: Duplicate Detection**
1. Enter "test@acme.com" in first email
2. Enter "test@acme.com" in second email
3. Try clicking "Continue"
4. Verify error: "Duplicate email address" on both

**Test E: Availability Check**
1. Enter an email already used by another customer
2. Wait 500ms for debounced check
3. Verify orange warning: "This email is already in use"
4. Enter a unique email
5. Verify green checkmark: "Available"

**Test F: Success**
1. Enter 1-3 unique, valid emails
2. Wait for all to show green checkmarks
3. Click "Continue"
4. Verify advancement to Step 5

**Expected**:
- Can add unlimited emails
- Can't remove last email
- Real-time validation per email
- Duplicate detection works across list
- Info box explains purpose
- Examples shown

---

### 7. Step 5: SharePoint Folder ID

**Test A: Empty Field**
1. Leave field empty
2. Try clicking "Continue"
3. Verify error: "SharePoint Folder ID is required"

**Test B: Show Help**
1. Click "Show help" link
2. Verify help section expands
3. Verify two methods shown
4. Click "Hide help" link
5. Verify section collapses

**Test C: Duplicate Check**
1. Enter an existing folder ID
2. Wait 500ms for debounced check
3. Verify orange warning: "This Folder ID is already in use"

**Test D: Unique ID**
1. Enter a unique folder ID (e.g., "01ABCDEF12345GHIJKLMNO67890")
2. Wait 500ms
3. Verify green checkmark: "This Folder ID is available"
4. Click "Continue"
5. Verify advancement to Step 6

**Expected**:
- Field has monospace font
- Real-time availability checking
- Help section is collapsible
- Warning box emphasizes importance
- Info box explains purpose

---

### 8. Step 6: Assign ISR

**Test A: Load ISRs**
1. Verify list of CSRs loads from database
2. Verify initials shown in colored circles
3. Verify email addresses shown

**Test B: Search**
1. Type in search box
2. Verify list filters in real-time
3. Clear search
4. Verify all CSRs shown again

**Test C: Select ISR**
1. Click on a CSR
2. Verify blue border and checkmark
3. Click "Continue"
4. Verify advancement to Step 7

**Test D: No ISR**
1. Click "No ISR Assigned" option
2. Verify blue border and checkmark
3. Click "Continue"
4. Verify advancement to Step 7

**Test E: Skip**
1. Click "Skip for now" button
2. Verify advancement to Step 7
3. Click Back
4. Verify can change selection

**Expected**:
- Search filters first name, last name, and email
- Can select ISR or "No ISR"
- Skip button works
- Info box explains purpose
- Tip box mentions can change later

---

### 9. Step 7: Default Carrier

**Test A: Load Carriers**
1. Verify list of active carriers loads
2. Verify carrier names and codes shown

**Test B: Search**
1. Type in search box
2. Verify list filters by name and code
3. Clear search

**Test C: Select Carrier**
1. Click on a carrier
2. Verify blue border and checkmark
3. Click "Continue"
4. Verify advancement to Step 8

**Test D: No Default**
1. Click "No Default Carrier" option
2. Verify blue border and checkmark
3. Click "Continue"

**Test E: Skip**
1. Click "Skip for now" button
2. Verify advancement to Step 8

**Expected**:
- Only active carriers shown (is_active = true)
- Search works on both name and code
- Tip box suggests common carriers

---

### 10. Step 8: Default Ship Via

**Test A: Load Ship Vias**
1. Verify list of ship via methods loads
2. Verify method names and codes shown

**Test B: Search**
1. Type in search box
2. Verify list filters
3. Clear search

**Test C: Select Ship Via**
1. Click on a method
2. Verify blue border and checkmark
3. Click "Continue"
4. Verify advancement to Step 9

**Test D: No Default**
1. Click "No Default Ship Via" option
2. Click "Continue"

**Test E: Skip**
1. Click "Skip for now" button
2. Verify advancement to Step 9

**Expected**:
- All ship via methods shown
- Search filters by name and code
- Tip box suggests common methods

---

### 11. Step 9: Default Ship-To Name

**Test A: Optional Field**
1. Leave field empty
2. Click "Continue"
3. Verify advancement (no error)
4. Click Back
5. Enter a value
6. Click "Continue"

**Test B: Success Card**
1. Verify green gradient card shown
2. Verify "Customer Information Complete" message
3. Verify "What's next" list shows:
   - Upload sample PDF
   - Voice questions (header, line, routing if multi-account)
   - Review and save
4. Verify gradient "Continue to Voice Questions" button

**Test C: Skip**
1. Click "Skip for now" button
2. Verify same advancement

**Expected**:
- Field is truly optional
- Examples shown
- Yellow note box explains difference from address
- Success card provides clear next steps
- Special gradient button for emphasis

---

### 12. Navigation Testing

**Test A: Back Button**
1. From any step > 0, click "Back" button
2. Verify returns to previous step
3. Verify data is preserved (no loss)
4. Verify progress bar updates
5. On Step 0, verify Back button returns to wizard landing

**Test B: Save Draft**
1. From any step > 0, click "Save Draft" button
2. Verify success alert
3. Navigate away from wizard
4. Return to wizard session (same URL)
5. Verify wizard resumes at same step
6. Verify all data is preserved

**Test C: Progress Bar**
1. Advance through each step
2. Verify progress bar updates
3. Verify step counter updates
4. Verify percentage updates
5. Note: Percentage will be lower initially as total includes Phase 2 steps

**Test D: Customer Name in Header**
1. After Step 1, verify customer name shown in header
2. Before Step 1, verify "New Customer" shown

---

### 13. Multi-Account Full Flow Test

**Complete flow for multi-account customer:**

1. Start wizard
2. Choose "Start from Scratch"
3. Enter customer name: "Test Multi Corp"
4. Select "Yes - Multi-territory/multi-account customer"
5. Add 3 child accounts:
   - ACME-WEST / "Use for California, Nevada, Oregon, Washington"
   - ACME-EAST / "Use for New York, New Jersey, Connecticut"
   - ACME-SOUTH / "Use for Texas, Florida, Georgia"
6. Enter sender emails: orders@testmulti.com
7. Enter SharePoint Folder ID: (unique ID)
8. Skip ISR
9. Select carrier: UPS
10. Select ship via: Ground
11. Enter ship-to name: "Main Distribution Center"
12. Verify success card shows multi-account routing in "What's next"

**Verify in Database:**
```sql
SELECT
  customer_name,
  wizard_step,
  customer_data,
  child_accounts
FROM prompt_builder_sessions
WHERE customer_name = 'Test Multi Corp'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**:
- `wizard_step` = 9
- `customer_data` contains all form values
- `child_accounts` is array with 3 objects
- Each child account has `ps_account_id`, `routing_description`, `display_order`

---

### 14. Single-Account Full Flow Test

**Complete flow for single-account customer:**

1. Start wizard
2. Choose "Start from Scratch"
3. Enter customer name: "Test Single Corp"
4. Select "No - Single account customer"
5. Enter PS Customer ID: "TEST-SINGLE-123"
6. Enter sender emails: orders@testsingle.com, purchasing@testsingle.com
7. Enter SharePoint Folder ID: (unique ID)
8. Select ISR: (any CSR)
9. Select carrier: FedEx
10. Select ship via: 2-Day Air
11. Skip ship-to name

**Verify in Database:**
```sql
SELECT
  customer_name,
  wizard_step,
  customer_data,
  child_accounts
FROM prompt_builder_sessions
WHERE customer_name = 'Test Single Corp'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**:
- `wizard_step` = 9
- `customer_data.ps_customer_id` = "TEST-SINGLE-123"
- `customer_data.is_multi_account` = false
- `child_accounts` = empty array
- `customer_data.sender_email` = "orders@testsingle.com, purchasing@testsingle.com"

---

## 🐛 Common Issues

### Issue: "Session not found" error
**Solution**: Verify user is logged in and session was created successfully. Check browser console for errors.

### Issue: Real-time validation not working
**Solution**: Check network tab for API calls. Verify database connection. Check that tables exist.

### Issue: Dropdown lists are empty (CSRs, carriers, etc.)
**Solution**: Verify test data exists in respective tables. Check Supabase connection.

### Issue: Progress bar shows wrong percentage
**Solution**: This is expected - total steps (25/30) includes Phase 2 steps not yet implemented.

### Issue: Back button losing data
**Solution**: Verify API route is saving data correctly. Check browser console for errors.

---

## ✅ Success Criteria

Phase 1 is working correctly when:

- ✅ Can complete full flow from Step 0 to Step 9
- ✅ All validation works (required fields, formats, uniqueness)
- ✅ Multi-account branching works (Step 3a vs 3b)
- ✅ Copy from existing customer works
- ✅ Real-time availability checking works
- ✅ Search/filter works on all dropdowns
- ✅ Back/Save Draft/Continue navigation works
- ✅ Data persists correctly to database
- ✅ Progress bar updates correctly
- ✅ No console errors

---

## 📸 Screenshots to Capture

For documentation/review:

1. Settings page with wizard card
2. Wizard landing page
3. Step 0 - both options
4. Step 2 - multi-account question
5. Step 3a - child accounts
6. Step 3b - PS Customer ID with availability check
7. Step 4 - multiple emails
8. Step 9 - success card

---

## 🚀 Next Phase

After Phase 1 testing is complete, Phase 2 will add:
- PDF upload (Step 10)
- Voice-recorded questions (Steps 11-20+)
- AI prompt generation
- Final review and save
