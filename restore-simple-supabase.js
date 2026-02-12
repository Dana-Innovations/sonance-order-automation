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

async function restoreSimpleSupabase() {
  try {
    console.log('🔧 Simplifying back to Supabase node approach...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    console.log('Step 2: Removing complicated nodes...');

    // Remove debug and merge nodes
    workflow.nodes = workflow.nodes.filter(n =>
      n.id !== 'debug-before-http' &&
      n.id !== 'merge-line-and-mapping'
    );

    console.log('  ✅ Removed debug and merge nodes\n');

    console.log('Step 3: Converting back to Supabase node...');

    const lookupNode = workflow.nodes.find(n => n.id === 'lookup-product-mapping');
    const contextNode = workflow.nodes.find(n => n.id === 'add-header-context');
    const applyNode = workflow.nodes.find(n => n.id === 'apply-product-mapping');

    // Convert to Supabase node
    lookupNode.type = 'n8n-nodes-base.supabase';
    lookupNode.typeVersion = 1;
    lookupNode.credentials = {
      supabaseApi: {
        id: '4oXs2rcry0VqJzvc',
        name: 'Supabase account'
      }
    };
    lookupNode.alwaysOutputData = true;
    lookupNode.parameters = {
      operation: 'getAll',
      tableId: 'customer_product_mappings',
      returnAll: false,
      limit: 1,
      filters: {
        conditions: [
          {
            keyName: 'ps_customer_id',
            condition: 'equals',
            keyValue: '={{ $json.ps_customer_id }}'
          },
          {
            keyName: 'cust_product_sku',
            condition: 'equals',
            keyValue: '={{ $json.custproductsku }}'
          }
        ]
      }
    };

    console.log('  ✅ Converted to Supabase node\n');

    console.log('Step 4: Simplifying Add Header Context...');

    contextNode.parameters.jsCode = `// Add PS_Customer_ID to current line item
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;
const currentItem = $input.first().json;
currentItem.ps_customer_id = psCustomerId;
return { json: currentItem };`;

    console.log('  ✅ Simplified Add Header Context\n');

    console.log('Step 5: Fixing Apply Product Mapping...');

    // The key fix: get the line item from the node RIGHT BEFORE lookup
    // and get the mapping result from $input
    applyNode.parameters.jsCode = `// Apply product mapping if found and sonanceProductOrig is null/empty
// Get the line item that was passed to the Lookup node
const lineItem = $("Add Header Context to Line").item.json;

// Get the Supabase lookup result
const lookupResults = $input.all();
const mapping = (lookupResults.length > 0 && lookupResults[0].json.sonance_product_sku) ? lookupResults[0].json : null;

// Check if sonanceProductOrig is null/empty
const sonanceSkuEmpty = !lineItem.sonanceProductOrig ||
                        (typeof lineItem.sonanceProductOrig === 'string' &&
                         lineItem.sonanceProductOrig.trim() === "");

if (sonanceSkuEmpty && mapping && mapping.sonance_product_sku) {
  // Update with mapped value
  lineItem.sonanceProductOrig = mapping.sonance_product_sku;
  lineItem.mappingSource = "customer_product_mappings";
  lineItem.mappingConfidence = mapping.confidence_score || 1.0;
  lineItem.mappingTimesUsed = mapping.times_used || 0;
} else {
  // Keep original value
  lineItem.mappingSource = sonanceSkuEmpty ? "none" : "ai_extraction";
}

// Clean up temporary field
delete lineItem.ps_customer_id;

return { json: lineItem };`;

    console.log('  ✅ Fixed Apply Product Mapping\n');

    console.log('Step 6: Fixing connections...');

    // Fix connections: Context → Lookup → Apply → Insert
    workflow.connections['Add Header Context to Line'] = {
      main: [[{ node: 'Lookup Product Mapping', type: 'main', index: 0 }]]
    };

    workflow.connections['Lookup Product Mapping'] = {
      main: [[{ node: 'Apply Product Mapping', type: 'main', index: 0 }]]
    };

    // Remove old connections
    delete workflow.connections['Debug: Log Item Fields'];
    delete workflow.connections['Merge Line Item with Mapping'];

    console.log('  ✅ Fixed connections\n');

    console.log('Step 7: Sending updated workflow...');
    const payload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: {
        executionOrder: workflow.settings.executionOrder || 'v1'
      }
    };

    const result = await makeRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, payload);

    console.log('\n✅ SUCCESS! Restored simple Supabase approach.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   SIMPLIFIED FLOW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Split Order Lines (4 items)');
    console.log('  ↓');
    console.log('Each item flows through:');
    console.log('  1. Add Header Context to Line');
    console.log('     → Adds ps_customer_id to current item');
    console.log('  2. Lookup Product Mapping (Supabase node)');
    console.log('     → Queries customer_product_mappings table');
    console.log('  3. Apply Product Mapping');
    console.log('     → Updates sonanceProductOrig if null');
    console.log('  4. Insert Order Line');
    console.log('     → Inserts to database\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test - back to simple approach!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

restoreSimpleSupabase();
