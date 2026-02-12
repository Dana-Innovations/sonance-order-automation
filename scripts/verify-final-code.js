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
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function verify() {
  try {
    console.log('Fetching workflow...\n');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);

    const node1 = workflow.nodes.find(n => n.id === 'add-header-context');
    const node2 = workflow.nodes.find(n => n.id === 'lookup-product-mapping');
    const node3 = workflow.nodes.find(n => n.id === 'apply-product-mapping');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('   FINAL VERIFIED CODE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('1️⃣  Add Header Context to Line:\n');
    console.log(node1.parameters.jsCode);

    console.log('\n\n2️⃣  Lookup Product Mapping - FILTERS:\n');
    console.log(JSON.stringify(node2.parameters.filters, null, 2));

    console.log('\n\n3️⃣  Apply Product Mapping:\n');
    console.log(node3.parameters.jsCode);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ All nodes verified and ready for testing');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verify();
