// Script to add AI mapping instructions field to child accounts table
// Run with: node run-mapping-instructions-migration.js

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('  AI Mapping Instructions Migration');
console.log('═══════════════════════════════════════════════════════════\n');

// Read migration file
const migration = fs.readFileSync(
  path.join(__dirname, 'supabase/migrations/045_add_mapping_instructions_to_child_accounts.sql'),
  'utf8'
);

console.log('📄 Migration file loaded:\n');
console.log('   supabase/migrations/045_add_mapping_instructions_to_child_accounts.sql\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('⚠️  Run this SQL in your Supabase Dashboard → SQL Editor:\n');
console.log('─────────────────────────────────────────────────────────\n');
console.log(migration);
console.log('\n─────────────────────────────────────────────────────────\n');
console.log('After running the migration:\n');
console.log('✓ The ai_mapping_instructions field will be added');
console.log('✓ You can add AI-specific instructions per child account');
console.log('✓ This field appears in Add/Edit child account modals\n');
