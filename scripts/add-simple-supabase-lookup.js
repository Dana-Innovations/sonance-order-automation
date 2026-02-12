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

async function addSimpleSupabaseLookup() {
  try {
    console.log('🔧 Adding simple validation with Supabase node...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const splitNode = workflow.nodes.find(n => n.id === 'split-lines');
    const insertNode = workflow.nodes.find(n => n.id === 'insert-line');

    console.log('Step 2: Creating validation nodes...');

    // Node 1: Code to prepare item for lookup
    const prepareNode = {
      id: 'prepare-for-lookup',
      name: 'Prepare for Lookup',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [
        splitNode.position[0] + 300,
        splitNode.position[1]
      ],
      parameters: {
        jsCode: `// Pass through current item, adding ps_customer_id for lookup
const item = $input.first().json;
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;

// Store entire item + ps_customer_id
const enriched = {
  ...item,
  ps_customer_id: psCustomerId,
  _originalItem: JSON.stringify(item)  // Save original for later
};

return { json: enriched };`
      }
    };

    // Node 2: Supabase lookup
    const lookupNode = {
      id: 'lookup-mapping',
      name: 'Lookup Mapping',
      type: 'n8n-nodes-base.supabase',
      typeVersion: 1,
      position: [
        splitNode.position[0] + 600,
        splitNode.position[1]
      ],
      credentials: {
        supabaseApi: {
          id: '4oXs2rcry0VqJzvc',
          name: 'Supabase account'
        }
      },
      alwaysOutputData: true,
      continueOnFail: true,
      parameters: {
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
      }
    };

    // Node 3: Code to apply mapping
    const applyNode = {
      id: 'apply-mapping-result',
      name: 'Apply Mapping Result',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [
        splitNode.position[0] + 900,
        splitNode.position[1]
      ],
      parameters: {
        jsCode: `// Restore original item and apply mapping if found
const current = $input.first().json;

// Restore original item
let item;
if (current._originalItem) {
  item = JSON.parse(current._originalItem);
} else {
  // Supabase returned mapping result, need to get original from previous node
  item = JSON.parse($("Prepare for Lookup").first().json._originalItem);
}

// Check if current item has mapping data (from Supabase)
const hasMapping = current.sonance_product_sku && current.cust_product_sku;

// Check if original sonanceProductOrig is null/empty
const sonanceSkuEmpty = !item.sonanceProductOrig ||
                        (typeof item.sonanceProductOrig === 'string' &&
                         item.sonanceProductOrig.trim() === "");

// Apply mapping if conditions met
if (sonanceSkuEmpty && hasMapping) {
  item.sonanceProductOrig = current.sonance_product_sku;
  item.mappingSource = "customer_product_mappings";
  item.mappingConfidence = current.confidence_score || 1.0;
} else {
  item.mappingSource = sonanceSkuEmpty ? "none" : "ai_extraction";
}

return { json: item };`
      }
    };

    // Add nodes
    workflow.nodes.push(prepareNode, lookupNode, applyNode);

    console.log('  ✅ Created 3 validation nodes\n');

    console.log('Step 3: Connecting nodes...');

    // Split → Prepare → Lookup → Apply → Insert
    workflow.connections['Split Order Lines'] = {
      main: [[{ node: prepareNode.name, type: 'main', index: 0 }]]
    };

    workflow.connections[prepareNode.name] = {
      main: [[{ node: lookupNode.name, type: 'main', index: 0 }]]
    };

    workflow.connections[lookupNode.name] = {
      main: [[{ node: applyNode.name, type: 'main', index: 0 }]]
    };

    workflow.connections[applyNode.name] = {
      main: [[{ node: insertNode.name, type: 'main', index: 0 }]]
    };

    console.log('  ✅ Connected all nodes\n');

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

    console.log('\n✅ SUCCESS! Added validation with proper item flow.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   NEW FLOW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Split Order Lines (4 items)');
    console.log('  ↓');
    console.log('Each item flows through:');
    console.log('  1. Prepare for Lookup');
    console.log('     → Adds ps_customer_id');
    console.log('     → Saves original item in _originalItem field');
    console.log('  2. Lookup Mapping (Supabase)');
    console.log('     → Queries customer_product_mappings');
    console.log('     → Always outputs (even if no match)');
    console.log('  3. Apply Mapping Result');
    console.log('     → Restores original item');
    console.log('     → Applies mapping if found and sonanceProductOrig is null');
    console.log('  4. Insert Order Line');
    console.log('     → Inserts enriched item\n');

    console.log('Key: We save the original item so we can restore it after');
    console.log('     the Supabase node, since Supabase replaces the item.\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test - should process all 4 items!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

addSimpleSupabaseLookup();
