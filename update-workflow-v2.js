const https = require('https');
const fs = require('fs');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFhODlhOS04YTlhLTQxMTgtODllYS05MmYxNmFmYzFlOGQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2MzU2NjQ5fQ.GEo8HRRJVWOYX3OGFdEOjgMyn6YWrftk0_PwPMHr17k';
const WORKFLOW_ID = 'WiJuy1l0UxdVNWQI';
const API_URL = 'keithharper.app.n8n.cloud';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: API_URL,
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

async function updateWorkflow() {
  try {
    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);

    console.log(`  Current nodes: ${workflow.nodes.length}`);

    // Save backup
    fs.writeFileSync('workflow-backup.json', JSON.stringify(workflow, null, 2));
    console.log('  ✅ Backup saved to workflow-backup.json');

    console.log('\nStep 2: Checking for existing validation nodes...');
    const existingIds = workflow.nodes.map(n => n.id);
    const nodesToAdd = ['add-header-context', 'lookup-product-mapping', 'apply-product-mapping'];
    const alreadyExists = nodesToAdd.filter(id => existingIds.includes(id));

    if (alreadyExists.length > 0) {
      console.log(`  ⚠️  Found existing nodes: ${alreadyExists.join(', ')}`);
      console.log('  Removing them first...');
      workflow.nodes = workflow.nodes.filter(n => !nodesToAdd.includes(n.id));
    }

    console.log('\nStep 3: Adding new validation nodes...');

    // Node 1: Add Header Context
    workflow.nodes.push({
      parameters: {
        jsCode: `// Add PS_Customer_ID to each line item for lookup
const lineItem = $input.item.json;
const psCustomerId = $node["AI Agent: Extract Order Data"].json.output.PS_Customer_ID;

// Enrich line item with header context
lineItem.ps_customer_id = psCustomerId;

return { json: lineItem };`
      },
      id: 'add-header-context',
      name: 'Add Header Context to Line',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [3650, 288]
    });
    console.log('  ✅ Added: Add Header Context to Line');

    // Node 2: Lookup Product Mapping
    workflow.nodes.push({
      parameters: {
        operation: 'getAll',
        tableId: 'customer_product_mappings',
        limit: 1,
        matchType: 'allFilters',
        filters: {
          conditions: [
            {
              keyName: 'ps_customer_id',
              condition: 'eq',
              keyValue: '={{ $json.ps_customer_id }}'
            },
            {
              keyName: 'cust_product_sku',
              condition: 'eq',
              keyValue: '={{ $json.custproductsku }}'
            }
          ]
        }
      },
      id: 'lookup-product-mapping',
      name: 'Lookup Product Mapping',
      type: 'n8n-nodes-base.supabase',
      typeVersion: 1,
      position: [3760, 288],
      alwaysOutputData: true,
      credentials: {
        supabaseApi: {
          id: 'ck634X9GDWz9U54I',
          name: 'Supabase account'
        }
      }
    });
    console.log('  ✅ Added: Lookup Product Mapping');

    // Node 3: Apply Product Mapping
    workflow.nodes.push({
      parameters: {
        jsCode: `// Apply product mapping if found and sonanceProductOrig is null/empty
const lineItem = $node["Add Header Context to Line"].json;
const lookupResults = $input.all();

// Check if we got a mapping result
const mapping = (lookupResults.length > 0 && lookupResults[0].json) ? lookupResults[0].json : null;

// Check if sonanceProductOrig is null/empty
const sonanceSkuEmpty = !lineItem.sonanceProductOrig || lineItem.sonanceProductOrig.trim() === "";

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

return { json: lineItem };`
      },
      id: 'apply-product-mapping',
      name: 'Apply Product Mapping',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [3900, 288]
    });
    console.log('  ✅ Added: Apply Product Mapping');

    console.log('\nStep 4: Updating connections...');

    // Update "Split Order Lines" connection
    workflow.connections['Split Order Lines'] = {
      main: [[{ node: 'Add Header Context to Line', type: 'main', index: 0 }]]
    };
    console.log('  ✅ Split Order Lines → Add Header Context to Line');

    // Add new connections
    workflow.connections['Add Header Context to Line'] = {
      main: [[{ node: 'Lookup Product Mapping', type: 'main', index: 0 }]]
    };
    console.log('  ✅ Add Header Context to Line → Lookup Product Mapping');

    workflow.connections['Lookup Product Mapping'] = {
      main: [[{ node: 'Apply Product Mapping', type: 'main', index: 0 }]]
    };
    console.log('  ✅ Lookup Product Mapping → Apply Product Mapping');

    workflow.connections['Apply Product Mapping'] = {
      main: [[{ node: 'Insert Order Line', type: 'main', index: 0 }]]
    };
    console.log('  ✅ Apply Product Mapping → Insert Order Line');

    console.log(`\nStep 5: Sending updated workflow (${workflow.nodes.length} nodes)...`);

    // Remove fields that shouldn't be in the update
    delete workflow.updatedAt;
    delete workflow.createdAt;
    delete workflow.versionId;
    delete workflow.activeVersionId;
    delete workflow.versionCounter;
    delete workflow.triggerCount;
    delete workflow.shared;
    delete workflow.tags;
    delete workflow.activeVersion;

    const result = await makeRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, workflow);

    console.log('\n✅ SUCCESS! Workflow updated.');
    console.log(`   Total nodes: ${result.nodes ? result.nodes.length : workflow.nodes.length}`);
    console.log('\n📋 Validation flow added:');
    console.log('   Split Order Lines');
    console.log('   ↓');
    console.log('   Add Header Context to Line (enriches with PS_Customer_ID)');
    console.log('   ↓');
    console.log('   Lookup Product Mapping (queries customer_product_mappings)');
    console.log('   ↓');
    console.log('   Apply Product Mapping (updates null sonance SKUs)');
    console.log('   ↓');
    console.log('   Insert Order Line');
    console.log('\n🎯 The workflow will now automatically lookup and correct');
    console.log('   null Sonance SKUs from the customer_product_mappings table!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nIf backup exists, you can restore it by running:');
    console.error('  node restore-workflow-backup.js');
  }
}

updateWorkflow();
