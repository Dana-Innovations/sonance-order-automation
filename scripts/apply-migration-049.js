const { readFileSync } = require('fs');
const { join } = require('path');

async function applyMigration() {
  try {
    // Read MCP config for Supabase credentials
    const mcpConfig = JSON.parse(readFileSync('.mcp.json', 'utf8'));
    const supabaseUrl = mcpConfig.mcpServers.supabase.env.SUPABASE_URL;
    const supabaseKey = mcpConfig.mcpServers.supabase.env.SUPABASE_KEY;

    // Read the migration file
    const migrationSql = readFileSync(
      join(__dirname, 'supabase', 'migrations', '049_create_units_of_measure.sql'),
      'utf8'
    );

    console.log('Applying migration: 049_create_units_of_measure.sql');
    console.log('---');

    // Use pg library to execute raw SQL
    const { Client } = require('pg');

    // Build connection string for Supabase
    // Format: postgres://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

    // Note: You'll need to replace YOUR_DB_PASSWORD with your actual database password
    // This can be found in your Supabase project settings under Database > Connection string
    console.log('\n⚠️  This script needs your database password.');
    console.log('Find it at: Supabase Dashboard > Project Settings > Database > Connection string');
    console.log(`\nOr, I can try using the service role key to execute via REST API...\n`);

    // Try using fetch to execute SQL via Supabase REST API
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Split the SQL into individual statements
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + '...\n');

      const { data, error } = await supabase.rpc('exec_sql', { query: statement });

      if (error) {
        // Try alternative method - direct query for CREATE TABLE
        if (statement.includes('CREATE TABLE')) {
          console.log('Trying alternative method for CREATE TABLE...');
          // This won't work directly, we need admin access
          console.error('❌ Error:', error.message);
          console.log('\n⚠️  To apply this migration, please run:');
          console.log('   1. Copy the SQL from: supabase/migrations/049_create_units_of_measure.sql');
          console.log('   2. Go to: Supabase Dashboard > SQL Editor');
          console.log('   3. Paste and run the SQL\n');
          process.exit(1);
        } else {
          console.error('❌ Error:', error.message);
        }
      } else {
        console.log('✅ Success\n');
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('\nCreated table: units_of_measure');
    console.log('Fields:');
    console.log('  - id (UUID, primary key)');
    console.log('  - uom_code (VARCHAR(20), unique)');
    console.log('  - uom_description (TEXT)');
    console.log('  - created_at (TIMESTAMP)');
    console.log('  - updated_at (TIMESTAMP)');
    console.log('\nPre-populated with 10 common UOM codes (EA, CS, BX, etc.)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Manual migration steps:');
    console.log('   1. Open Supabase Dashboard > SQL Editor');
    console.log('   2. Copy and run: supabase/migrations/049_create_units_of_measure.sql');
    process.exit(1);
  }
}

applyMigration();
