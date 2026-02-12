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

async function fixSetNodeKeepFields() {
  try {
    console.log('🔧 Fixing Set node to keep all original fields...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const setNode = workflow.nodes.find(n => n.id === 'set-mapping-source');

    if (!setNode) {
      throw new Error('Could not find Set node!');
    }

    console.log('Step 2: Configuring Set node to keep original fields...');

    // Fix: Set keepOnlySet to false to keep all original fields
    setNode.parameters.options = {
      keepOnlySet: false
    };

    console.log('  ✅ Set keepOnlySet = false\n');

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

    console.log('\n✅ SUCCESS! Set node will now keep all original fields.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   WHAT CHANGED');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('BEFORE:');
    console.log('  Set node output: {mappingSource: "ai_extraction"}');
    console.log('  (All other fields stripped!) ❌\n');

    console.log('AFTER:');
    console.log('  Set node output: {');
    console.log('    lineNumber: 1,');
    console.log('    custproductsku: "72350",');
    console.log('    sonanceProductOrig: "72350",');
    console.log('    quantity: 1,');
    console.log('    ...(all original fields)...');
    console.log('    mappingSource: "ai_extraction"  ← Added');
    console.log('  } ✅\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Test now - should insert all 4 lines with all fields!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixSetNodeKeepFields();
