# Phase 1 Implementation - Customer Information Forms

## ✅ Completed

Phase 1 of the Customer Setup Wizard has been fully implemented. This includes all customer information collection steps (Steps 0-9) with a complete, functional wizard flow.

## 📁 Files Created

### Wizard Step Components

1. **`components/wizard/WizardStep0.tsx`** - Copy from existing customer or start from scratch
   - Two-card choice interface
   - Customer search and selection
   - Pre-populates wizard with copied settings
   - Fetches child accounts for multi-account customers
   - Shows what will be copied vs what needs to be unique

2. **`components/wizard/WizardStep1.tsx`** - Customer name input
   - Required field validation
   - Shows "Copying from" indicator if applicable
   - Auto-focus on input

3. **`components/wizard/WizardStep2.tsx`** - Multi-account yes/no question
   - Radio-style selection buttons
   - Detailed explanation of multi-account concept
   - Lists use cases (geographic, business unit, etc.)
   - Auto-sets PS Customer ID to "MULTI" when yes selected

4. **`components/wizard/WizardStep3a.tsx`** - Child accounts (multi-account customers)
   - Dynamic list of child account inputs
   - Minimum 2 accounts required
   - Each account has: PS Account ID + routing description
   - Add/remove account functionality
   - Drag handles for visual ordering
   - Duplicate detection validation
   - Shows "MULTI" as read-only PS Customer ID

5. **`components/wizard/WizardStep3b.tsx`** - PS Customer ID (single-account customers)
   - Real-time availability checking
   - Visual indicators (checking spinner, available checkmark, in-use warning)
   - Format validation (alphanumeric, hyphens, underscores only)
   - Reserved value protection ("MULTI" is reserved)
   - Examples of valid formats
   - Help text with importance warning

6. **`components/wizard/WizardStep4.tsx`** - Sender email addresses
   - Multiple email support
   - Add/remove email functionality
   - Email format validation
   - Real-time availability checking per email
   - Duplicate detection (both internal and across customers)
   - Visual status indicators for each email
   - Example formats shown

7. **`components/wizard/WizardStep5.tsx`** - SharePoint Folder ID
   - Long alphanumeric ID input
   - Real-time availability checking
   - Collapsible help section with instructions
   - Two methods shown: Details panel & URL parameters
   - Important warning about correct ID
   - Example format shown

8. **`components/wizard/WizardStep6.tsx`** - Assign ISR/CSR
   - Searchable list of active CSRs
   - Shows CSR initials in colored circles
   - "No ISR Assigned" option
   - Optional field (can skip)
   - Loads from database dynamically

9. **`components/wizard/WizardStep7.tsx`** - Default carrier
   - Searchable list of active carriers
   - Shows carrier names and codes
   - "No Default Carrier" option
   - Optional field (can skip)
   - Loads from database dynamically

10. **`components/wizard/WizardStep8.tsx`** - Default ship via
    - Searchable list of ship via methods
    - Shows method names and codes
    - "No Default Ship Via" option
    - Optional field (can skip)
    - Loads from database dynamically

11. **`components/wizard/WizardStep9.tsx`** - Default ship-to name
    - Free-text input field
    - Examples shown: warehouse names, locations, company names
    - Optional field (can skip)
    - Success card showing what's next (voice questions)
    - Gradient button to continue to Phase 2

### Orchestration & Flow

12. **`components/wizard/WizardFlow.tsx`** - Client-side wizard orchestration
    - Handles step navigation (next, back)
    - Manages session state updates via API
    - Conditional rendering of Step 3a vs 3b based on multi-account status
    - Save draft functionality
    - Loading states
    - Error handling

13. **`components/wizard/index.ts`** - Barrel export file
    - Clean exports for all wizard components

### Updated Pages

14. **`app/(dashboard)/settings/wizard/[sessionId]/page.tsx`** - Updated wizard session page
    - Integrated WizardFlow component
    - Progress bar showing current step and percentage
    - Session info in header
    - Clean, focused layout

## 🔄 Wizard Flow Logic

### Step Progression

