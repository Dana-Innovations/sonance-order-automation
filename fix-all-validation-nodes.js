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

async function fixAllNodes() {
  try {
    console.log('🔧 Fixing all three validation nodes with correct n8n syntax...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    // Find all three validation nodes
    const node1 = workflow.nodes.find(n => n.id === 'add-header-context');
    const node2 = workflow.nodes.find(n => n.id === 'lookup-product-mapping');
    const node3 = workflow.nodes.find(n => n.id === 'apply-product-mapping');

    if (!node1 || !node2 || !node3) {
      throw new Error('Could not find all validation nodes!');
    }

    console.log('Step 2: Fixing "Add Header Context to Line" node...');
    // Simple, clean approach - add ps_customer_id to the current item
    node1.parameters.jsCode = `// Add PS_Customer_ID to the current item's JSON
const item = $input.item();
const psCustomerId = $("AI Agent: Extract Order Data").json.output.PS_Customer_ID;
item.json['ps_customer_id'] = psCustomerId;
return item;`;
    console.log('  ✅ Using simple $input.item() approach\n');

    console.log('Step 3: Fixing "Lookup Product Mapping" node filters...');
    // CRITICAL FIX: Use data from the CURRENT item (enriched by node 1)
    node2.parameters.filters = {
      conditions: [
        {
          keyName: 'ps_customer_id',
          condition: 'eq',
          keyValue: '={{ $json.ps_customer_id }}'  // From current item
        },
        {
          keyName: 'cust_product_sku',
          condition: 'eq',
          keyValue: '={{ $json.custproductsku }}'  // From current item
        }
      ]
    };
    console.log('  ✅ Fixed to use $json.ps_customer_id and $json.custproductsku\n');

    console.log('Step 4: Fixing "Apply Product Mapping" node...');
    // Get data from the current item and previous nodes
    node3.parameters.jsCode = `// Apply product mapping if found and sonanceProductOrig is null/empty
const item = $input.item();
const lineItem = $("Add Header Context to Line").json;

// Get the lookup result from Lookup Product Mapping node
const lookupResult = item.json;
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
    console.log('  ✅ Fixed to use $input.item() and $(nodeName) syntax\n');

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

    console.log('\n✅ SUCCESS! All validation nodes have been fixed.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   UPDATED VALIDATION FLOW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('1️⃣  Add Header Context to Line:');
    console.log('   - Gets current item with $input.item()');
    console.log('   - Adds ps_customer_id from AI Agent output');
    console.log('   - Returns enriched item\n');

    console.log('2️⃣  Lookup Product Mapping (FIXED):');
    console.log('   - Uses $json.ps_customer_id (from current item)');
    console.log('   - Uses $json.custproductsku (from current item)');
    console.log('   - Queries customer_product_mappings table\n');

    console.log('3️⃣  Apply Product Mapping:');
    console.log('   - Gets line item from Add Header Context node');
    console.log('   - Checks if mapping was found in current item');
    console.log('   - Only updates if sonanceProductOrig is null/empty\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 The workflow is now ready to test!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('⚠️  KEY FIX: Node 2 now correctly reads from the CURRENT item');
    console.log('   instead of trying to access AI Agent lineItems array.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixAllNodes();
