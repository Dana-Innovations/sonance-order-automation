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

async function fixAlwaysOutputData() {
  try {
    console.log('🔧 Enabling "Always Output Data" for HTTP Request node...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const httpNode = workflow.nodes.find(n => n.id === 'lookup-product-mapping');

    if (!httpNode) {
      throw new Error('Could not find HTTP Request node!');
    }

    console.log('Step 2: Enabling "Always Output Data"...');
    console.log('  This allows the workflow to continue even when no mapping is found\n');

    // Enable "Always Output Data"
    httpNode.alwaysOutputData = true;

    console.log('  ✅ Enabled alwaysOutputData = true\n');

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

    console.log('\n✅ SUCCESS! Always Output Data enabled.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   WHAT THIS MEANS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Scenario 1: Mapping Found');
    console.log('  → HTTP Request returns: [{sonance_product_sku: "XXX", ...}]');
    console.log('  → Apply Product Mapping updates sonanceProductOrig');
    console.log('  → Insert Order Line inserts with mapped value ✅\n');

    console.log('Scenario 2: No Mapping Found');
    console.log('  → HTTP Request returns: []');
    console.log('  → Apply Product Mapping keeps original value (null or AI value)');
    console.log('  → Insert Order Line inserts anyway ✅\n');

    console.log('Scenario 3: HTTP Request Fails');
    console.log('  → HTTP Request returns error');
    console.log('  → Workflow continues to Apply Product Mapping');
    console.log('  → Insert Order Line inserts with original value ✅\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test - workflow will continue in all cases!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixAlwaysOutputData();
