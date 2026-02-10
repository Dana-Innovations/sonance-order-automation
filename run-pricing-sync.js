/**
 * CLI Wrapper for Customer Pricing Sync
 *
 * Simple command-line interface to run the pricing sync manually.
 * Used for testing and can be called from N8N workflows.
 */

const { syncPricing } = require('./sync-customer-pricing');

async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  Customer Pricing Sync - Manual Run      ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  try {
    const results = await syncPricing();

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  Sync Results                             ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(JSON.stringify(results, null, 2));

    if (results.success) {
      console.log('\n✅ Sync completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Sync failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Sync failed with unhandled error:');
    console.error(error);
    process.exit(1);
  }
}

main();
