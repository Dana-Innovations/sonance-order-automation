-- Run this in Supabase SQL Editor to check if migration 042 has been applied

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'prompt_builder_sessions'
  AND column_name IN (
    'customer_name',
    'is_customer_wizard',
    'wizard_step',
    'customer_data',
    'child_accounts'
  )
ORDER BY column_name;

-- If this returns 5 rows, migration 042 is applied ✅
-- If this returns 0 rows, you need to run migration 042 ❌
