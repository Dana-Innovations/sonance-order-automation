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

async function removeValidationTest() {
  try {
    console.log('🔧 Temporarily removing validation to test basic flow...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    console.log('Step 2: Removing validation node...');

    // Remove validation node temporarily
    workflow.nodes = workflow.nodes.filter(n => n.id !== 'validate-and-enrich-line');

    const splitNode = workflow.nodes.find(n => n.id === 'split-lines');
    const insertNode = workflow.nodes.find(n => n.id === 'insert-line');

    console.log('  ✅ Removed validation node\n');

    console.log('Step 3: Connecting Split directly to Insert...');

    // Connect Split directly to Insert (original working flow)
    workflow.connections['Split Order Lines'] = {
      main: [[{ node: insertNode.name, type: 'main', index: 0 }]]
    };

    delete workflow.connections['Validate and Enrich Line Item'];

    console.log('  ✅ Connected Split → Insert\n');

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

    console.log('\n✅ SUCCESS! Validation removed - back to original flow.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   TESTING BASIC FLOW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Current flow:');
    console.log('  Split Order Lines (4 items)');
    console.log('    ↓');
    console.log('  Insert Order Line (should insert all 4)\n');

    console.log('This is the original working flow from before we added validation.\n');
    console.log('Please test to confirm all 4 lines insert correctly.\n');
    console.log('If this works, we know the issue is with the validation logic,');
    console.log('not with the basic Split → Insert flow.\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Test now - should insert all 4 lines!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

removeValidationTest();
