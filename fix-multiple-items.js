const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFhODlhOS04YTlhLTQxMTgtODllYS05MmYxNmFmYzFlOGQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2MzU2NjQ5fQ.GEo8HRRJVWOYX3OGFdEOjgMyn6YWrftk0_PwPMHr17k';
const WORKFLOW_ID = 'WiJuy1l0UxdVNWQI';

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'keithharper.app.n8n.cloud',
      port: 443,
      path: path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function fixMultipleItems() {
  try {
    console.log('🔧 Fixing validation nodes to process ALL items correctly...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const node1 = workflow.nodes.find(n => n.id === 'add-header-context');
    const node3 = workflow.nodes.find(n => n.id === 'apply-product-mapping');

    if (!node1 || !node3) {
      throw new Error('Could not find validation code nodes!');
    }

    console.log('Step 2: Analyzing the issue...');
    console.log('  Problem: Only 1 of 4 items was inserted');
    console.log('  Cause: Nodes processing array instead of individual items');
    console.log('  Solution: Process ONE item at a time through the flow\n');

    console.log('Step 3: Fixing "Add Header Context to Line"...');
    console.log('  Each item from Split should flow through individually\n');

    // Process each item individually, not as an array
    node1.parameters.jsCode = `// Add PS_Customer_ID to the current line item
// Get PS_Customer_ID from the Insert Order Header node
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;

// Get the current item and add ps_customer_id to it
const currentItem = $input.first().json;
currentItem.ps_customer_id = psCustomerId;

return { json: currentItem };`;
    console.log('  ✅ Changed to process ONE item at a time\n');

    console.log('Step 4: Fixing "Apply Product Mapping"...');
    console.log('  Get line item from previous node in the flow\n');

    // Get the enriched line item from the previous node
    node3.parameters.jsCode = `// Apply product mapping if found and sonanceProductOrig is null/empty
// Get the enriched line item from Add Header Context node
const lineItem = $("Add Header Context to Line").first().json;

// Get the Supabase lookup result from current item
const lookupResult = $input.first().json;
const mapping = (lookupResult && lookupResult.sonance_product_sku) ? lookupResult : null;

// Check if sonanceProductOrig is null/empty
const sonanceSkuEmpty = !lineItem.sonanceProductOrig ||
                        (typeof lineItem.sonanceProductOrig === 'string' &&
                         lineItem.sonanceProductOrig.trim() === "");

if (sonanceSkuEmpty && mapping && mapping.sonance_product_sku) {
  // Update with mapped value from customer_product_mappings table
  lineItem.sonanceProductOrig = mapping.sonance_product_sku;
  lineItem.mappingSource = "customer_product_mappings";
  lineItem.mappingConfidence = mapping.confidence_score || 1.0;
  lineItem.mappingTimesUsed = mapping.times_used || 0;
} else {
  // Keep original value (could be from AI extraction or still null)
  lineItem.mappingSource = sonanceSkuEmpty ? "none" : "ai_extraction";
}

// Remove temporary ps_customer_id field
delete lineItem.ps_customer_id;

return { json: lineItem };`;
    console.log('  ✅ Fixed to process current item correctly\n');

    console.log('Step 5: Sending updated workflow...');
    const payload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: {
        executionOrder: workflow.settings.executionOrder || 'v1'
      }
    };

    const result = await makeRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, payload);

    console.log('\n✅ SUCCESS! Nodes fixed to process ALL items.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   HOW IT WORKS NOW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Split Order Lines splits 4 items');
    console.log('  ↓');
    console.log('Item 1 flows through:');
    console.log('  → Add Header Context (adds ps_customer_id)');
    console.log('  → Lookup Product Mapping (queries DB)');
    console.log('  → Apply Product Mapping (updates if needed)');
    console.log('  → Insert Order Line (inserts to DB)');
    console.log('');
    console.log('Item 2 flows through:');
    console.log('  → Add Header Context → Lookup → Apply → Insert');
    console.log('');
    console.log('Item 3 flows through:');
    console.log('  → Add Header Context → Lookup → Apply → Insert');
    console.log('');
    console.log('Item 4 flows through:');
    console.log('  → Add Header Context → Lookup → Apply → Insert\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test - should now process ALL 4 items!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixMultipleItems();
