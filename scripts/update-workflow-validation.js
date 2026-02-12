const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFhODlhOS04YTlhLTQxMTgtODllYS05MmYxNmFmYzFlOGQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2MzU2NjQ5fQ.GEo8HRRJVWOYX3OGFdEOjgMyn6YWrftk0_PwPMHr17k';
const WORKFLOW_ID = 'WiJuy1l0UxdVNWQI';
const API_URL = 'keithharper.app.n8n.cloud';

// New nodes to add
const newNodes = [
  {
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
  },
  {
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
  },
  {
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
  }
];

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
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

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function updateWorkflow() {
  try {
    console.log('Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);

    console.log('Current workflow fetched successfully');
    console.log(`Current nodes count: ${workflow.nodes.length}`);

    // Add new nodes
    workflow.nodes.push(...newNodes);

    // Update connections
    // Find and update the "Split Order Lines" connection
    workflow.connections['Split Order Lines'] = {
      main: [[{ node: 'Add Header Context to Line', type: 'main', index: 0 }]]
    };

    // Add new connections
    workflow.connections['Add Header Context to Line'] = {
      main: [[{ node: 'Lookup Product Mapping', type: 'main', index: 0 }]]
    };

    workflow.connections['Lookup Product Mapping'] = {
      main: [[{ node: 'Apply Product Mapping', type: 'main', index: 0 }]]
    };

    workflow.connections['Apply Product Mapping'] = {
      main: [[{ node: 'Insert Order Line', type: 'main', index: 0 }]]
    };

    console.log(`Updated nodes count: ${workflow.nodes.length}`);
    console.log('Updating workflow...');

    // Send updated workflow
    const updated = await makeRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, workflow);

    console.log('✅ Workflow updated successfully!');
    console.log('Added validation nodes:');
    console.log('  1. Add Header Context to Line');
    console.log('  2. Lookup Product Mapping');
    console.log('  3. Apply Product Mapping');
    console.log('\nThese nodes will now validate and correct null Sonance SKUs before inserting order lines.');

  } catch (error) {
    console.error('❌ Error updating workflow:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

updateWorkflow();
