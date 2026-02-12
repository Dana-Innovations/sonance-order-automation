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

async function fixRevertFieldName() {
  try {
    console.log('🔧 Reverting to correct field name from AI Agent...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const httpNode = workflow.nodes.find(n => n.id === 'lookup-product-mapping');

    if (!httpNode) {
      throw new Error('Could not find HTTP Request node!');
    }

    console.log('Step 2: Understanding the data flow...');
    console.log('  AI Agent extracts: custproductsku (no underscores)');
    console.log('  Split Order Lines: outputs items with custproductsku');
    console.log('  Insert Order Line: maps $json.custproductsku → cust_product_sku\n');

    console.log('Step 3: Fixing HTTP Request to use AI Agent field name...');

    // Use the field name from AI Agent output
    httpNode.parameters.url = '={{ "https://xgftwwircksmhevzkrhn.supabase.co/rest/v1/customer_product_mappings?ps_customer_id=eq." + $json.ps_customer_id + "&cust_product_sku=eq." + encodeURIComponent($json.custproductsku) + "&limit=1" }}';

    console.log('  ✅ Changed back to $json.custproductsku\n');

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

    console.log('\n✅ SUCCESS! Field name corrected.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   DATA FLOW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('1. AI Agent extracts order data');
    console.log('   → lineItems[].custproductsku = "SON40125"');
    console.log('   → lineItems[].sonanceProductOrig = null\n');

    console.log('2. Split Order Lines');
    console.log('   → Item 1: { custproductsku: "SON40125", ... }\n');

    console.log('3. Add Header Context to Line');
    console.log('   → Item 1: { custproductsku: "SON40125", ps_customer_id: "238482", ... }\n');

    console.log('4. HTTP Request (Lookup Product Mapping)');
    console.log('   → URL: ...?ps_customer_id=eq.238482&cust_product_sku=eq.SON40125');
    console.log('   → Returns: [{ sonance_product_sku: "40072", ... }]\n');

    console.log('5. Apply Product Mapping');
    console.log('   → Updates sonanceProductOrig if it was null\n');

    console.log('6. Insert Order Line');
    console.log('   → Maps custproductsku → cust_product_sku in database\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test - should query correctly now!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixRevertFieldName();
