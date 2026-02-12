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

async function addDebugToEnrichment() {
  try {
    console.log('🔧 Adding detailed debug logging to enrichment node...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const enrichNode = workflow.nodes.find(n => n.id === 'enrich-line-items');

    if (!enrichNode) {
      throw new Error('Could not find enrichment node!');
    }

    console.log('Step 2: Adding comprehensive debug logging...');

    enrichNode.parameters.jsCode = `// Enrich line items array with product mappings BEFORE splitting
const items = $input.all();

// Get the lineItems array
const lineItems = items[0].json.lineItems;

// Get ps_customer_id from Insert Order Header node
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;

console.log('═══════════════════════════════════════════════════════════');
console.log('ENRICHMENT DEBUG');
console.log('═══════════════════════════════════════════════════════════');
console.log('Processing', lineItems.length, 'line items for customer', psCustomerId);
console.log('');

// Supabase config
const supabaseUrl = 'https://xgftwwircksmhevzkrhn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZnR3d2lyY2tzbWhldnprcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzIxNTMsImV4cCI6MjA4MjAwODE1M30.7a5JX1ZM4uHiGS8uTfO42DVsgk2gREkBWuvVWnNpsv8';

// Enrich each line item
for (let i = 0; i < lineItems.length; i++) {
  const lineItem = lineItems[i];

  console.log(\`Line \${i+1}:\`);
  console.log(\`  custproductsku: \${lineItem.custproductsku}\`);
  console.log(\`  sonanceProductOrig: \${lineItem.sonanceProductOrig}\`);

  // Check if sonanceProductOrig is null/empty
  const sonanceSkuEmpty = !lineItem.sonanceProductOrig ||
                          (typeof lineItem.sonanceProductOrig === 'string' &&
                           lineItem.sonanceProductOrig.trim() === "");

  console.log(\`  sonanceSkuEmpty: \${sonanceSkuEmpty}\`);

  if (sonanceSkuEmpty && lineItem.custproductsku) {
    // Query customer_product_mappings for this item
    const url = \`\${supabaseUrl}/rest/v1/customer_product_mappings?ps_customer_id=eq.\${psCustomerId}&cust_product_sku=eq.\${encodeURIComponent(lineItem.custproductsku)}&limit=1\`;

    console.log(\`  Query URL: \${url}\`);

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

      console.log(\`  HTTP Status: \${response.statusCode}\`);
      console.log(\`  Response body type: \${typeof response.body}\`);
      console.log(\`  Response body: \${JSON.stringify(response.body)}\`);

      const mappings = response.body;

      if (mappings && mappings.length > 0 && mappings[0].sonance_product_sku) {
        const mapping = mappings[0];
        console.log(\`  ✅ FOUND mapping: \${lineItem.custproductsku} → \${mapping.sonance_product_sku}\`);

        // Update the line item in the array
        lineItem.sonanceProductOrig = mapping.sonance_product_sku;
        lineItem.mappingSource = "customer_product_mappings";
        lineItem.mappingConfidence = mapping.confidence_score || 1.0;
        lineItem.mappingTimesUsed = mapping.times_used || 0;
      } else {
        console.log(\`  ❌ NO mapping found (empty result)\`);
        lineItem.mappingSource = "none";
      }
    } catch (error) {
      console.log(\`  ❌ ERROR during lookup: \${error.message}\`);
      console.log(\`  Error stack: \${error.stack}\`);
      lineItem.mappingSource = "none";
    }
  } else {
    // Already has value from AI extraction
    console.log(\`  ℹ️ Skipping lookup (already has value or no custproductsku)\`);
    lineItem.mappingSource = "ai_extraction";
  }

  console.log('');
}

console.log('Enrichment complete - returning enriched array');
console.log('═══════════════════════════════════════════════════════════');

// Return the enriched lineItems array
return [{ json: { lineItems: lineItems } }];`;

    console.log('  ✅ Added detailed debug logging\n');

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

    console.log('\n✅ SUCCESS! Debug logging added.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   WHAT TO DO NEXT');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('1. Run your workflow again with the same test order');
    console.log('2. Check the "Enrich Line Items with Mappings" node logs');
    console.log('3. Send me the debug output for Line 4 (VX80R)');
    console.log('');
    console.log('The logs will show:');
    console.log('  - What custproductsku value is being queried');
    console.log('  - The exact URL being called');
    console.log('  - Whether $http.request() works or throws an error');
    console.log('  - What the Supabase API returns');
    console.log('  - Whether the mapping was found and applied\n');

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

addDebugToEnrichment();
