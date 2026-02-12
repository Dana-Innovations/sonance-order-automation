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

async function testPassthrough() {
  try {
    console.log('🔧 Removing Supabase lookup, testing simple pass-through...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    console.log('Step 2: Removing lookup and apply nodes...');

    // Remove Supabase lookup and apply nodes
    workflow.nodes = workflow.nodes.filter(n =>
      n.id !== 'lookup-mapping' &&
      n.id !== 'apply-mapping-result'
    );

    const prepareNode = workflow.nodes.find(n => n.id === 'prepare-for-lookup');
    const insertNode = workflow.nodes.find(n => n.id === 'insert-line');

    console.log('  ✅ Removed lookup and apply nodes\n');

    console.log('Step 3: Simplifying Prepare node to just pass through...');

    prepareNode.name = 'Pass Through Test';
    prepareNode.parameters.jsCode = `// Simple pass-through - no lookup
const item = $input.first().json;

// Just add a test field to prove this ran
item.testPassThrough = true;

// Add mappingSource field (required by our logic)
const sonanceSkuEmpty = !item.sonanceProductOrig ||
                        (typeof item.sonanceProductOrig === 'string' &&
                         item.sonanceProductOrig.trim() === "");
item.mappingSource = sonanceSkuEmpty ? "none" : "ai_extraction";

return { json: item };`;

    console.log('  ✅ Updated to simple pass-through\n');

    console.log('Step 4: Connecting directly to Insert...');

    workflow.connections['Split Order Lines'] = {
      main: [[{ node: 'Pass Through Test', type: 'main', index: 0 }]]
    };

    workflow.connections['Pass Through Test'] = {
      main: [[{ node: insertNode.name, type: 'main', index: 0 }]]
    };

    delete workflow.connections['Prepare for Lookup'];
    delete workflow.connections['Lookup Mapping'];
    delete workflow.connections['Apply Mapping Result'];

    console.log('  ✅ Connected Split → Pass Through → Insert\n');

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

    console.log('\n✅ SUCCESS! Testing simple pass-through.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   TEST FLOW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Split Order Lines (4 items)');
    console.log('  ↓');
    console.log('Pass Through Test (just adds mappingSource field)');
    console.log('  ↓');
    console.log('Insert Order Line\n');

    console.log('This tests if a Code node between Split and Insert works');
    console.log('for all 4 items without doing any Supabase lookups.\n');

    console.log('If this inserts all 4 items: Code nodes work fine');
    console.log('If this inserts only 1 item: Something wrong with Code node logic\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Test now - should insert all 4 lines!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testPassthrough();
