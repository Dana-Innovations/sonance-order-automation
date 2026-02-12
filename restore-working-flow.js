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

async function restoreWorkingFlow() {
  try {
    console.log('🔧 Restoring working flow, will try validation differently...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    console.log('Step 2: Removing Set node...');

    // Remove set node
    workflow.nodes = workflow.nodes.filter(n => n.id !== 'set-mapping-source');

    const splitNode = workflow.nodes.find(n => n.id === 'split-lines');
    const insertNode = workflow.nodes.find(n => n.id === 'insert-line');

    console.log('  ✅ Removed Set node\n');

    console.log('Step 3: Connecting Split directly to Insert...');

    workflow.connections['Split Order Lines'] = {
      main: [[{ node: insertNode.name, type: 'main', index: 0 }]]
    };

    delete workflow.connections['Set Mapping Source'];

    console.log('  ✅ Restored working flow\n');

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

    console.log('\n✅ SUCCESS! Back to working flow.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   SUMMARY OF FINDINGS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('What works:');
    console.log('  ✅ Split Order Lines → Insert Order Line (all 4 items)\n');

    console.log('What breaks the flow:');
    console.log('  ❌ ANY Code node between Split and Insert (only 1 item)');
    console.log('  ❌ Set node strips all fields (even with keepOnlySet: false)\n');

    console.log('The problem:');
    console.log('  We need to add validation logic between Split and Insert,');
    console.log('  but every node type we try either breaks the item flow');
    console.log('  or strips the data.\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('   RECOMMENDATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Since we cannot add ANY node between Split and Insert');
    console.log('without breaking the flow, I recommend:');
    console.log('');
    console.log('Option 1: Add validation AFTER insert');
    console.log('  → Insert all 4 lines as-is');
    console.log('  → Then update null sonance_prod_sku values in a');
    console.log('     separate node/workflow\n');

    console.log('Option 2: Modify the AI Agent extraction');
    console.log('  → Add Code node BEFORE Split to enrich all line items');
    console.log('  → Then Split already-enriched items\n');

    console.log('Option 3: Use n8n workflow in the UI');
    console.log('  → Manually add/configure nodes in n8n UI');
    console.log('  → The UI might have better node configuration options\n');

    console.log('Would you like me to implement Option 1 or Option 2?\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

restoreWorkingFlow();
