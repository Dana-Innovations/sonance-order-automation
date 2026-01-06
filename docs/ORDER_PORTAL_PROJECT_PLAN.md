# Order Portal Application - Detailed Project Plan

## Project Overview
**Goal:** Build an enterprise-grade web application for CSR order review and validation
**Timeline:** 8-12 weeks (estimated for non-developer with AI assistance)
**Approach:** Iterative development using Cursor + Claude AI

---

## Phase 0: Project Setup & Foundation (Week 1)

### Task 0.1: Environment Setup
**Duration:** 2-3 hours
**Status:** ⬜ Not Started
**Steps:**
1. Install required software:
   - Cursor IDE
   - Git
   - Node.js (LTS version)
   - GitHub Desktop (optional, for easier Git management)
2. Create GitHub account and configure
3. Set up local development folder structure

**Deliverables:**
- ✅ All tools installed and working
- ✅ GitHub account ready

---

### Task 0.2: Project Initialization
**Duration:** 1-2 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create Next.js project using Cursor
2. Initialize Git repository
3. Connect to GitHub (private repository)
4. Create initial project structure

**Cursor Prompt:**
```
Create a new Next.js 14+ project with:
- TypeScript
- Tailwind CSS
- App Router
- ESLint configured

Set up the basic folder structure following enterprise best practices.
```

**Deliverables:**
- ✅ Next.js project running locally (`npm run dev`)
- ✅ Code pushed to GitHub
- ✅ Project accessible at localhost:3000

---

### Task 0.3: Documentation Setup
**Duration:** 2-3 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create `/docs` folder
2. Add PROJECT_SPEC.md (already completed)
3. Create STYLE_GUIDE.md from your design system
4. Create DATABASE_SCHEMA.md
5. Add .env.local with environment variables template

**Files to Create:**
```
/docs
  ├── PROJECT_SPEC.md (completed)
  ├── STYLE_GUIDE.md (your design system)
  ├── DATABASE_SCHEMA.md (create this)
  └── API_DOCUMENTATION.md (for future reference)
```

**Deliverables:**
- ✅ Documentation folder with all specs
- ✅ Environment variables template
- ✅ Committed to GitHub

---

### Task 0.4: Supabase Setup
**Duration:** 2-3 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create Supabase project
2. Configure authentication settings
3. Set up initial database tables
4. Configure Row Level Security (RLS) policies
5. Add environment variables to `.env.local`

**Cursor Prompt:**
```
Based on /docs/DATABASE_SCHEMA.md, create:
1. Supabase client configuration in /lib/supabase
2. TypeScript types for all database tables
3. Helper functions for common queries

Follow Next.js 14 best practices for Supabase integration.
```

**Database Tables to Create (in Supabase dashboard):**
- users (profiles)
- customers
- orders
- order_lines
- customer_price_lists
- valid_items
- csr_assignments
- audit_log
- order_status_history

**Deliverables:**
- ✅ Supabase project created
- ✅ All tables created with proper schema
- ✅ RLS policies configured
- ✅ Connection working from Next.js app
- ✅ Test data added for development

---

## Phase 1: Authentication & Authorization (Week 2)

### Task 1.1: Authentication System
**Duration:** 4-6 hours
**Status:** ⬜ Not Started
**Steps:**
1. Implement Supabase Auth
2. Create login page
3. Create protected route middleware
4. Build basic layout with navigation

**Cursor Prompt:**
```
Read /docs/STYLE_GUIDE.md and implement:

1. Authentication using Supabase Auth with email/password
2. Login page following our design system
3. Protected route middleware that:
   - Redirects unauthenticated users to login
   - Verifies user role is 'csr'
4. Basic application layout with:
   - Header with user info and logout
   - Sidebar navigation
   - Main content area

All styling must follow /docs/STYLE_GUIDE.md specifications.
```

**Deliverables:**
- ✅ Working login/logout functionality
- ✅ Protected routes enforcing authentication
- ✅ Basic app layout matching style guide
- ✅ Session management working

**Testing Checklist:**
- [ ] Can login with valid credentials
- [ ] Cannot access app without login
- [ ] Logout redirects to login page
- [ ] Session persists on page refresh

---

### Task 1.2: CSR Customer Assignment & Routing
**Duration:** 3-4 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create CSR-Customer assignment system
2. Implement RLS policies based on assignments
3. Test data filtering

**Cursor Prompt:**
```
Implement CSR customer assignment routing:

1. When a CSR logs in, query csr_assignments table
2. Store assigned customer IDs in user session
3. Create RLS policies in Supabase that:
   - Only show orders for assigned customers
   - Prevent access to other customer orders
4. Create utility functions to:
   - Get assigned customers for current user
   - Check if user can access a specific order

Include error handling and loading states.
```

**Deliverables:**
- ✅ CSR assignments working
- ✅ RLS policies enforcing customer access
- ✅ Utility functions for permission checks
- ✅ Test data showing proper filtering

**Testing Checklist:**
- [ ] CSR A only sees their assigned customers' orders
- [ ] CSR B cannot access CSR A's orders
- [ ] Direct URL access to unauthorized orders fails

---

## Phase 2: Order List View (Week 3)

### Task 2.1: Order List Page
**Duration:** 6-8 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create order list page
2. Implement data fetching from Supabase
3. Build table component with all required columns
4. Add status badges and visual indicators

