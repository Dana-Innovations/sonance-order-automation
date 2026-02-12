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

async function fixNodes() {
  try {
    console.log('🔧 Fixing validation nodes with correct n8n v2 syntax...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    // Find and fix the three validation nodes
    const node1 = workflow.nodes.find(n => n.id === 'add-header-context');
    const node3 = workflow.nodes.find(n => n.id === 'apply-product-mapping');

    if (!node1 || !node3) {
      throw new Error('Could not find all validation nodes!');
    }

    console.log('Step 2: Fixing "Add Header Context to Line" node...');
    console.log('  Using $input.all() to process items correctly\n');

    // Node 1: Add Header Context - process all items
    node1.parameters.jsCode = `// Add PS_Customer_ID to each line item for lookup
// Get the PS_Customer_ID from the AI Agent output
const psCustomerId = $node["AI Agent: Extract Order Data"].json.output.PS_Customer_ID;

// Process all input items and add ps_customer_id to each
return $input.all().map(item => ({
  json: {
    ...item.json,
    ps_customer_id: psCustomerId
  }
}));`;
    console.log('  ✅ Fixed with correct $input.all() syntax\n');

    console.log('Step 3: Fixing "Apply Product Mapping" node...');
    console.log('  Using proper item access from previous nodes\n');

    // Node 3: Apply Product Mapping
    node3.parameters.jsCode = `// Apply product mapping if found and sonanceProductOrig is null/empty
// Get the line item from Add Header Context node
const contextItems = $node["Add Header Context to Line"].json;
const lineItem = Array.isArray(contextItems) ? contextItems[0] : contextItems;

// Get the lookup results from Lookup Product Mapping node
const lookupResults = $input.all();
const mapping = (lookupResults.length > 0 && lookupResults[0].json) ? lookupResults[0].json : null;

// Check if sonanceProductOrig is null/empty
const sonanceSkuEmpty = !lineItem.sonanceProductOrig ||
                        (typeof lineItem.sonanceProductOrig === 'string' && lineItem.sonanceProductOrig.trim() === "");

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
    console.log('  ✅ Fixed with proper node data access\n');

    console.log('Step 4: Sending updated workflow...');
    const payload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: {
        executionOrder: workflow.settings.executionOrder || 'v1'
      }
    };

    const result = await makeRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, payload);

    console.log('\n✅ SUCCESS! All validation nodes have been fixed.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   CORRECTED CODE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('1️⃣  Add Header Context to Line:');
    console.log('   - Uses $input.all() to get all items');
    console.log('   - Maps over items and adds ps_customer_id');
    console.log('   - Gets PS_Customer_ID from AI Agent node\n');

    console.log('2️⃣  Lookup Product Mapping:');
    console.log('   - No changes (Supabase node)\n');

    console.log('3️⃣  Apply Product Mapping:');
    console.log('   - Gets line item from Add Header Context node');
    console.log('   - Gets lookup results from Lookup Product Mapping');
    console.log('   - Applies mapping logic if conditions met\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 The workflow is now ready to test again!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixNodes();
