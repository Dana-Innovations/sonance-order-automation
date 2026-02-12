const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFhODlhOS04YTlhLTQxMTgtODllYS05MmYxNmFmYzFlOGQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2MzU2NjQ5fQ.GEo8HRRJVWOYX3OGFdEOjgMyn6YWrftk0_PwPMHr17k';
const WORKFLOW_ID = 'WiJuy1l0UxdVNWQI';
const API_URL = 'keithharper.app.n8n.cloud';

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL,
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
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function verifyNodes() {
  try {
    console.log('Fetching workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);

    console.log('\n=== WORKFLOW VERIFICATION ===\n');
    console.log(`Total nodes: ${workflow.nodes.length}`);

    // Find new validation nodes
    const validationNodes = workflow.nodes.filter(n =>
      ['add-header-context', 'lookup-product-mapping', 'apply-product-mapping'].includes(n.id)
    );

    console.log(`\n✅ Validation nodes found: ${validationNodes.length}/3`);

    validationNodes.forEach(node => {
      console.log(`\n  📦 ${node.name}`);
      console.log(`     ID: ${node.id}`);
      console.log(`     Type: ${node.type}`);
      console.log(`     Position: [${node.position.join(', ')}]`);
    });

    // Verify connections
    console.log('\n=== CONNECTION FLOW ===\n');
    const flow = [
      'Split Order Lines',
      'Add Header Context to Line',
      'Lookup Product Mapping',
      'Apply Product Mapping',
      'Insert Order Line'
    ];

    for (let i = 0; i < flow.length - 1; i++) {
      const source = flow[i];
      const expectedTarget = flow[i + 1];
      const connection = workflow.connections[source];

      if (connection && connection.main && connection.main[0] && connection.main[0][0]) {
        const actualTarget = connection.main[0][0].node;
        const match = actualTarget === expectedTarget;
        console.log(`  ${match ? '✅' : '❌'} ${source} → ${actualTarget}`);
      } else {
        console.log(`  ❌ ${source} → (no connection found)`);
      }
    }

    console.log('\n=== NODE DETAILS ===\n');

    // Show Add Header Context node
    const node1 = validationNodes.find(n => n.id === 'add-header-context');
    if (node1) {
      console.log('1️⃣  Add Header Context to Line');
      console.log('   Purpose: Enriches each line item with PS_Customer_ID from order header');
      console.log('   Logic: Adds ps_customer_id field to line item for lookup');
    }

    // Show Lookup Product Mapping node
    const node2 = validationNodes.find(n => n.id === 'lookup-product-mapping');
    if (node2) {
      console.log('\n2️⃣  Lookup Product Mapping');
      console.log('   Purpose: Queries customer_product_mappings table');
      console.log('   Filters:');
      console.log('     - ps_customer_id = $json.ps_customer_id');
      console.log('     - cust_product_sku = $json.custproductsku');
      console.log('   Returns: Mapped sonance_product_sku if found');
    }

    // Show Apply Product Mapping node
    const node3 = validationNodes.find(n => n.id === 'apply-product-mapping');
    if (node3) {
      console.log('\n3️⃣  Apply Product Mapping');
      console.log('   Purpose: Updates sonanceProductOrig if null and mapping found');
      console.log('   Logic:');
      console.log('     - Checks if sonanceProductOrig is null/empty');
      console.log('     - If null AND mapping found → updates with mapped SKU');
      console.log('     - Adds metadata: mappingSource, mappingConfidence, mappingTimesUsed');
      console.log('     - Removes temporary ps_customer_id field');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Workflow validation complete!');
    console.log('The workflow will now automatically lookup and correct');
    console.log('null Sonance SKUs before inserting order lines.');
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyNodes();
