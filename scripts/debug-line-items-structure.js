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
  console.log('   DEBUGGING LINE ITEM STRUCTURE');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check Aggregate Order Lines
  const aggregateNode = workflow.nodes.find(n => n.id === 'aggregate-lines');
  if (aggregateNode) {
    console.log('1. AGGREGATE ORDER LINES CODE:');
    console.log('-----------------------------------------------------------');
    console.log(aggregateNode.parameters.jsCode);
    console.log('\n');
  }

  // Check Set Line Items Array
  const setNode = workflow.nodes.find(n => n.id === 'set-line-items');
  if (setNode) {
    console.log('2. SET LINE ITEMS ARRAY CONFIG:');
    console.log('-----------------------------------------------------------');
    console.log(JSON.stringify(setNode.parameters, null, 2));
    console.log('\n');
  }

  // Check Split Order Lines
  const splitNode = workflow.nodes.find(n => n.id === 'split-lines');
  if (splitNode) {
    console.log('3. SPLIT ORDER LINES CONFIG:');
    console.log('-----------------------------------------------------------');
    console.log(JSON.stringify(splitNode.parameters, null, 2));
    console.log('\n');
  }

  // Check Insert Order Line to see what fields it expects
  const insertNode = workflow.nodes.find(n => n.id === 'insert-line');
  if (insertNode) {
    console.log('4. INSERT ORDER LINE CONFIG:');
    console.log('-----------------------------------------------------------');
    console.log(JSON.stringify(insertNode.parameters, null, 2));
    console.log('\n');
  }
})();
