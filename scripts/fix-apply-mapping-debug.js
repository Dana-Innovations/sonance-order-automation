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

async function fixApplyMappingDebug() {
  try {
    console.log('🔧 Adding debug logging to Apply Product Mapping...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const applyNode = workflow.nodes.find(n => n.id === 'apply-product-mapping');

    if (!applyNode) {
      throw new Error('Could not find Apply Product Mapping node!');
    }

    console.log('Step 2: Adding debug logging...');

    applyNode.parameters.jsCode = `// Apply product mapping if found and sonanceProductOrig is null/empty
// Get the original line item from Add Header Context node
const lineItem = $("Add Header Context to Line").first().json;

// Get the HTTP Request result (array from Supabase)
const httpResult = $input.first().json;

console.log('═══ DEBUG: Apply Product Mapping ═══');
console.log('httpResult type:', typeof httpResult);
console.log('httpResult isArray:', Array.isArray(httpResult));
console.log('httpResult:', JSON.stringify(httpResult));
console.log('lineItem.sonanceProductOrig:', lineItem.sonanceProductOrig);
console.log('═══════════════════════════════════');

const mapping = (Array.isArray(httpResult) && httpResult.length > 0) ? httpResult[0] : null;

// Check if sonanceProductOrig is null/empty
const sonanceSkuEmpty = !lineItem.sonanceProductOrig ||
                        (typeof lineItem.sonanceProductOrig === 'string' &&
                         lineItem.sonanceProductOrig.trim() === "");

console.log('sonanceSkuEmpty:', sonanceSkuEmpty);
console.log('mapping:', mapping);

if (sonanceSkuEmpty && mapping && mapping.sonance_product_sku) {
  // Update with mapped value from customer_product_mappings table
  console.log('✅ UPDATING with mapped value:', mapping.sonance_product_sku);
  lineItem.sonanceProductOrig = mapping.sonance_product_sku;
  lineItem.mappingSource = "customer_product_mappings";
  lineItem.mappingConfidence = mapping.confidence_score || 1.0;
  lineItem.mappingTimesUsed = mapping.times_used || 0;
} else {
  // Keep original value
  console.log('✅ KEEPING original value');
  lineItem.mappingSource = sonanceSkuEmpty ? "none" : "ai_extraction";
}

// Clean up temporary field
delete lineItem.ps_customer_id;

console.log('Final lineItem.sonanceProductOrig:', lineItem.sonanceProductOrig);
console.log('Final lineItem.mappingSource:', lineItem.mappingSource);

return { json: lineItem };`;

    console.log('  ✅ Added debug logging\n');

    console.log('Step 3: Sending updated workflow...');
    const payload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: {
        executionOrder: workflow.settings.executionOrder || 'v1'
      }
    };

    const result = await makeRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, payload);

    console.log('\n✅ SUCCESS! Debug logging added to Apply Product Mapping.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   WHAT TO DO NEXT');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('1. Run your workflow again');
    console.log('2. Check the "Apply Product Mapping" node execution logs');
    console.log('3. Send me the debug output showing:');
    console.log('   - What httpResult contains');
    console.log('   - Whether sonanceProductOrig is null or has a value');
    console.log('   - Whether it updates or keeps the original value\n');

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixApplyMappingDebug();
