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

async function fixInputSyntax() {
  try {
    console.log('🔧 Fixing $input syntax for n8n Code nodes...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const node1 = workflow.nodes.find(n => n.id === 'add-header-context');
    const node3 = workflow.nodes.find(n => n.id === 'apply-product-mapping');

    if (!node1 || !node3) {
      throw new Error('Could not find validation code nodes!');
    }

    console.log('Step 2: Fixing "Add Header Context to Line" with correct syntax...');
    // Use $input.first() or process all items
    node1.parameters.jsCode = `// Add PS_Customer_ID to each line item for lookup
const psCustomerId = $("AI Agent: Extract Order Data").json.output.PS_Customer_ID;

// Process all input items and add ps_customer_id to each
return $input.all().map(item => ({
  json: {
    ...item.json,
    ps_customer_id: psCustomerId
  }
}));`;
    console.log('  ✅ Using $input.all().map() for processing\n');

    console.log('Step 3: Fixing "Apply Product Mapping" with correct syntax...');
    node3.parameters.jsCode = `// Apply product mapping if found and sonanceProductOrig is null/empty
// Get the original line item from Add Header Context node (before Supabase lookup)
const contextItem = $("Add Header Context to Line").first().json;

// Get the current item which is the result from Supabase lookup
const currentItem = $input.first().json;

// The lookup result is in currentItem
const mapping = (currentItem && currentItem.sonance_product_sku) ? currentItem : null;

// Check if sonanceProductOrig is null/empty
const sonanceSkuEmpty = !contextItem.sonanceProductOrig ||
                        (typeof contextItem.sonanceProductOrig === 'string' &&
                         contextItem.sonanceProductOrig.trim() === "");

if (sonanceSkuEmpty && mapping && mapping.sonance_product_sku) {
  // Update with mapped value from customer_product_mappings table
  contextItem.sonanceProductOrig = mapping.sonance_product_sku;
  contextItem.mappingSource = "customer_product_mappings";
  contextItem.mappingConfidence = mapping.confidence_score || 1.0;
  contextItem.mappingTimesUsed = mapping.times_used || 0;
} else {
  // Keep original value (could be from AI extraction or still null)
  contextItem.mappingSource = sonanceSkuEmpty ? "none" : "ai_extraction";
}

// Remove temporary ps_customer_id field
delete contextItem.ps_customer_id;

return { json: contextItem };`;
    console.log('  ✅ Using $input.first() and $(nodeName).first() for access\n');

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

    console.log('\n✅ SUCCESS! Code nodes fixed with correct n8n syntax.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   CORRECTED SYNTAX');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('✅ Node 1: Add Header Context');
    console.log('   $input.all().map() - Process all input items\n');

    console.log('✅ Node 3: Apply Product Mapping');
    console.log('   $input.first() - Get current item (lookup result)');
    console.log('   $(nodeName).first() - Get item from previous node\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test again!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixInputSyntax();