**Cursor Prompt:**
```
Create the Order List page based on /docs/PROJECT_SPEC.md:

Requirements:
1. Display all orders assigned to current CSR
2. Table columns:
   - Status (color-coded badge)
   - Order Number (clickable link)
   - Customer Name
   - Order Date (formatted)
   - Total Amount (currency formatted)
   - Price Issues Count (badge if > 0)
   - Invalid Items Count (badge if > 0)
   - Assigned CSR name
   - Actions (View Details, Cancel buttons)

3. Visual indicators per /docs/STYLE_GUIDE.md:
   - Pending: Blue badge
   - Under Review: Yellow badge
   - Validated: Green badge
   - Exported: Purple badge
   - ERP Processed: Gray badge
   - Cancelled: Red badge

4. Features:
   - Click order number to navigate to detail page
   - Show loading state while fetching
   - Empty state when no orders
   - Error handling

Follow our style guide for all components.
```

**Deliverables:**
- ✅ Order list page with working table
- ✅ Proper data fetching and display
- ✅ Status badges with correct colors
- ✅ Navigation to detail page working
- ✅ Responsive design

**Testing Checklist:**
- [ ] All columns display correctly
- [ ] Status badges show correct colors
- [ ] Click order number navigates to detail
- [ ] Price/item issue badges show counts
- [ ] Loading and empty states work

---

### Task 2.2: Filtering & Search
**Duration:** 3-4 hours
**Status:** ⬜ Not Started
**Steps:**
1. Add status filter dropdown
2. Add customer search
3. Add date range filter
4. Implement filtering logic

**Cursor Prompt:**
```
Add filtering capabilities to the Order List:

1. Status filter dropdown:
   - All statuses
   - Multi-select capability
   - Apply filter button

2. Customer search:
   - Text input with search icon
   - Live search as user types
   - Clear search button

3. Date range filter:
   - From/To date pickers
   - Quick filters (Today, This Week, This Month)

4. Filter combination logic:
   - Filters work together (AND logic)
   - Show active filter count
   - Clear all filters button

Update URL query params to maintain filter state on refresh.
```

**Deliverables:**
- ✅ Working status filter
- ✅ Customer search functionality
- ✅ Date range filtering
- ✅ Combined filters work correctly
- ✅ Filter state persists in URL

---

## Phase 3: Order Detail View (Week 4-5)

### Task 3.1: Order Header Display
**Duration:** 4-5 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create order detail page layout
2. Display order header information
3. Add action buttons
4. Implement status change logic

**Cursor Prompt:**
```
Create the Order Detail page header section:

1. Display order information:
   - Order Number (large, prominent)
   - Customer Name and ID
   - Order Date
   - Current Status (large badge)
   - Total Amount
   - Assigned CSR
   - PeopleSoft Order Number (if exists)

2. Header action buttons:
   - Cancel Order (red, with confirmation modal)
   - Change Status dropdown
   - View Audit Log

3. Editable fields section:
   - Ship-to Address (click to edit inline)
   - Carrier Information (dropdown select)
   - Save Changes button

4. Auto-update status:
   - When page opens → "Under Review"
   - Log status change to audit_log

Follow /docs/STYLE_GUIDE.md for all styling.
```

**Deliverables:**
- ✅ Order header displaying all info
- ✅ Status badge prominent and correct
- ✅ Action buttons functional
- ✅ Editable fields working
- ✅ Auto-status update on open

**Testing Checklist:**
- [ ] All order info displays correctly
- [ ] Status updates when order opened
- [ ] Address editing works and saves
- [ ] Carrier dropdown populated
- [ ] Changes logged to audit_log

---

### Task 3.2: PDF Viewer Integration
**Duration:** 6-8 hours
**Status:** ⬜ Not Started
**Steps:**
1. Set up SharePoint authentication
2. Implement PDF fetching from SharePoint
3. Integrate PDF viewer component
4. Create side-by-side layout

**Cursor Prompt:**
```
Implement SharePoint PDF viewer:

1. Create SharePoint client utility:
   - Microsoft Graph API authentication
   - Fetch PDF from SharePoint using order.pdf_url
   - Handle authentication errors
   - Cache PDF data

2. Integrate react-pdf library:
   - Display PDF in viewer
   - Zoom controls (+, -, fit to width)
   - Page navigation (prev/next, jump to page)
   - Loading spinner

3. Layout:
   - PDF viewer on left (40% width)
   - Order details on right (60% width)
   - Resizable divider between panels
   - Make responsive for mobile (stack vertically)

4. Error handling:
   - PDF not found
   - Authentication failed
   - Loading errors

Store SharePoint credentials in environment variables.
```

**Deliverables:**
- ✅ SharePoint authentication working
- ✅ PDF fetching from SharePoint
- ✅ PDF viewer displaying documents
- ✅ Zoom and navigation controls
- ✅ Side-by-side layout working
- ✅ Error handling implemented

**Testing Checklist:**
- [ ] PDF loads and displays correctly
- [ ] Zoom controls work
- [ ] Page navigation works
- [ ] Layout is responsive
- [ ] Errors display helpful messages

---

### Task 3.3: Order Lines Table with Price Validation
**Duration:** 8-10 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create order lines table
2. Implement price validation logic
3. Add visual indicators for variances
4. Display side-by-side pricing

**Cursor Prompt:**
```
Build the Order Lines table with price validation:

1. Table columns:
   - Line Number
   - Item Number (original + validated if different)
   - Description (original + validated if different)
   - Quantity (original + validated if different)
   - UOM (original + validated if different)
   - Order Price (from PDF)
   - Negotiated Price (from customer_price_lists)
   - Price Status Indicator
   - Edit button

2. Price validation logic:
   - Query customer_price_lists for each item
   - Compare order_price vs negotiated_price
   - Calculate variance percentage
   - Check if item exists in valid_items table

3. Visual indicators per /docs/STYLE_GUIDE.md:
   - Green checkmark: Prices match exactly
   - Yellow warning: 0.1% - 5% variance
   - Red alert: > 5% variance or invalid item
   - Gray question: No negotiated price found

4. Display format:
   - Show both prices side-by-side
   - Highlight differences
   - Show variance percentage
   - Add tooltip explaining variance

5. Features:
   - Expandable row for more details
   - Quick edit mode (double-click cell)
   - Batch validation for all lines
   - Summary: X items valid, Y with price issues, Z invalid items

Include proper TypeScript types and error handling.
```

