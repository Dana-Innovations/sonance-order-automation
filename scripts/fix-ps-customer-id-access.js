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

async function fixPsCustomerIdAccess() {
  try {
    console.log('🔧 Fixing PS_Customer_ID access in validation nodes...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const node1 = workflow.nodes.find(n => n.id === 'add-header-context');
    const insertOrderNode = workflow.nodes.find(n => n.id === 'insert-order');

    if (!node1 || !insertOrderNode) {
      throw new Error('Could not find required nodes!');
    }

    console.log('Step 2: Analyzing workflow path...');
    console.log('  Found "Insert Order Header" node');
    console.log('  PS_Customer_ID is stored in that node output\n');

    console.log('Step 3: Fixing "Add Header Context to Line"...');
    console.log('  Accessing PS_Customer_ID from Insert Order Header node\n');

    // Get PS_Customer_ID from the Insert Order Header node which is in the execution path
    node1.parameters.jsCode = `// Add PS_Customer_ID to each line item for lookup
// Get PS_Customer_ID from the Insert Order Header node (which is in execution path)
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;

// Process all input items and add ps_customer_id to each
return $input.all().map(item => ({
  json: {
    ...item.json,
    ps_customer_id: psCustomerId
  }
}));`;
    console.log('  ✅ Now accessing from Insert Order Header node\n');

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

    console.log('\n✅ SUCCESS! PS_Customer_ID access fixed.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   EXECUTION PATH');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Insert Order Header');
    console.log('  ↓ (has ps_customer_id field)');
    console.log('Set Line Items Array');
    console.log('  ↓');
    console.log('Split Order Lines');
    console.log('  ↓');
    console.log('Add Header Context to Line ← Gets ps_customer_id from Insert Order Header');
    console.log('  ↓');
    console.log('Lookup Product Mapping\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test again!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixPsCustomerIdAccess();