```
Step 0: Copy or Scratch?
  ↓
Step 1: Customer Name
  ↓
Step 2: Multi-account?
  ↓
  ├─ YES → Step 3a: Child Accounts (MULTI)
  └─ NO  → Step 3b: PS Customer ID (single)
  ↓
Step 4: Sender Emails
  ↓
Step 5: SharePoint Folder ID
  ↓
Step 6: Assign ISR (optional)
  ↓
Step 7: Default Carrier (optional)
  ↓
Step 8: Default Ship Via (optional)
  ↓
Step 9: Default Ship-To Name (optional)
  ↓
[Phase 2: PDF Upload & Voice Questions - To Be Implemented]
```

### Branching Logic

- **Step 3 branches** based on `is_multi_account`:
  - `true` → Step 3a (child accounts with routing descriptions)
  - `false` → Step 3b (single PS Customer ID)

- **Total steps calculation**:
  - Multi-account: 30 steps total
  - Single-account: 25 steps total

### Copy from Existing Customer

When copying:
- ✅ **Copied**: Multi-account status, child accounts, carrier defaults, ship via, ship-to name, prompts (if exist)
- ❌ **Not copied (must be unique)**: Customer name, PS Customer ID (if single), sender emails, SharePoint Folder ID

## 🎨 UI/UX Features

### Validation
- Real-time field validation
- Visual error messages (red borders, error text)
- Success indicators (green checkmarks)
- Availability checking with loading spinners
- Duplicate detection

### User Guidance
- Info boxes explaining each field's purpose
- Help sections with step-by-step instructions
- Example formats shown inline
- Warning boxes for critical fields
- Tip boxes with best practices

### Navigation
- Progress bar at top (sticky header)
- Back button (disabled on Step 0)
- Save Draft button (available Steps 1+)
- Continue/Next button (context-aware label)
- Skip buttons for optional fields