**Deliverables:**
- ✅ Order lines table displaying all data
- ✅ Price validation working correctly
- ✅ Visual indicators showing status
- ✅ Side-by-side price comparison
- ✅ Invalid item detection
- ✅ Summary statistics
- ✅ Expandable rows for details

**Testing Checklist:**
- [ ] All line items display
- [ ] Price validation calculates correctly
- [ ] Green/yellow/red indicators accurate
- [ ] Variance percentages correct
- [ ] Invalid items flagged
- [ ] Summary counts accurate
- [ ] Tooltips explain variances

---

### Task 3.4: Line Item Editing
**Duration:** 6-8 hours
**Status:** ⬜ Not Started
**Steps:**
1. Implement inline editing
2. Create edit modal for complex changes
3. Add validation
4. Log changes to audit_log

**Cursor Prompt:**
```
Implement order line editing functionality:

1. Inline editing:
   - Double-click cell to edit
   - Tab to move to next field
   - ESC to cancel, Enter to save
   - Editable fields: quantity, price, description, item_number, uom

2. Edit modal (for complex edits):
   - Click Edit button to open modal
   - Form with all editable fields
   - Original values shown in gray
   - Validation:
     * Quantity > 0
     * Price >= 0
     * Item number exists in valid_items
   - Reason for change (optional text field)
   - Save/Cancel buttons

3. Data handling:
   - Store original values in: original_* fields
   - Store updated values in: validated_* fields
   - Set price_variance_flag if prices differ
   - Set is_valid_item based on valid_items check

4. Audit logging:
   - Log every change to audit_log table
   - Include: user_id, order_id, order_line_id, field_changed, old_value, new_value, reason, timestamp
   - For price changes, always require reason

5. UI feedback:
   - Show "Saving..." indicator
   - Success message on save
   - Error messages for validation failures
   - Mark edited fields with indicator (e.g., blue dot)

Follow validation rules and logging requirements from /docs/PROJECT_SPEC.md
```

**Deliverables:**
- ✅ Inline editing working
- ✅ Edit modal functional
- ✅ All validations enforced
- ✅ Original vs validated fields tracked
- ✅ Audit logging complete
- ✅ UI feedback working

**Testing Checklist:**
- [ ] Can edit quantity, price, description
- [ ] Validation prevents invalid data
- [ ] Changes save to database
- [ ] Audit log entries created
- [ ] Original values preserved
- [ ] Edited indicators visible
- [ ] Reason captured for price changes

---

## Phase 4: Order Actions (Week 6)

### Task 4.1: Order Validation & Status Updates
**Duration:** 4-5 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create "Validate Order" button
2. Implement validation checks
3. Update order status
4. Create status history tracking

**Cursor Prompt:**
```
Implement order validation workflow:

1. "Validate Order" button:
   - Prominent green button at bottom
   - Disabled if order has unresolved issues
   - Shows requirements checklist

2. Validation checks before allowing validation:
   - All price variances reviewed (or acknowledged)
   - All invalid items resolved (or removed)
   - Ship-to address confirmed
   - Carrier selected
   - At least one line item exists

3. Validation modal:
   - Show checklist of requirements
   - Green checkmarks for completed
   - Red X for incomplete
   - "I confirm this order is ready for export" checkbox
   - Validate button (only enabled when all checks pass)

4. Status update process:
   - Change status from "Under Review" → "Validated"
   - Log to order_status_history table
   - Log to audit_log
   - Show success message
   - Redirect to order list

5. Status history tracking:
   - Create order_status_history table entry:
     * order_id, status, changed_by, changed_at, notes
   - Display status history timeline in audit log view

Include proper error handling and user feedback.
```

**Deliverables:**
- ✅ Validate button with checks
- ✅ Validation modal working
- ✅ Status updates correctly
- ✅ Status history tracked
- ✅ Proper user feedback

**Testing Checklist:**
- [ ] Button disabled with incomplete order
- [ ] Validation checks work correctly
- [ ] Status updates to "Validated"
- [ ] History logged properly
- [ ] Success message shows
- [ ] Redirects after validation

---

### Task 4.2: Order Cancellation
**Duration:** 3-4 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create cancel button and modal
2. Implement cancellation logic
3. Update status and log

**Cursor Prompt:**
```
Implement order cancellation feature:

1. "Cancel Order" button:
   - Red button in order header
   - Warning icon
   - Only visible for non-cancelled orders

2. Cancellation modal:
   - Clear warning message
   - Required "Reason for cancellation" textarea
   - Character limit (500 chars)
   - Confirmation checkbox: "I understand this order will be cancelled and cannot be processed"
   - Cancel Order / Go Back buttons

3. Cancellation process:
   - Validate reason is provided (min 10 chars)
   - Update order status to "Cancelled"
   - Set cancelled_by to current user_id
   - Set cancelled_at to current timestamp
   - Set cancelled_reason to provided text
   - Log to audit_log
   - Show success message
   - Redirect to order list

4. Cancelled order display:
   - Show red "Cancelled" badge
   - Display cancellation reason in header
   - Display cancelled by and date
   - Disable all editing
   - Show "Order Cancelled" overlay

Error handling for database failures.
```

**Deliverables:**
- ✅ Cancel button working
- ✅ Modal with required reason
- ✅ Status updates correctly
- ✅ Cancellation info stored
- ✅ Audit log entry created
- ✅ Cancelled orders display properly

