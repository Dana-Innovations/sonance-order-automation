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

async function addDebugLogging() {
  try {
    console.log('🔧 Adding debug Code node before HTTP Request...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const httpNode = workflow.nodes.find(n => n.id === 'lookup-product-mapping');
    const contextNode = workflow.nodes.find(n => n.id === 'add-header-context');

    if (!httpNode || !contextNode) {
      throw new Error('Could not find required nodes!');
    }

    console.log('Step 2: Adding debug Code node...');

    // Add a debug node before the HTTP Request
    const debugNode = {
      id: 'debug-before-http',
      name: 'Debug: Log Item Fields',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [
        contextNode.position[0] + 300,
        contextNode.position[1]
      ],
      parameters: {
        jsCode: `// Debug: Log what fields are available
const item = $input.first().json;

console.log('═══ DEBUG: Item Fields ═══');
console.log('ps_customer_id:', item.ps_customer_id);
console.log('custproductsku:', item.custproductsku);
console.log('All fields:', Object.keys(item));
console.log('═══════════════════════════');

// Pass through unchanged
return { json: item };`
      }
    };

    // Check if debug node already exists
    const existingDebugNode = workflow.nodes.find(n => n.id === 'debug-before-http');
    if (!existingDebugNode) {
      workflow.nodes.push(debugNode);
      console.log('  ✅ Added debug Code node\n');
    } else {
      console.log('  ℹ Debug node already exists\n');
    }

    console.log('Step 3: Updating connections...');

    // Find connection from context node to http node
    const contextConnections = workflow.connections[contextNode.name];
    if (contextConnections && contextConnections.main && contextConnections.main[0]) {
      const httpConnection = contextConnections.main[0].find(c => c.node === httpNode.name);
      if (httpConnection) {
        // Insert debug node between context and http
        httpConnection.node = debugNode.name;

        // Add connection from debug to http
        workflow.connections[debugNode.name] = {
          main: [[{ node: httpNode.name, type: 'main', index: 0 }]]
        };
        console.log('  ✅ Inserted debug node into workflow\n');
      }
    }

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

    console.log('\n✅ SUCCESS! Debug logging added.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   WHAT TO DO NEXT');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('1. Run your workflow with a test order');
    console.log('2. Check the execution logs for the "Debug: Log Item Fields" node');
    console.log('3. It will show:');
    console.log('   - What ps_customer_id is being passed');
    console.log('   - What custproductsku value exists');
    console.log('   - All available fields in the item\n');

    console.log('This will help us see if the fields are actually present');
    console.log('when the HTTP Request node tries to use them.\n');

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

addDebugLogging();