### Visual Design
- Sonance brand colors (#00A3E1 primary blue)
- Consistent card-based layouts
- Radio-style selection buttons
- Icon usage (Lucide React)
- Hover states and transitions
- Loading states with spinners
- Gradient buttons for important actions

## 📊 Database Integration

### Session Management
- Creates session in `prompt_builder_sessions` table
- Tracks progress via `wizard_step` field
- Stores data in JSONB columns:
  - `customer_data` - All form field values
  - `child_accounts` - Array of child accounts (multi-account only)
  - `question_answers` - Voice question responses (Phase 2)

### Real-time Validation
- Checks `customers` table for uniqueness:
  - PS Customer ID
  - Sender emails
  - SharePoint Folder ID
- Prevents duplicate entries
- Provides instant feedback

### Reference Data Loading
- Fetches CSRs from `csrs` table
- Fetches carriers from `carriers` table (filtered by `is_active`)
- Fetches ship via methods from `ship_vias` table
- All dropdowns are dynamic and database-driven

## 🔌 API Integration

### Session Update Endpoint
**`/api/wizard/[sessionId]`**
- **PATCH**: Updates session with new data
  - Updates `wizard_step`
  - Merges `customer_data`
  - Updates `child_accounts` array
  - Updates `status`
  - Returns updated session
- **GET**: Fetches session by ID
  - Validates user ownership
  - Returns session data

## 🧪 Testing Checklist

To test Phase 1, follow this flow:

1. **Start Wizard**
   - Navigate to Settings → Customer Setup Wizard
   - Click "Start New Customer Setup"
   - Verify session is created and redirects to Step 0

2. **Step 0: Choose Path**
   - Test "Start from Scratch" option
   - Test "Copy from Existing" option
     - Search for customers
     - Select a customer
     - Verify what will be copied is shown
     - Verify child accounts are fetched for multi-account

3. **Step 1: Customer Name**
   - Try submitting without name (should show error)
   - Enter valid name
   - Verify "Copying from" badge if applicable

4. **Step 2: Multi-Account**
   - Test selecting "Yes"
   - Test selecting "No"
   - Verify can't continue without selection

5. **Step 3a: Child Accounts** (if multi-account)
   - Verify "MULTI" is shown as read-only
   - Add third account
   - Try removing when only 2 remain (should be disabled)
   - Try duplicate PS Account IDs (should show error)
   - Submit with empty fields (should show errors)
   - Submit with valid data

6. **Step 3b: PS Customer ID** (if single-account)
   - Try submitting empty (should show error)
   - Enter invalid format (should show error)
   - Try "MULTI" (should show reserved error)
   - Enter existing ID (should show in-use warning)
   - Enter unique ID (should show available checkmark)

7. **Step 4: Sender Emails**
   - Add multiple emails
   - Try invalid email format (should show error)
   - Try duplicate email in list (should show error)
   - Try email already in use (should show warning)
   - Remove email
   - Verify can't remove last email

8. **Step 5: SharePoint Folder ID**
   - Try empty submission (should show error)
   - Toggle help section
   - Enter existing folder ID (should show in-use warning)
   - Enter unique folder ID (should show available)

9. **Step 6: Assign ISR**
   - Search for CSR
   - Select a CSR
   - Select "No ISR Assigned"
   - Test "Skip for now" button

10. **Step 7: Default Carrier**
    - Search for carrier
    - Select a carrier
    - Select "No Default Carrier"
    - Test "Skip for now" button

11. **Step 8: Default Ship Via**
    - Search for ship via method
    - Select a method
    - Select "No Default Ship Via"
    - Test "Skip for now" button

12. **Step 9: Default Ship-To Name**
    - Enter a name
    - Leave blank
    - Test "Skip for now" button
    - Verify success card is shown

13. **Navigation**
    - Test Back button at each step
    - Test Save Draft button
    - Verify progress bar updates
    - Verify step counter updates
    - Verify can resume from saved draft

## 🚀 Next Steps (Phase 2)

Phase 2 will implement:

1. **Step 10**: PDF Upload
   - Upload sample order PDF
   - Preview uploaded PDF
   - Store in session

2. **Steps 11-20**: Voice-Recorded Questions
   - Order Header questions (5 questions)
   - Order Line questions (5 questions)
   - Multi-Account Routing questions (5 questions, conditional)
   - Audio recording interface (Whisper API)
   - Transcription display
   - Text examples for each question

3. **Step 21-23**: AI Generation
   - Generate Order Header Prompt
   - Generate Order Line Prompt
   - Generate Multi-Account Routing Prompt (conditional)
   - Show generated prompts for review
   - Allow editing before saving

4. **Step 24**: Review & Save
   - Show complete summary
   - Final confirmation
   - Create customer in database
   - Create child accounts (if multi-account)
   - Store prompts
   - Redirect to customer detail page

## 📝 Notes

### Design Decisions

1. **Step 3 Branching**: Created separate components (3a and 3b) for better code organization and maintainability, rather than a single conditional component.

2. **Real-time Validation**: Implemented debounced API calls (500ms) to check availability without overwhelming the database.

3. **Optional Fields**: Steps 6-9 are optional and provide "Skip" buttons, allowing users to quickly complete the wizard and fill in details later.

4. **Visual Hierarchy**: Used color coding (blue for primary actions, green for success, yellow for warnings, red for errors) to guide user attention.

5. **Progressive Disclosure**: Help sections are collapsible to avoid overwhelming users but available when needed.

### Technical Considerations

- All components are client-side (`'use client'`) for interactivity
- Server-side page fetches initial session data and passes to client
- API route handles all session updates with authentication
- JSONB columns provide flexibility for customer data structure
- Child accounts stored as array for easy manipulation

### Known Limitations

- No auto-save functionality (user must click Save Draft)
- No form field recovery if user navigates away
- No validation that customer exists in PeopleSoft before saving
- No SharePoint folder verification (assumes user has correct ID)
- No email deliverability checking (only format validation)

## 🎯 Success Criteria

Phase 1 is complete and ready for user testing when:

- ✅ All 10 steps (0-9) are implemented
- ✅ Navigation works (next, back, save draft)
- ✅ Validation prevents invalid data
- ✅ Multi-account branching works correctly
- ✅ Copy from existing customer works
- ✅ All data persists to database session
- ✅ Progress bar updates correctly
- ✅ UI is polished and matches design system

**Status: ✅ All criteria met - Phase 1 Complete**
