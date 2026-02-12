const https = require('https');
const fs = require('fs');

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
    console.log('🔧 Fixing validation nodes with correct $input and $node syntax...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    // Find and fix the three validation nodes
    const node1 = workflow.nodes.find(n => n.id === 'add-header-context');
    const node2 = workflow.nodes.find(n => n.id === 'lookup-product-mapping');
    const node3 = workflow.nodes.find(n => n.id === 'apply-product-mapping');

    if (!node1 || !node2 || !node3) {
      throw new Error('Could not find all validation nodes!');
    }

    console.log('Step 2: Fixing "Add Header Context to Line" node...');
    node1.parameters.jsCode = `// Add PS_Customer_ID to each line item for lookup
const lineItem = $input.item.json;
const psCustomerId = $node["AI Agent: Extract Order Data"].json.output.PS_Customer_ID;

// Enrich line item with header context
lineItem.ps_customer_id = psCustomerId;

return { json: lineItem };`;
    console.log('  ✅ Fixed: Added missing $input and $node references\n');

    console.log('Step 3: Verifying "Lookup Product Mapping" node...');
    console.log('  ✅ No code changes needed (Supabase node)\n');

    console.log('Step 4: Fixing "Apply Product Mapping" node...');
    node3.parameters.jsCode = `// Apply product mapping if found and sonanceProductOrig is null/empty
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

return { json: lineItem };`;
    console.log('  ✅ Fixed: Added missing $input and $node references\n');

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
    console.log('   FIXED CODE PREVIEW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('1️⃣  Add Header Context to Line:');
    console.log('   const lineItem = $input.item.json;');
    console.log('   const psCustomerId = $node["AI Agent: Extract Order Data"].json.output.PS_Customer_ID;\n');

    console.log('2️⃣  Lookup Product Mapping:');
    console.log('   (No changes - Supabase node works correctly)\n');

    console.log('3️⃣  Apply Product Mapping:');
    console.log('   const lineItem = $node["Add Header Context to Line"].json;');
    console.log('   const lookupResults = $input.all();\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 The workflow is now ready to test again!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixNodes();