**Testing Checklist:**
- [ ] Cancel button visible for active orders
- [ ] Modal requires reason (min chars)
- [ ] Confirmation checkbox required
- [ ] Status changes to "Cancelled"
- [ ] All cancellation fields populated
- [ ] Audit log entry created
- [ ] Cannot edit cancelled orders

---

### Task 4.3: Audit Log Viewer
**Duration:** 4-5 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create audit log modal/panel
2. Display all changes for order
3. Format for readability
4. Add filtering options

**Cursor Prompt:**
```
Create the Audit Log viewer:

1. "View Audit Log" button:
   - Opens modal or side panel
   - Icon showing history/clock

2. Audit log display:
   - Chronological list (newest first)
   - Each entry shows:
     * Timestamp (formatted: "Jan 4, 2026 2:30 PM")
     * User name and role
     * Action type (badge: price_change, status_change, etc.)
     * Field changed
     * Old value → New value (with diff highlighting)
     * Reason (if provided)
     * Order line number (if line-level change)

3. Entry formatting:
   - Status changes: Large badge with timeline connector
   - Price changes: Highlighted in yellow
   - Field edits: Standard format
   - System actions: Gray italics

4. Filtering:
   - Filter by action type (checkboxes)
   - Filter by user
   - Filter by date range
   - Search by field name

5. Export option:
   - "Export Audit Log" button
   - Download as CSV
   - Include all filtered entries

Make it visually scannable and follow /docs/STYLE_GUIDE.md
```

**Deliverables:**
- ✅ Audit log viewer working
- ✅ All entries displaying correctly
- ✅ Chronological ordering
- ✅ Filtering functional
- ✅ CSV export working
- ✅ Visual formatting clear

**Testing Checklist:**
- [ ] All audit entries display
- [ ] Timestamps formatted correctly
- [ ] User names shown
- [ ] Old/new values visible
- [ ] Filtering works
- [ ] Export generates correct CSV
- [ ] Visual hierarchy clear

---

## Phase 5: XML Export (Week 7)

### Task 5.1: XML Generation
**Duration:** 8-10 hours
**Status:** ⬜ Not Started
**Steps:**
1. Define PeopleSoft XML schema
2. Create XML builder utility
3. Implement data transformation
4. Handle edge cases

**Cursor Prompt:**
```
Implement XML export for PeopleSoft integration:

1. Create XML schema based on PeopleSoft requirements:
   - Document the expected XML structure in /docs/PEOPLESOFT_XML_SCHEMA.md
   - Include all required fields
   - Define data type mappings
   - Handle optional fields

2. XML builder utility:
   - Create /lib/xml-builder.ts
   - Function: generateOrderXML(orderId: string)
   - Fetch order with all related data:
     * Order header (use validated values where they exist, fallback to original)
     * Order lines (use validated values)
     * Customer information
     * Ship-to address
     * Carrier info
   - Transform data to XML structure
   - Validate required fields are present
   - Handle null/undefined values

3. Data transformation rules:
   - Use validated_* fields if present, otherwise original_* fields
   - Format dates to PeopleSoft format (YYYY-MM-DD)
   - Format prices to 2 decimal places
   - Escape special XML characters
   - Handle multi-line addresses

4. Validation:
   - Check order status is "Validated"
   - Verify all required fields populated
   - Ensure no invalid items in order
   - Return validation errors if any

5. Error handling:
   - Database query errors
   - Missing required data
   - XML generation errors
   - Provide detailed error messages

Include comprehensive TypeScript types and JSDoc comments.
```

**Deliverables:**
- ✅ XML schema documented
- ✅ XML builder utility created
- ✅ Data transformation working
- ✅ Validation checks in place
- ✅ Error handling comprehensive
- ✅ Type safety enforced

**Testing Checklist:**
- [ ] XML generates correctly
- [ ] All required fields included
- [ ] Data properly formatted
- [ ] Validated values used
- [ ] Special characters escaped
- [ ] Validation prevents invalid exports
- [ ] Error messages helpful

---

### Task 5.2: Export UI & Status Tracking
**Duration:** 4-5 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create export button
2. Show preview before export
3. Update status after export
4. Track export history

**Cursor Prompt:**
```
Create the XML export user interface:

1. "Export to XML" button:
   - Only enabled when status = "Validated"
   - Prominent blue button
   - Shows XML file icon

2. Export preview modal:
   - Click export opens preview
   - Show formatted XML (syntax highlighted)
   - Show order summary:
     * Order number
     * Customer
     * Line count
     * Total amount
   - Validation status indicators
   - "Download XML" and "Cancel" buttons

3. Download process:
   - Generate XML using xml-builder utility
   - Create blob and trigger download
   - Filename: ORDER_[ordernumber]_[date].xml
   - Update order status to "Exported"
   - Set exported_at timestamp
   - Log to audit_log
   - Show success message with filename

4. Export tracking:
   - Create exports table:
     * id, order_id, exported_by, exported_at, filename
   - Store export record
   - Display export history in audit log
   - Show "Last Exported" info in order header

5. Re-export handling:
   - Allow re-export if needed
   - Show warning if already exported
   - Track all export instances
   - Increment filename (v1, v2, etc.)

Include loading states and error handling.
```

**Deliverables:**
- ✅ Export button functional
- ✅ Preview modal working
- ✅ XML download working
- ✅ Status updated after export
- ✅ Export history tracked
- ✅ Re-export handled properly

**Testing Checklist:**
- [ ] Button only enabled for validated orders
- [ ] Preview shows correct XML
- [ ] Download triggers correctly
- [ ] Filename format correct
- [ ] Status changes to "Exported"
- [ ] Export logged to database
- [ ] Re-export increments version
- [ ] Success message shows

