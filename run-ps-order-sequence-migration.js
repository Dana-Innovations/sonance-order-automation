// Script to create PS Order Sequence table and function
// Run with: node run-ps-order-sequence-migration.js

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('  PS Order Number Sequence Migration');
console.log('═══════════════════════════════════════════════════════════\n');

// Read migration file
const migration = fs.readFileSync(
  path.join(__dirname, 'supabase/migrations/046_create_ps_order_sequence.sql'),
  'utf8'
);

console.log('📄 Migration file loaded:\n');
console.log('   supabase/migrations/046_create_ps_order_sequence.sql\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('⚠️  IMPORTANT: Verify your starting order number!\n');
console.log('The default starting number is 7010000000.');
console.log('Edit line 12 in the migration file if you need to change it:\n');
console.log('   VALUES (1, YOUR_STARTING_NUMBER, NOW())\n');
console.log('Note: Uses BIGINT to support large numbers (up to 9 quintillion)\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('⚠️  Run this SQL in your Supabase Dashboard → SQL Editor:\n');
console.log('─────────────────────────────────────────────────────────\n');
console.log(migration);
console.log('\n─────────────────────────────────────────────────────────\n');
console.log('After running the migration:\n');
console.log('✓ PS Order Sequence table will be created');
console.log('✓ Atomic get_next_ps_order_number() function will be created');
console.log('✓ ps_order_number column will be added to orders table');
console.log('✓ Thread-safe order number assignment will be enabled\n');
