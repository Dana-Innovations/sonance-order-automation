const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, 'supabase', 'migrations', '039_add_cust_order_number_to_mappings.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('\n=== Migration SQL to Run in Supabase SQL Editor ===\n');
console.log(sql);
console.log('\n=== End of Migration SQL ===\n');
console.log('Copy the SQL above and run it in your Supabase SQL Editor.');