---

### Task 5.3: Batch Export Preparation
**Duration:** 3-4 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create export queue view
2. Show all validated orders ready for export
3. Prepare for batch job integration

**Cursor Prompt:**
```
Create batch export preparation view:

1. "Ready for Export" page:
   - List all orders with status = "Validated"
   - Table columns:
     * Order Number
     * Customer
     * Validated Date
     * Validated By
     * Line Count
     * Total Amount
     * Time in Queue
   - Sort by validated_at (oldest first)

2. Batch export indicator:
   - Show next scheduled batch time
   - Display: "Next batch export in: XX minutes"
   - Update countdown in real-time
   - Show orders that will be included

3. Manual override option (for admins):
   - "Trigger Batch Now" button
   - Confirmation modal
   - Logs manual trigger to audit

4. Export status monitoring:
   - Real-time status updates
   - Show when batch starts
   - Update status as orders export
   - Display success/failure counts

This prepares for Phase 2 automated batch integration.
For now, manual export is sufficient for MVP.
```

**Deliverables:**
- ✅ Ready for export view created
- ✅ Orders listed correctly
- ✅ Countdown timer working
- ✅ Manual trigger functional (admin only)
- ✅ Status monitoring in place

**Testing Checklist:**
- [ ] All validated orders shown
- [ ] Sorting works correctly
- [ ] Countdown accurate
- [ ] Manual trigger works
- [ ] Status updates display

---

## Phase 6: ERP Integration & Closed Loop (Week 8)

### Task 6.1: ERP Order Number Entry
**Duration:** 3-4 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create order number input field
2. Validate format
3. Update status to ERP Processed
4. Display completed status

**Cursor Prompt:**
```
Implement ERP order number tracking:

1. Add field to order detail page:
   - Only visible when status = "Exported"
   - Label: "PeopleSoft Order Number"
   - Input field with validation
   - "Save Order Number" button

2. Input validation:
   - Required field
   - Format: Alphanumeric, 10-15 characters
   - Check for duplicates (prevent same ERP number twice)
   - Real-time validation feedback

3. Save process:
   - Update order.erp_order_number
   - Change status to "ERP Processed"
   - Set erp_processed_at timestamp
   - Set erp_processed_by to current user
   - Log to audit_log
   - Show success message
   - Display confirmation

4. Display completed order:
   - Show green "ERP Processed" badge
   - Display ERP order number prominently
   - Show processed date and user
   - Make order read-only (cannot edit)
   - Add "Reprocess" option (admin only, if needed)

5. Notification:
   - Email notification to CSR (optional)
   - Dashboard update for completed orders

Prevent accidental overwrites of existing ERP numbers.
```

**Deliverables:**
- ✅ Input field displaying correctly
- ✅ Validation working
- ✅ Status update to ERP Processed
- ✅ ERP number stored
- ✅ Audit logged
- ✅ Completed state displays

**Testing Checklist:**
- [ ] Field only shows for exported orders
- [ ] Validation prevents invalid formats
- [ ] Duplicate check works
- [ ] Status changes correctly
- [ ] ERP number saves
- [ ] Audit entry created
- [ ] Cannot edit processed orders

---

### Task 6.2: Closed Loop Reporting
**Duration:** 4-5 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create order tracking report
2. Show orders at each status
3. Identify stuck orders
4. Export reports

**Cursor Prompt:**
```
Create closed-loop tracking dashboard:

1. Dashboard page: "/reports/tracking"
   - Overview cards:
     * Total orders this month
     * Pending count
     * Under Review count
     * Validated count
     * Exported count
     * ERP Processed count
     * Cancelled count
   - Click card to filter list below

2. Status funnel visualization:
   - Visual funnel showing orders at each stage
   - Percentage completion rates
   - Average time at each stage
   - Identify bottlenecks

3. Stuck order detection:
   - Flag orders in same status > 24 hours
   - Highlight in red
   - "Needs Attention" section
   - Show assigned CSR

4. Order tracking table:
   - All orders with complete history
   - Columns:
     * Order Number
     * Customer
     * Current Status
     * Days in Current Status
     * Created Date
     * Last Updated
     * Assigned CSR
     * Actions
   - Filtering and sorting
   - Export to CSV

5. SLA tracking:
   - Define SLAs for each status
   - Show orders approaching SLA breach
   - Red/yellow/green indicators

Follow /docs/STYLE_GUIDE.md for visualizations.
```

**Deliverables:**
- ✅ Tracking dashboard created
- ✅ Overview cards working
- ✅ Status funnel displaying
- ✅ Stuck orders identified
- ✅ Tracking table functional
- ✅ CSV export working

**Testing Checklist:**
- [ ] All counts accurate
- [ ] Funnel visualization correct
- [ ] Stuck orders flagged
- [ ] SLA tracking working
- [ ] Filtering works
- [ ] CSV export complete

---

## Phase 7: Polish & Testing (Week 9-10)

### Task 7.1: Error Handling & Edge Cases
**Duration:** 6-8 hours
**Status:** ⬜ Not Started
**Steps:**
1. Review all error scenarios
2. Add comprehensive error handling
3. Create user-friendly error messages
4. Add retry mechanisms

**Areas to Review:**
- Database connection failures
- SharePoint authentication failures
- PDF not found
- Missing customer price lists
- Invalid item numbers
- Concurrent editing conflicts
- Network timeouts
- Invalid data formats

