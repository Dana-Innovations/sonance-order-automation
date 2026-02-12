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

async function fixMergeLineAndMapping() {
  try {
    console.log('🔧 Adding Merge node to combine line item + mapping data...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const httpNode = workflow.nodes.find(n => n.id === 'lookup-product-mapping');
    const debugNode = workflow.nodes.find(n => n.id === 'debug-before-http');
    const applyNode = workflow.nodes.find(n => n.id === 'apply-product-mapping');

    if (!httpNode || !applyNode || !debugNode) {
      throw new Error('Could not find required nodes!');
    }

    console.log('Step 2: Creating Merge node...');

    // Create a merge node that combines line item data with mapping result
    const mergeNode = {
      id: 'merge-line-and-mapping',
      name: 'Merge Line Item with Mapping',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [
        httpNode.position[0] + 300,
        httpNode.position[1]
      ],
      parameters: {
        jsCode: `// Merge line item data with mapping result
// Get the original line item from Debug node
const lineItem = $("Debug: Log Item Fields").first().json;

// Get the HTTP Request result (mapping data)
const mappingResult = $input.first().json;

// Combine them into one object
const merged = {
  ...lineItem,
  _mappingResult: mappingResult  // Store mapping result in special field
};

return { json: merged };`
      }
    };

    // Check if merge node already exists
    const existingMergeNode = workflow.nodes.find(n => n.id === 'merge-line-and-mapping');
    if (!existingMergeNode) {
      workflow.nodes.push(mergeNode);
      console.log('  ✅ Created Merge node\n');
    } else {
      console.log('  ℹ Merge node already exists\n');
    }

    console.log('Step 3: Updating connections...');

    // Update HTTP node to connect to Merge node instead of Apply node
    const httpConnections = workflow.connections['Lookup Product Mapping'];
    if (httpConnections && httpConnections.main && httpConnections.main[0]) {
      httpConnections.main[0] = [{
        node: mergeNode.name,
        type: 'main',
        index: 0
      }];
    }

    // Connect Merge node to Apply node
    workflow.connections[mergeNode.name] = {
      main: [[{
        node: applyNode.name,
        type: 'main',
        index: 0
      }]]
    };

    console.log('  ✅ Updated connections\n');

    console.log('Step 4: Updating Apply Product Mapping to use merged data...');

    applyNode.parameters.jsCode = `// Apply product mapping if found and sonanceProductOrig is null/empty
// Get the merged data (line item + mapping result)
const currentItem = $input.first().json;

// Extract the mapping result
const mappingResult = currentItem._mappingResult;
const mapping = (Array.isArray(mappingResult) && mappingResult.length > 0) ? mappingResult[0] : null;

console.log('═══ DEBUG: Apply Product Mapping ═══');
console.log('currentItem.sonanceProductOrig:', currentItem.sonanceProductOrig);
console.log('mapping:', mapping);
console.log('═══════════════════════════════════');

// Check if sonanceProductOrig is null/empty
const sonanceSkuEmpty = !currentItem.sonanceProductOrig ||
                        (typeof currentItem.sonanceProductOrig === 'string' &&
                         currentItem.sonanceProductOrig.trim() === "");

console.log('sonanceSkuEmpty:', sonanceSkuEmpty);

if (sonanceSkuEmpty && mapping && mapping.sonance_product_sku) {
  // Update with mapped value from customer_product_mappings table
  console.log('✅ UPDATING with mapped value:', mapping.sonance_product_sku);
  currentItem.sonanceProductOrig = mapping.sonance_product_sku;
  currentItem.mappingSource = "customer_product_mappings";
  currentItem.mappingConfidence = mapping.confidence_score || 1.0;
  currentItem.mappingTimesUsed = mapping.times_used || 0;
} else {
  // Keep original value
  console.log('✅ KEEPING original value');
  currentItem.mappingSource = sonanceSkuEmpty ? "none" : "ai_extraction";
}

// Clean up temporary fields
delete currentItem.ps_customer_id;
delete currentItem._mappingResult;

console.log('Final sonanceProductOrig:', currentItem.sonanceProductOrig);
console.log('Final mappingSource:', currentItem.mappingSource);

return { json: currentItem };`;

    console.log('  ✅ Updated Apply Product Mapping\n');

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

    console.log('\n✅ SUCCESS! Merge node added and flow fixed.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   WHAT CHANGED');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('BEFORE (Broken):');
    console.log('  Split → Context → Debug → HTTP → Apply → Insert');
    console.log('  Apply Product Mapping used:');
    console.log('    $("Add Header Context").first().json  ❌ Always item 1\n');

    console.log('AFTER (Fixed):');
    console.log('  Split → Context → Debug → HTTP → Merge → Apply → Insert');
    console.log('  Merge combines current line item + mapping result');
    console.log('  Apply Product Mapping uses:');
    console.log('    $input.first().json  ✅ Current item in flow\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('   HOW IT WORKS NOW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Item 1 flows through:');
    console.log('  → Debug: logs item 1 fields');
    console.log('  → HTTP: queries for item 1 mapping');
    console.log('  → Merge: combines item 1 + mapping result');
    console.log('  → Apply: processes CURRENT merged item 1');
    console.log('  → Insert: inserts item 1 ✅\n');

    console.log('Item 2 flows through:');
    console.log('  → Debug: logs item 2 fields');
    console.log('  → HTTP: queries for item 2 mapping');
    console.log('  → Merge: combines item 2 + mapping result');
    console.log('  → Apply: processes CURRENT merged item 2');
    console.log('  → Insert: inserts item 2 ✅\n');

    console.log('And so on for items 3 and 4!\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test - should process ALL 4 items now!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixMergeLineAndMapping();
