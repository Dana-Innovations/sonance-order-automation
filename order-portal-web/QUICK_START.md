# Quick Start - Testing the Order Portal

## Immediate Next Steps

### 1. Configure Environment Variables

Create a file named `.env.local` in the `order-portal-web` directory with:

**Important:** This is a plain text file - no quotes, no backticks, just the variables:

NEXT_PUBLIC_SUPABASE_URL=https://xgftwwircksmhevzkrhn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

**To get your keys:**
1. Go to https://supabase.com/dashboard
2. Select your "Sonance Order Automation" project
3. Go to Settings → API
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### 2. Create Test Users in Supabase Auth

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Enter the **exact email** that you used in `csr_assignments` table
4. Set a password
5. Click **Create User**

**Important:** The email must match exactly what's in your `csr_assignments.user_email` column!

### 3. Start the Development Server

```bash
cd order-portal-web
npm install  # Only needed first time
npm run dev
```

The app will start at: **http://localhost:3000**

### 4. Test Login

1. Open http://localhost:3000 in your browser
2. You should be redirected to the login page
3. Enter the email and password of a user you created
4. Click "Sign in"

**Expected Result:** You should see the Orders page with any orders assigned to that user's email.

## Quick Verification

Run this in Supabase SQL Editor to verify your setup:

```sql
-- Check your CSR assignments
SELECT 
  ca.user_email,
  ca.ps_customer_id,
  c.customer_name,
  COUNT(o.id) as order_count
FROM csr_assignments ca
JOIN customers c ON ca.ps_customer_id = c.ps_customer_id
LEFT JOIN orders o ON o.ps_customer_id = c.ps_customer_id
GROUP BY ca.user_email, ca.ps_customer_id, c.customer_name;
```

This shows:
- Which emails are assigned
- Which customers they're assigned to
- How many orders each customer has

## Common First-Time Issues

### "No orders found"
- ✅ Check that orders exist in the `orders` table
- ✅ Verify the `ps_customer_id` in orders matches the `ps_customer_id` in your `csr_assignments`
- ✅ Make sure you're logged in with the email that's in `csr_assignments`

### Login doesn't work
- ✅ Verify the user exists in Supabase Auth (Authentication → Users)
- ✅ Check that the email matches exactly (case-sensitive)
- ✅ Verify environment variables are set correctly
- ✅ Check browser console for errors

### Can't see the app
- ✅ Make sure you ran `npm install` first
- ✅ Check that `npm run dev` is running without errors
- ✅ Verify you're accessing http://localhost:3000

## What to Test First

1. **Login** - Can you log in?
2. **Order List** - Do you see orders? (If you have test orders)
3. **Order Detail** - Click an order number, does it open?
4. **Navigation** - Try clicking between Orders and Reports

## Need Help?

See `TESTING_GUIDE.md` for comprehensive testing instructions.