**Cursor Prompt:**
```
Implement comprehensive error handling:

1. Error boundary components:
   - Page-level error boundaries
   - Component-level error boundaries
   - Fallback UI with retry option
   - Error logging to console

2. Database error handling:
   - Connection failures → Show retry button
   - Query errors → Log and show user-friendly message
   - Timeout errors → Automatic retry with backoff
   - Constraint violations → Specific validation messages

3. API error handling:
   - SharePoint auth failures → Re-authenticate flow
   - PDF fetch failures → Show placeholder, retry option
   - Rate limiting → Queue requests, show waiting message

4. User input validation:
   - Client-side validation (immediate feedback)
   - Server-side validation (security)
   - Clear error messages
   - Field-level error display

5. Edge cases:
   - Empty result sets → Helpful empty states
   - Missing data → Graceful degradation
   - Concurrent edits → Lock mechanism or last-write-wins with warning
   - Stale data → Auto-refresh or notification

6. Error toast/notification system:
   - Success messages (green, 3 seconds)
   - Error messages (red, until dismissed)
   - Warning messages (yellow, 5 seconds)
   - Info messages (blue, 3 seconds)

Create error logging utility for debugging.
```

**Deliverables:**
- ✅ Error boundaries implemented
- ✅ All error scenarios handled
- ✅ User-friendly error messages
- ✅ Retry mechanisms working
- ✅ Toast notification system
- ✅ Error logging utility

---

### Task 7.2: Performance Optimization
**Duration:** 4-6 hours
**Status:** ⬜ Not Started
**Steps:**
1. Implement data caching
2. Optimize database queries
3. Add pagination
4. Lazy load components

**Cursor Prompt:**
```
Optimize application performance:

1. Database query optimization:
   - Add indexes to frequently queried columns:
     * orders: customer_id, status, assigned_csr_id
     * order_lines: order_id
     * audit_log: order_id
   - Use select specific columns (avoid SELECT *)
   - Implement query batching where possible

2. Pagination:
   - Order list: 50 orders per page
   - Audit log: 100 entries per page
   - Implement infinite scroll or traditional pagination
   - Cursor-based pagination for better performance

3. Client-side caching:
   - Cache customer price lists (refresh every 4 hours)
   - Cache valid items list (refresh daily)
   - Cache user permissions (refresh on login)
   - Use SWR or React Query for data fetching

4. Component optimization:
   - Lazy load PDF viewer component
   - Lazy load audit log modal
   - Memoize expensive calculations
   - Use React.memo for pure components
   - Debounce search inputs (300ms)

5. Image and asset optimization:
   - Optimize images in style guide
   - Use Next.js Image component
   - Lazy load images below fold

6. Loading states:
   - Skeleton loaders for tables
   - Spinner for small components
   - Progress bars for large operations
   - Optimistic UI updates where safe

Monitor with React DevTools Profiler.
```

**Deliverables:**
- ✅ Database indexes added
- ✅ Queries optimized
- ✅ Pagination implemented
- ✅ Caching strategy working
- ✅ Components optimized
- ✅ Loading states polished

---

### Task 7.3: Responsive Design & Accessibility
**Duration:** 4-6 hours
**Status:** ⬜ Not Started
**Steps:**
1. Test on mobile devices
2. Fix responsive issues
3. Add accessibility features
4. Test with screen readers

**Cursor Prompt:**
```
Ensure responsive design and accessibility:

1. Responsive breakpoints (Tailwind):
   - Mobile: < 640px
   - Tablet: 640px - 1024px
   - Desktop: > 1024px

2. Mobile adaptations:
   - Stack PDF viewer and order details vertically
   - Hamburger menu for navigation
   - Touch-friendly button sizes (min 44x44px)
   - Simplified table view (show key columns only)
   - Swipe gestures for navigation

3. Accessibility (WCAG 2.1 AA):
   - Semantic HTML elements
   - Proper heading hierarchy (h1 → h2 → h3)
   - Alt text for all images
   - ARIA labels for interactive elements
   - Keyboard navigation (tab, enter, esc)
   - Focus indicators visible
   - Color contrast ratios meet standards
   - Skip to main content link

4. Screen reader support:
   - Descriptive labels for form inputs
   - Status announcements for dynamic content
   - Table headers properly associated
   - Error messages associated with fields

5. Form accessibility:
   - Required field indicators
   - Error summary at top of form
   - Inline error messages
   - Success confirmations

Test with:
- Chrome DevTools mobile emulator
- Real mobile device
- NVDA or JAWS screen reader
- Keyboard-only navigation
```

**Deliverables:**
- ✅ Fully responsive on all devices
- ✅ Touch-friendly on mobile
- ✅ WCAG 2.1 AA compliant
- ✅ Keyboard navigation works
- ✅ Screen reader compatible

---

### Task 7.4: User Testing & Feedback
**Duration:** Ongoing (1-2 weeks)
**Status:** ⬜ Not Started
**Steps:**
1. User acceptance testing with CSRs
2. Collect feedback
3. Prioritize fixes
4. Implement improvements

**Testing Checklist:**
```
Test with actual CSR users:

1. Order Review workflow:
   - [ ] Can find assigned orders easily
   - [ ] Status badges clear and understandable
   - [ ] Filtering and search work as expected
   - [ ] Navigation intuitive

2. Order Detail workflow:
   - [ ] PDF loads quickly and displays correctly
   - [ ] Can compare PDF to extracted data easily
   - [ ] Price validation indicators clear
   - [ ] Can identify issues quickly

3. Editing workflow:
   - [ ] Editing fields is straightforward
   - [ ] Validation messages helpful
   - [ ] Changes save reliably
   - [ ] Undo/cancel works

4. Validation & Export:
   - [ ] Understand validation requirements
   - [ ] Can complete validation successfully
   - [ ] XML export works reliably
   - [ ] ERP number entry clear

5. Overall experience:
   - [ ] Interface feels professional
   - [ ] Matches style guide expectations
   - [ ] Performance acceptable
   - [ ] Error messages helpful
   - [ ] Confidence in using system

Feedback collection:
- Use survey (scale 1-10)
- Conduct interviews
- Record pain points
- Note feature requests
- Track time to complete tasks
```

