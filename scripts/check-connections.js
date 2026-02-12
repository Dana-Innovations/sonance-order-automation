const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFhODlhOS04YTlhLTQxMTgtODllYS05MmYxNmFmYzFlOGQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2MzU2NjQ5fQ.GEo8HRRJVWOYX3OGFdEOjgMyn6YWrftk0_PwPMHr17k';
const WORKFLOW_ID = 'WiJuy1l0UxdVNWQI';

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'keithharper.app.n8n.cloud',
      port: 443,
      path: path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('   CHECKING LINE ITEM FLOW CONNECTIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const splitNode = workflow.nodes.find(n => n.id === 'split-lines');
  const contextNode = workflow.nodes.find(n => n.id === 'add-header-context');
  const debugNode = workflow.nodes.find(n => n.id === 'debug-before-http');
  const httpNode = workflow.nodes.find(n => n.id === 'lookup-product-mapping');
  const applyNode = workflow.nodes.find(n => n.id === 'apply-product-mapping');
  const insertNode = workflow.nodes.find(n => n.id === 'insert-line');

  console.log('Node Chain:');
  console.log('  1. Split Order Lines →');

  // Check what Split connects to
  const splitConnections = workflow.connections['Split Order Lines'];
  if (splitConnections && splitConnections.main && splitConnections.main[0]) {
    console.log('     Connected to:', splitConnections.main[0].map(c => c.node).join(', '));
  }

  // Check what Add Header Context connects to
  const contextConnections = workflow.connections['Add Header Context to Line'];
  console.log('\n  2. Add Header Context to Line →');
  if (contextConnections && contextConnections.main && contextConnections.main[0]) {
    console.log('     Connected to:', contextConnections.main[0].map(c => c.node).join(', '));
  }

  // Check what Debug connects to
  if (debugNode) {
    const debugConnections = workflow.connections['Debug: Log Item Fields'];
    console.log('\n  3. Debug: Log Item Fields →');
    if (debugConnections && debugConnections.main && debugConnections.main[0]) {
      console.log('     Connected to:', debugConnections.main[0].map(c => c.node).join(', '));
    }
  }

  // Check what HTTP connects to
  const httpConnections = workflow.connections['Lookup Product Mapping'];
  console.log('\n  4. Lookup Product Mapping (HTTP) →');
  if (httpConnections && httpConnections.main && httpConnections.main[0]) {
    console.log('     Connected to:', httpConnections.main[0].map(c => c.node).join(', '));
  }

  // Check what Apply connects to
  const applyConnections = workflow.connections['Apply Product Mapping'];
  console.log('\n  5. Apply Product Mapping →');
  if (applyConnections && applyConnections.main && applyConnections.main[0]) {
    console.log('     Connected to:', applyConnections.main[0].map(c => c.node).join(', '));
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   POTENTIAL ISSUE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('The issue might be with Apply Product Mapping code:');
  console.log('  const lineItem = $("Add Header Context to Line").first().json;\n');
  console.log('This references a DIFFERENT node in the flow, not $input.');
  console.log('This can cause issues with item flow in n8n.\n');
  console.log('Better approach: Pass the line item data FORWARD through');
  console.log('the HTTP Request node so Apply Product Mapping can use $input.\n');
})();
