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

async function combineIntoOneNode() {
  try {
    console.log('🔧 Combining validation logic into ONE simple Code node...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    console.log('Step 2: Removing validation nodes...');

    // Remove the 3 validation nodes
    workflow.nodes = workflow.nodes.filter(n =>
      n.id !== 'add-header-context' &&
      n.id !== 'lookup-product-mapping' &&
      n.id !== 'apply-product-mapping'
    );

    console.log('  ✅ Removed old validation nodes\n');

    console.log('Step 3: Creating single validation node...');

    const splitNode = workflow.nodes.find(n => n.id === 'split-lines');
    const insertNode = workflow.nodes.find(n => n.id === 'insert-line');

    // Create one Code node that does everything
    const validationNode = {
      id: 'validate-and-enrich-line',
      name: 'Validate and Enrich Line Item',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [
        splitNode.position[0] + 300,
        splitNode.position[1]
      ],
      parameters: {
        jsCode: `// Validate and enrich line item with product mapping
const currentItem = $input.first().json;

// Get PS_Customer_ID from header
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;

// Check if sonanceProductOrig is null/empty
const sonanceSkuEmpty = !currentItem.sonanceProductOrig ||
                        (typeof currentItem.sonanceProductOrig === 'string' &&
                         currentItem.sonanceProductOrig.trim() === "");

// Only lookup mapping if sonanceProductOrig is null/empty
if (sonanceSkuEmpty && currentItem.custproductsku) {
  // Query Supabase using $http helper
  const supabaseUrl = 'https://xgftwwircksmhevzkrhn.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZnR3d2lyY2tzbWhldnprcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzIxNTMsImV4cCI6MjA4MjAwODE1M30.7a5JX1ZM4uHiGS8uTfO42DVsgk2gREkBWuvVWnNpsv8';

  const url = \`\${supabaseUrl}/rest/v1/customer_product_mappings?ps_customer_id=eq.\${psCustomerId}&cust_product_sku=eq.\${encodeURIComponent(currentItem.custproductsku)}&limit=1\`;

  try {
    const response = await $http.request({
      method: 'GET',
      url: url,
      headers: {
        'apikey': supabaseKey,
        'Authorization': \`Bearer \${supabaseKey}\`,
        'Content-Type': 'application/json'
      }
    });

    const mappings = response.body;
    const mapping = (mappings && mappings.length > 0) ? mappings[0] : null;

    if (mapping && mapping.sonance_product_sku) {
      // Update with mapped value
      currentItem.sonanceProductOrig = mapping.sonance_product_sku;
      currentItem.mappingSource = "customer_product_mappings";
      currentItem.mappingConfidence = mapping.confidence_score || 1.0;
      currentItem.mappingTimesUsed = mapping.times_used || 0;
    } else {
      currentItem.mappingSource = "none";
    }
  } catch (error) {
    // If lookup fails, just continue with null value
    currentItem.mappingSource = "none";
  }
} else {
  // Keep original AI-extracted value
  currentItem.mappingSource = sonanceSkuEmpty ? "none" : "ai_extraction";
}

return { json: currentItem };`
      }
    };

    workflow.nodes.push(validationNode);
    console.log('  ✅ Created single validation Code node\n');

    console.log('Step 4: Updating connections...');

    // Connect Split → Validation → Insert
    workflow.connections['Split Order Lines'] = {
      main: [[{ node: validationNode.name, type: 'main', index: 0 }]]
    };

    workflow.connections[validationNode.name] = {
      main: [[{ node: insertNode.name, type: 'main', index: 0 }]]
    };

    // Remove old connections
    delete workflow.connections['Add Header Context to Line'];
    delete workflow.connections['Lookup Product Mapping'];
    delete workflow.connections['Apply Product Mapping'];

    console.log('  ✅ Updated connections\n');

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

    console.log('\n✅ SUCCESS! Simplified to ONE validation node.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   SUPER SIMPLE FLOW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Split Order Lines (4 items)');
    console.log('  ↓');
    console.log('Each item flows through:');
    console.log('  1. Validate and Enrich Line Item');
    console.log('     → Checks if sonanceProductOrig is null');
    console.log('     → If null, queries customer_product_mappings');
    console.log('     → Updates if mapping found');
    console.log('     → All in ONE node!');
    console.log('  2. Insert Order Line');
    console.log('     → Inserts to database\n');

    console.log('No complex node references, no merge nodes, no debug nodes.');
    console.log('Just: Split → Validate → Insert\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test - simplest approach possible!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

combineIntoOneNode();