**Deliverables:**
- ✅ UAT completed with 3+ CSR users
- ✅ Feedback documented
- ✅ Critical issues fixed
- ✅ User satisfaction > 8/10

---

## Phase 8: Deployment & Launch (Week 11-12)

### Task 8.1: Production Environment Setup
**Duration:** 4-6 hours
**Status:** ⬜ Not Started
**Steps:**
1. Set up production Supabase project
2. Configure production environment
3. Set up deployment pipeline
4. Configure domain and SSL

**Cursor Prompt:**
```
Prepare production deployment:

1. Production Supabase:
   - Create new Supabase production project
   - Copy schema from development
   - Set up production RLS policies
   - Configure backups (daily automated)
   - Set up monitoring and alerts

2. Environment variables:
   - Create .env.production file
   - Update all API keys to production values
   - Configure SharePoint production credentials
   - Set secure session secrets
   - Never commit to Git

3. Next.js production build:
   - Test production build locally: npm run build
   - Fix any build errors
   - Optimize bundle size
   - Configure caching headers

4. Deployment platform (Vercel recommended):
   - Connect GitHub repository
   - Configure automatic deployments
   - Set environment variables in Vercel
   - Configure custom domain
   - Enable SSL certificate
   - Set up preview deployments

5. Monitoring setup:
   - Error tracking (Sentry or similar)
   - Performance monitoring
   - Uptime monitoring
   - Database performance monitoring

Document deployment process in /docs/DEPLOYMENT.md
```

**Deliverables:**
- ✅ Production Supabase configured
- ✅ Deployment pipeline working
- ✅ Domain configured with SSL
- ✅ Monitoring active
- ✅ Deployment documented

---

### Task 8.2: Data Migration
**Duration:** 3-4 hours
**Status:** ⬜ Not Started
**Steps:**
1. Export development data
2. Clean and validate
3. Import to production
4. Verify data integrity

**Migration Checklist:**
```
1. Export from development:
   - [ ] Users and CSR profiles
   - [ ] Customers
   - [ ] CSR-Customer assignments
   - [ ] Valid items catalog
   - [ ] Customer price lists
   - [ ] Test orders (optional)

2. Data cleaning:
   - [ ] Remove test data
   - [ ] Verify all required fields
   - [ ] Check for duplicates
   - [ ] Validate relationships

3. Import to production:
   - [ ] Create SQL migration scripts
   - [ ] Test on staging first
   - [ ] Run production import
   - [ ] Verify record counts

4. Verification:
   - [ ] All users can login
   - [ ] CSR assignments correct
   - [ ] Price lists accessible
   - [ ] Item catalog complete
   - [ ] Run test order through system
```

**Deliverables:**
- ✅ Production data imported
- ✅ Data integrity verified
- ✅ No data loss
- ✅ Relationships intact

---

### Task 8.3: Security Hardening
**Duration:** 3-4 hours
**Status:** ⬜ Not Started
**Steps:**
1. Security audit
2. Implement security best practices
3. Penetration testing
4. Fix vulnerabilities

**Security Checklist:**
```
1. Authentication & Authorization:
   - [ ] Passwords hashed (bcrypt)
   - [ ] Session tokens secure
   - [ ] JWT properly configured
   - [ ] RLS policies tested
   - [ ] No privilege escalation possible

2. Data Security:
   - [ ] All API routes protected
   - [ ] Input sanitization on all forms
   - [ ] SQL injection prevented (parameterized queries)
   - [ ] XSS prevention (React escapes by default, verify)
   - [ ] CSRF tokens if needed

3. Environment Security:
   - [ ] No secrets in code
   - [ ] Environment variables secure
   - [ ] .env files in .gitignore
   - [ ] Production keys different from dev

4. Network Security:
   - [ ] HTTPS enforced
   - [ ] CORS properly configured
   - [ ] Rate limiting on API routes
   - [ ] DDoS protection (Vercel provides)

5. Audit & Logging:
   - [ ] All sensitive actions logged
   - [ ] Audit log immutable
   - [ ] Failed login attempts tracked
   - [ ] Security events monitored

6. Third-party Security:
   - [ ] Dependencies up to date
   - [ ] npm audit shows no critical issues
   - [ ] Supabase security best practices followed
   - [ ] SharePoint tokens encrypted

Run: npm audit and fix critical issues
```

**Deliverables:**
- ✅ Security audit completed
- ✅ All critical vulnerabilities fixed
- ✅ Penetration test passed
- ✅ Security documentation updated

---

### Task 8.4: Training & Documentation
**Duration:** 4-6 hours
**Status:** ⬜ Not Started
**Steps:**
1. Create user documentation
2. Record training videos
3. Create admin documentation
4. Conduct training sessions

**Documentation to Create:**
```
1. User Guide (/docs/USER_GUIDE.md):
   - Getting started
   - Logging in
   - Finding your orders
   - Reviewing an order
   - Editing order details
   - Validating an order
   - Exporting to XML
   - Entering ERP order numbers
   - Cancelling orders
   - Viewing audit logs
   - Troubleshooting common issues

2. Training Videos:
   - Overview (5 min)
   - Processing your first order (10 min)
   - Handling price discrepancies (8 min)
   - Using the PDF viewer (5 min)
   - Audit trail and compliance (7 min)

3. Admin Guide (/docs/ADMIN_GUIDE.md):
   - Managing CSR assignments
   - User access control
   - Monitoring system health
   - Database backups
   - Troubleshooting
   - Common admin tasks

4. Quick Reference Card:
   - One-page PDF
   - Keyboard shortcuts
   - Status meanings
   - Common workflows
   - Support contacts

5. FAQ Document:
   - 20+ common questions and answers
   - Searchable
   - Regularly updated
```

