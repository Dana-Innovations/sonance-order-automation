# Order Portal Testing Guide

## Prerequisites Checklist

Before testing, ensure you have:

- [x] Users added to `csr_assignments` table with their email addresses
- [ ] Environment variables configured in `.env.local`
- [ ] Supabase users created in Auth (matching the emails in `csr_assignments`)
- [ ] Test orders in the database
- [ ] SharePoint credentials configured (if testing PDF viewer)

## Step 1: Environment Setup

1. **Create `.env.local` file** in the `order-portal-web` directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xgftwwircksmhevzkrhn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# SharePoint Configuration (optional for initial testing)
SHAREPOINT_CLIENT_ID=your_client_id_here
SHAREPOINT_CLIENT_SECRET=your_client_secret_here
SHAREPOINT_TENANT_ID=your_tenant_id_here
SHAREPOINT_SITE_ID=your_site_id_here
```

2. **Get your Supabase keys:**
   - Go to your Supabase project dashboard
   - Settings → API
   - Copy the Project URL and anon/public key
   - Copy the service_role key (keep this secret!)

## Step 2: Start the Development Server

```bash
cd order-portal-web
npm install  # If you haven't already
npm run dev
```

The app should start at `http://localhost:3000`

## Step 3: Create Test Users in Supabase Auth

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User** → **Create new user**
4. Enter the email address that matches one in your `csr_assignments` table
5. Set a password (or use "Auto-generate password")
6. Click **Create User**

**Important:** The email must match exactly what you used in `csr_assignments.user_email`

## Step 4: Verify CSR Assignments

Run this query in Supabase SQL Editor to verify your assignments:

```sql
SELECT 
  ca.user_email,
  ca.ps_customer_id,
  c.customer_name
FROM csr_assignments ca
JOIN customers c ON ca.ps_customer_id = c.ps_customer_id;
```

You should see the email addresses and their assigned customers.

## Step 5: Testing Workflow

### Test 1: Login
1. Navigate to `http://localhost:3000`
2. You should be redirected to `/login`
3. Enter the email and password of a test user
4. Click "Sign in"
5. **Expected:** Redirected to `/orders` page

**Troubleshooting:**
- If login fails, check that the user exists in Supabase Auth
- Check browser console for errors
- Verify environment variables are set correctly

### Test 2: Order List View
1. After login, you should see the Orders page
2. **Expected:** 
   - See orders for customers assigned to your user email
   - If no orders, see "No orders found" message
   - Status badges display correctly
   - Order numbers are clickable links

**Troubleshooting:**
- If you see no orders, verify:
  - Your email is in `csr_assignments` table
  - There are orders with matching `ps_customer_id` values
  - Check browser console for errors

### Test 3: Filtering
1. Try the status filter checkboxes
2. Try customer search
3. Try date range filters
4. **Expected:** Orders filter correctly

### Test 4: Order Detail Page
1. Click on an order number
2. **Expected:**
   - Order detail page loads
   - Order header shows order information
   - Status automatically updates to "Under Review" if it was "Pending"
   - PDF viewer loads (if PDF URL is set)
   - Order lines table displays

**Troubleshooting:**
- If PDF doesn't load, check:
  - `order.pdf_file_url` is set
  - SharePoint credentials are configured
  - Check browser console for SharePoint errors

### Test 5: Price Validation
1. On order detail page, check the order lines
2. **Expected:**
   - Price validation indicators show (green/yellow/red)
   - Invalid items are flagged
   - Tooltips show variance percentages

**Note:** This requires:
- Products in `products` table
- Customer pricing in `customer_pricing` table

### Test 6: Line Item Editing
1. Click "Edit" on a line item
2. Modify quantity or price
3. Click "Save"
4. **Expected:**
   - Changes save successfully
   - Audit log entry created
   - Page refreshes with updated data

### Test 7: Order Validation
1. Ensure order has:
   - Ship-to address
   - Carrier selected
   - At least one line item
2. Click "Validate Order" button
3. Check the validation checklist
4. Check "I confirm this order is ready for export"
5. Click "Validate Order"
6. **Expected:**
   - Status changes to "Validated"
   - Success message
   - Redirect to order list

### Test 8: XML Export
1. Open a "Validated" order
2. Click "Export to XML"
3. Review the XML preview
4. Click "Download XML"
5. **Expected:**
   - XML file downloads
   - Status changes to "Exported"
   - Export logged in audit log

### Test 9: ERP Number Entry
1. Open an "Exported" order
2. Enter a PeopleSoft order number (10-15 alphanumeric characters)
3. Click "Save ERP Number"
4. **Expected:**
   - Status changes to "ERP Processed"
   - Order becomes read-only
   - ERP number saved

### Test 10: Order Cancellation
1. Open an active order (not cancelled)
2. Click "Cancel Order"
3. Enter cancellation reason (min 10 characters)
4. Check confirmation checkbox
5. Click "Cancel Order"
6. **Expected:**
   - Status changes to "Cancelled"
   - Order shows cancellation message
   - All editing disabled

### Test 11: Audit Log
1. Open any order
2. Click "View Audit Log"
3. **Expected:**
   - See all changes for the order
   - Can export to CSV
   - Entries show timestamp, user, action type, changes

### Test 12: Tracking Dashboard
1. Navigate to `/reports/tracking`
2. **Expected:**
   - See status count cards
   - See status funnel visualization
   - See stuck orders (if any)

## Common Issues & Solutions

### Issue: "No orders found" but orders exist in database
**Solution:**
- Verify your email in `csr_assignments` matches your Supabase Auth email exactly
- Check that orders have `ps_customer_id` values that match your assignments
- Check browser console for query errors

### Issue: Login redirects back to login page
**Solution:**
- Check environment variables are set correctly
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase project is active
- Clear browser cookies and try again

### Issue: PDF viewer shows error
**Solution:**
- PDF viewer requires SharePoint configuration
- For initial testing, you can skip PDF testing
- Or verify `order.pdf_file_url` or `customer.sharepoint_folder_id` is set

### Issue: Price validation always shows "No Price Found"
**Solution:**
- Ensure `products` table has matching product SKUs
- Ensure `customer_pricing` table has pricing for the customer and products
- Check that UOM and currency codes match

### Issue: TypeScript errors
**Solution:**
- Run `npm install` to ensure all dependencies are installed
- Check that `lib/types/database.ts` exists and is up to date
- Restart the TypeScript server in your IDE

## Testing Checklist

- [ ] Can login with test user
- [ ] See orders assigned to my email
- [ ] Can filter orders by status
- [ ] Can search orders by customer
- [ ] Can open order detail page
- [ ] Order status auto-updates to "Under Review"
- [ ] Can edit order header (address, carrier)
- [ ] Can edit line items
- [ ] Price validation indicators work
- [ ] Can validate an order
- [ ] Can export order to XML
- [ ] Can enter ERP order number
- [ ] Can cancel an order
- [ ] Can view audit log
- [ ] Can export audit log to CSV
- [ ] Tracking dashboard displays correctly
- [ ] Stuck orders detection works

## Next Steps After Testing

1. **Fix any issues** found during testing
2. **Add more test data** if needed:
   - More orders
   - More products
   - More customer pricing
3. **Configure SharePoint** for PDF viewing
4. **Set up production environment** when ready
5. **Train users** on the application

## Getting Help

If you encounter issues:
1. Check browser console for errors
2. Check terminal/console for server errors
3. Verify database queries in Supabase SQL Editor
4. Review the implementation summary in `IMPLEMENTATION_SUMMARY.md`






