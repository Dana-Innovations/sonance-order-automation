# Troubleshooting Build Errors

## Common Build Errors and Solutions

### Error: Cannot find module '@tanstack/react-query'

**Solution:**
```bash
cd order-portal-web
npm install
```

If that doesn't work, try:
```bash
npm install @tanstack/react-query --save
```

### Error: Cannot find module 'react-pdf'

**Solution:**
```bash
cd order-portal-web
npm install react-pdf --save
npm install --save-dev @types/react-pdf
```

### Error: Module not found or TypeScript errors

**Solution:**
1. Delete `node_modules` folder
2. Delete `package-lock.json`
3. Run `npm install`
4. Restart your dev server

### Error: Environment variables not found

**Solution:**
1. Make sure `.env.local` exists in `order-portal-web` directory
2. Restart the dev server (env vars load at startup)
3. Check that variable names match exactly (case-sensitive)

### Error: User email is null

**Solution:**
- Make sure the user in Supabase Auth has an email address
- The email must match what's in `csr_assignments.user_email`

### Error: Cannot connect to Supabase

**Solution:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
3. Check Supabase project is active
4. Check browser console for specific error messages

## Quick Fix Commands

```bash
# Navigate to project
cd order-portal-web

# Clean install
rm -rf node_modules package-lock.json
npm install

# Restart dev server
npm run dev
```

## Still Having Issues?

1. **Check the terminal** where `npm run dev` is running - errors will show there
2. **Check browser console** (F12) for runtime errors
3. **Share the exact error message** - it helps identify the specific issue




















