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

  console.log('Nodes that contain "line" or "split" in their name:');
  workflow.nodes.forEach(n => {
    const name = n.name.toLowerCase();
    if (name.includes('split') || name.includes('line')) {
      console.log(`\n  Node: ${n.name}`);
      console.log(`  Type: ${n.type}`);
      console.log(`  ID: ${n.id}`);
      if (n.parameters && n.parameters.jsCode) {
        console.log(`  Has Code: Yes`);
      }
    }
  });

  // Find the node that creates line items
  const extractNode = workflow.nodes.find(n => n.name.toLowerCase().includes('extract') && n.name.toLowerCase().includes('line'));
  if (extractNode) {
    console.log('\n\nExtract Line Items node code:');
    console.log(extractNode.parameters.jsCode);
  }
})();
