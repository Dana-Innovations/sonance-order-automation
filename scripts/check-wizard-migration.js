require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigration() {
  console.log('Checking if wizard migration has been applied...\n');

  // Query the table structure
  const { data, error } = await supabase
    .from('prompt_builder_sessions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying table:', error.message);

    if (error.message.includes('does not exist')) {
      console.log('\n❌ Table "prompt_builder_sessions" does not exist.');
      console.log('You need to run migration 039 first (creates the table)');
      console.log('\nRun: node run-migration.js supabase/migrations/039_create_prompt_builder_storage.sql');
    }
    return;
  }

  // Check if wizard fields exist
  if (data && data.length > 0) {
    const record = data[0];
    const hasWizardFields =
      'customer_name' in record &&
      'is_customer_wizard' in record &&
      'wizard_step' in record &&
      'customer_data' in record &&
      'child_accounts' in record;

    if (hasWizardFields) {
      console.log('✅ Migration 042 has been applied!');
      console.log('The wizard fields exist in prompt_builder_sessions table.');
    } else {
      console.log('❌ Migration 042 has NOT been applied.');
      console.log('Missing wizard fields in prompt_builder_sessions table.');
      console.log('\nRun: node run-migration.js supabase/migrations/042_add_wizard_fields_to_sessions.sql');
    }
  } else {
    // Table exists but is empty - check with a describe-like query
    console.log('Table exists but is empty. Attempting to insert a test record...\n');

    const { error: insertError } = await supabase
      .from('prompt_builder_sessions')
      .insert({
        title: 'Migration Test',
        is_customer_wizard: true,
        wizard_step: 0,
        customer_data: {},
        child_accounts: []
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.message.includes('customer_name') ||
          insertError.message.includes('is_customer_wizard') ||
          insertError.message.includes('wizard_step')) {
        console.log('❌ Migration 042 has NOT been applied.');
        console.log('Missing wizard fields:', insertError.message);
        console.log('\nRun: node run-migration.js supabase/migrations/042_add_wizard_fields_to_sessions.sql');
      }
    } else {
      console.log('✅ Migration 042 has been applied!');
      console.log('Successfully inserted test record with wizard fields.');
    }
  }
}

checkMigration().catch(console.error);
