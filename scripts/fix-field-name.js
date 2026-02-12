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

async function fixFieldName() {
  try {
    console.log('🔧 Fixing field name mismatch in HTTP Request URL...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const httpNode = workflow.nodes.find(n => n.id === 'lookup-product-mapping');

    if (!httpNode) {
      throw new Error('Could not find HTTP Request node!');
    }

    console.log('Step 2: Identifying the field name issue...');
    console.log('  ❌ WRONG: $json.custproductsku (no underscores)');
    console.log('  ✅ RIGHT: $json.cust_product_sku (with underscores)\n');

    console.log('Step 3: Fixing the URL expression...');

    // Fix the URL to use correct field name
    httpNode.parameters.url = '={{ "https://xgftwwircksmhevzkrhn.supabase.co/rest/v1/customer_product_mappings?ps_customer_id=eq." + $json.ps_customer_id + "&cust_product_sku=eq." + encodeURIComponent($json.cust_product_sku) + "&limit=1" }}';

    console.log('  ✅ Updated to use cust_product_sku\n');

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

    console.log('\n✅ SUCCESS! Field name fixed.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   WHAT WAS WRONG');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('The HTTP Request was looking for:');
    console.log('  $json.custproductsku  ❌ (field does not exist)\n');

    console.log('But the actual field name in the items is:');
    console.log('  $json.cust_product_sku  ✅ (with underscores)\n');

    console.log('This matches the database schema:');
    console.log('  order_lines.cust_product_sku');
    console.log('  customer_product_mappings.cust_product_sku\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test - should find matching records now!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixFieldName();
