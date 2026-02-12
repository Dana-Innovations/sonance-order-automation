# Database Migration Automation Guide

## ✅ Setup Complete!

Your database automation is now fully configured. Claude Code can now automatically apply all database migrations!

## 🎯 What Was Created

### 1. Environment Configuration
- **File**: `order-portal-web/.env.local`
- **Added**: `SUPABASE_DB_PASSWORD=WMw9Fs0sEe42HrSU`
- This enables direct database access for DDL operations

### 2. Migration Script
- **File**: `apply-migration.js`
- **Purpose**: Automatically applies SQL migrations to your Supabase database
- **Usage**: `node apply-migration.js <migration-number>`

### 3. First Migration Applied
- **Migration**: `049_create_units_of_measure.sql`
- **Table Created**: `units_of_measure`
- **Fields**:
  - `id` - UUID (primary key)
  - `uom_code` - VARCHAR(20) (unique) - e.g., "EA", "CS", "BX"
  - `uom_description` - TEXT - e.g., "Each", "Case", "Box"
  - `created_at` - TIMESTAMP
  - `updated_at` - TIMESTAMP
- **Pre-populated**: 10 common UOM codes (EA, CS, BX, PK, PR, ST, LB, KG, FT, MT)

## 🚀 How to Use (For Future Migrations)

### Creating a New Migration

1. **Claude Code creates the migration file:**
   ```
   supabase/migrations/050_your_migration_name.sql
   ```

2. **Claude Code applies it automatically:**
   ```bash
   node apply-migration.js 050
   ```

That's it! No manual SQL execution needed.

### Example Usage

```bash
# Apply migration by number
node apply-migration.js 049

# Or by full path
node apply-migration.js supabase/migrations/049_create_units_of_measure.sql
```

## 🔐 Connection Details

- **Method**: Session Pooler (IPv4 compatible)
- **Host**: `aws-1-us-west-1.pooler.supabase.com`
- **Port**: `5432`
- **Database**: `postgres`

## ⚠️ Important Notes

1. **Keep your database password secure** - it's stored in `.env.local`
2. **Don't commit `.env.local` to git** - it's already in `.gitignore`
3. **If you reset the database password**, update it in `.env.local`:
   ```
   SUPABASE_DB_PASSWORD=your_new_password_here
   ```

## ✅ What's Next

Now when you ask Claude Code to make database changes:
- Claude creates the migration SQL file
- Claude runs `node apply-migration.js <number>`
- Changes are applied automatically
- No manual steps required!

## 🎉 You're All Set!

Claude Code can now fully automate your database migrations!
