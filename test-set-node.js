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

async function testSetNode() {
  try {
    console.log('🔧 Testing with Set node instead of Code node...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    console.log('Step 2: Removing Code node...');

    // Remove pass-through code node
    workflow.nodes = workflow.nodes.filter(n => n.id !== 'prepare-for-lookup');

    const splitNode = workflow.nodes.find(n => n.id === 'split-lines');
    const insertNode = workflow.nodes.find(n => n.id === 'insert-line');

    console.log('  ✅ Removed Code node\n');

    console.log('Step 3: Creating Set node...');

    // Create a Set node to add mappingSource field
    const setNode = {
      id: 'set-mapping-source',
      name: 'Set Mapping Source',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.3,
      position: [
        splitNode.position[0] + 300,
        splitNode.position[1]
      ],
      parameters: {
        mode: 'manual',
        duplicateItem: false,
        assignments: {
          assignments: [
            {
              id: 'mapping-source-field',
              name: 'mappingSource',
              value: 'ai_extraction',
              type: 'string'
            }
          ]
        },
        options: {}
      }
    };

    workflow.nodes.push(setNode);

    console.log('  ✅ Created Set node\n');

    console.log('Step 4: Connecting nodes...');

    workflow.connections['Split Order Lines'] = {
      main: [[{ node: setNode.name, type: 'main', index: 0 }]]
    };

    workflow.connections[setNode.name] = {
      main: [[{ node: insertNode.name, type: 'main', index: 0 }]]
    };

    delete workflow.connections['Pass Through Test'];

    console.log('  ✅ Connected Split → Set → Insert\n');

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

    console.log('\n✅ SUCCESS! Testing with Set node.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   TEST FLOW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Split Order Lines (4 items)');
    console.log('  ↓');
    console.log('Set Mapping Source (native n8n Set node)');
    console.log('  ↓');
    console.log('Insert Order Line\n');

    console.log('Set node is a native n8n node (not Code node).');
    console.log('It just adds mappingSource = "ai_extraction" to each item.\n');

    console.log('If this works for all 4 items: Code nodes are the problem');
    console.log('If this fails: Something else is wrong with the workflow\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Test now - does Set node work for all 4 items?');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testSetNode();
