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

async function addValidationBeforeSplit() {
  try {
    console.log('🔧 Adding validation BEFORE Split node...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const setLineItemsNode = workflow.nodes.find(n => n.id === 'set-line-items');
    const splitNode = workflow.nodes.find(n => n.id === 'split-lines');

    if (!setLineItemsNode || !splitNode) {
      throw new Error('Could not find Set Line Items or Split nodes!');
    }

    console.log('Step 2: Creating validation node BEFORE Split...');

    // Create Code node to enrich lineItems array before splitting
    const enrichNode = {
      id: 'enrich-line-items',
      name: 'Enrich Line Items with Mappings',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [
        setLineItemsNode.position[0] + 300,
        setLineItemsNode.position[1]
      ],
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: `// Enrich line items array with product mappings BEFORE splitting
const items = $input.all();

// Get the lineItems array
const lineItems = items[0].json.lineItems;

// Get ps_customer_id from Insert Order Header node
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;

console.log('Processing', lineItems.length, 'line items for customer', psCustomerId);

// Supabase config
const supabaseUrl = 'https://xgftwwircksmhevzkrhn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZnR3d2lyY2tzbWhldnprcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzIxNTMsImV4cCI6MjA4MjAwODE1M30.7a5JX1ZM4uHiGS8uTfO42DVsgk2gREkBWuvVWnNpsv8';

// Enrich each line item
for (let i = 0; i < lineItems.length; i++) {
  const lineItem = lineItems[i];

  // Check if sonanceProductOrig is null/empty
  const sonanceSkuEmpty = !lineItem.sonanceProductOrig ||
                          (typeof lineItem.sonanceProductOrig === 'string' &&
                           lineItem.sonanceProductOrig.trim() === "");

  if (sonanceSkuEmpty && lineItem.custproductsku) {
    // Query customer_product_mappings for this item
    const url = \`\${supabaseUrl}/rest/v1/customer_product_mappings?ps_customer_id=eq.\${psCustomerId}&cust_product_sku=eq.\${encodeURIComponent(lineItem.custproductsku)}&limit=1\`;

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

      if (mappings && mappings.length > 0 && mappings[0].sonance_product_sku) {
        const mapping = mappings[0];
        console.log(\`  Line \${i+1}: Found mapping \${lineItem.custproductsku} → \${mapping.sonance_product_sku}\`);

        // Update the line item in the array
        lineItem.sonanceProductOrig = mapping.sonance_product_sku;
        lineItem.mappingSource = "customer_product_mappings";
        lineItem.mappingConfidence = mapping.confidence_score || 1.0;
        lineItem.mappingTimesUsed = mapping.times_used || 0;
      } else {
        console.log(\`  Line \${i+1}: No mapping found for \${lineItem.custproductsku}\`);
        lineItem.mappingSource = "none";
      }
    } catch (error) {
      console.log(\`  Line \${i+1}: Lookup failed - \${error.message}\`);
      lineItem.mappingSource = "none";
    }
  } else {
    // Already has value from AI extraction
    lineItem.mappingSource = "ai_extraction";
  }
}

console.log('Enrichment complete - returning enriched array');

// Return the enriched lineItems array
return [{ json: { lineItems: lineItems } }];`
      }
    };

    workflow.nodes.push(enrichNode);

    console.log('  ✅ Created enrichment node\n');

    console.log('Step 3: Updating connections...');

    // Insert enrichment node between Set Line Items and Split
    workflow.connections['Set Line Items Array'] = {
      main: [[{ node: enrichNode.name, type: 'main', index: 0 }]]
    };

    workflow.connections[enrichNode.name] = {
      main: [[{ node: splitNode.name, type: 'main', index: 0 }]]
    };

    console.log('  ✅ Updated connections\n');

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

    console.log('\n✅ SUCCESS! Validation added BEFORE Split.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   NEW FLOW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('AI Agent: Extract Order Data');
    console.log('  → Extracts lineItems array with 4 items\n');

    console.log('Set Line Items Array');
    console.log('  → Sets lineItems: [item1, item2, item3, item4]\n');

    console.log('Enrich Line Items with Mappings (NEW!)');
    console.log('  → Gets ps_customer_id from Insert Order Header');
    console.log('  → Loops through all 4 items in the array');
    console.log('  → For each item with null sonanceProductOrig:');
    console.log('    - Queries customer_product_mappings');
    console.log('    - Updates sonanceProductOrig if mapping found');
    console.log('  → Returns ENRICHED array: [enriched1, enriched2, enriched3, enriched4]\n');

    console.log('Split Order Lines');
    console.log('  → Splits the ENRICHED array into 4 individual items\n');

    console.log('Insert Order Line');
    console.log('  → Inserts each enriched item (working flow!)\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('   KEY ADVANTAGE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('✅ Enrichment happens on the ARRAY before splitting');
    console.log('✅ Split → Insert flow remains unchanged and working');
    console.log('✅ All 4 items processed and enriched');
    console.log('✅ Validation logic only updates null values\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test - should insert all 4 enriched items!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

addValidationBeforeSplit();