**Deliverables:**
- ✅ User guide complete
- ✅ Training videos recorded
- ✅ Admin guide complete
- ✅ Quick reference card created
- ✅ FAQ documented
- ✅ Training sessions conducted

---

### Task 8.5: Launch & Handoff
**Duration:** 2-3 hours
**Status:** ⬜ Not Started
**Steps:**
1. Soft launch with limited users
2. Monitor for issues
3. Full launch
4. Handoff to operations team

**Launch Plan:**
```
Week 1: Soft Launch
- Deploy to production
- Enable for 2-3 CSR users
- Monitor closely for issues
- Collect feedback
- Fix any critical bugs

Week 2: Phased Rollout
- Enable for 50% of CSR users
- Continue monitoring
- Address feedback
- Optimize performance

Week 3: Full Launch
- Enable for all CSR users
- Announcement email
- Support available
- Monitor usage metrics

Post-Launch:
- Daily check-ins (first week)
- Weekly check-ins (first month)
- Monthly reviews thereafter
- Regular updates and improvements
```

**Deliverables:**
- ✅ Soft launch successful
- ✅ No critical issues
- ✅ Full launch completed
- ✅ Handoff documentation provided
- ✅ Support plan in place

---

## Phase 9: Post-Launch & Phase 2 Features (Ongoing)

### Immediate Post-Launch (First Month)

**Task 9.1: Monitoring & Support**
**Status:** ⬜ Not Started
- Daily system health checks
- Monitor error rates
- Track user adoption
- Respond to support requests
- Fix bugs as discovered

**Task 9.2: Performance Tuning**
**Status:** ⬜ Not Started
- Analyze actual usage patterns
- Optimize slow queries
- Improve caching
- Reduce load times

**Task 9.3: User Feedback Loop**
**Status:** ⬜ Not Started
- Weekly feedback reviews
- Feature request tracking
- Prioritize improvements
- Plan sprints for enhancements

---

### Phase 2 Features (Months 2-6)

**Task 9.4: Admin Panel** (2-3 weeks)
**Status:** ⬜ Not Started
- CSR-Customer assignment management
- User management interface
- System configuration
- Reporting dashboard

**Task 9.5: Automated Batch Export** (2-3 weeks)
**Status:** ⬜ Not Started
- Scheduled job every 30 minutes
- Automatic XML generation for validated orders
- SFTP upload to PeopleSoft
- Success/failure notifications
- Retry logic for failures

**Task 9.6: Advanced Features** (4-6 weeks)
**Status:** ⬜ Not Started
- Bulk operations (validate multiple orders)
- Advanced filtering and search
- Custom reports
- Email notifications for price variances
- Dashboard analytics
- Mobile app (if needed)

**Task 9.7: PeopleSoft API Integration** (3-4 weeks)
**Status:** ⬜ Not Started
- Direct API integration
- Automatic ERP order number retrieval
- Real-time status sync
- Eliminate manual XML upload

---

## Success Metrics

### Technical Metrics
- [ ] Page load time < 2 seconds
- [ ] 99.9% uptime
- [ ] Zero critical security vulnerabilities
- [ ] All orders processed without data loss

### User Metrics
- [ ] User satisfaction > 8/10
- [ ] Training completion > 95%
- [ ] Average order processing time < 10 minutes
- [ ] Error rate < 1%

### Business Metrics
- [ ] 100% of PDF orders processed through system
- [ ] Pricing discrepancy detection > 95%
- [ ] Complete audit trail for all orders
- [ ] Zero orders lost/untracked

---

## Risk Management

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| SharePoint auth fails | Medium | High | Implement robust retry logic, fallback manual upload |
| PDF parsing errors | Medium | Medium | Extensive testing, manual override option |
| Database performance | Low | High | Proper indexing, monitoring, scaling plan |
| Third-party API changes | Low | Medium | Version locking, monitoring for deprecations |

### Project Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep | High | Medium | Strict Phase 1 focus, Phase 2 for extras |
| User adoption resistance | Medium | High | Early user involvement, training, support |
| Timeline overrun | Medium | Medium | Buffer weeks, prioritize ruthlessly |
| Technical skill gaps | Medium | Medium | Leverage AI, community support, consultants if needed |

---

## Resources & Budget Estimates

### Software Costs (Monthly)
- Supabase: $25/month (Pro plan)
- Vercel: $20/month (Pro plan)
- GitHub: Free (private repos included)
- Domain: $15/year
- Monitoring (Sentry): $26/month
- **Total: ~$71/month**

### Time Investment
- **Your Time:** 15-20 hours/week × 12 weeks = 180-240 hours
- **AI Assistance:** Cursor subscription: $20/month
- **Consultant Review (Optional):** 10 hours @ $100-200/hr = $1,000-2,000

### Total Estimated Cost
- **DIY with AI:** $1,000-1,500 (12 weeks)
- **With Consultant Review:** $2,000-3,500 (12 weeks)

---

## Project Tracking

### Current Phase: Phase 0 - Project Setup
### Current Week: Week 1
### Overall Progress: 0% Complete

### Next 3 Tasks to Complete:
1. Task 0.1: Environment Setup
2. Task 0.2: Project Initialization
3. Task 0.3: Documentation Setup

---

## Notes & Updates
*Use this section to track decisions, blockers, and important notes as you progress*

---

Last Updated: January 4, 2026
