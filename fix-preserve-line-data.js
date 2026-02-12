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

async function fixPreserveLineData() {
  try {
    console.log('🔧 Replacing Supabase node with Code node to preserve line item data...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    console.log('Step 2: Understanding the issue...');
    console.log('  Problem: Supabase node REPLACES item with query result');
    console.log('  Result: Original line item data is LOST');
    console.log('  Effect: Can only process first item, not all 4\n');

    console.log('Step 3: Finding the Supabase lookup node...');
    const supabaseNode = workflow.nodes.find(n => n.id === 'lookup-product-mapping');
    const node3 = workflow.nodes.find(n => n.id === 'apply-product-mapping');

    if (!supabaseNode || !node3) {
      throw new Error('Could not find required nodes!');
    }

    console.log('  ✅ Found Supabase node: ' + supabaseNode.name);
    console.log('  Converting to Code node that preserves data...\n');

    // Replace Supabase node with Code node that does the lookup but preserves original data
    supabaseNode.type = 'n8n-nodes-base.code';
    supabaseNode.typeVersion = 2;
    delete supabaseNode.credentials;
    delete supabaseNode.alwaysOutputData;
    delete supabaseNode.operation;
    delete supabaseNode.tableId;
    delete supabaseNode.limit;
    delete supabaseNode.matchType;
    delete supabaseNode.filters;

    supabaseNode.parameters = {
      jsCode: `// Lookup product mapping while preserving original line item data
const currentItem = $input.first().json;

// Query Supabase for product mapping
const supabaseUrl = 'https://xgftwwircksmhevzkrhn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZnR3d2lyY2tzbWhldnprcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzIxNTMsImV4cCI6MjA4MjAwODE1M30.7a5JX1ZM4uHiGS8uTfO42DVsgk2gREkBWuvVWnNpsv8';

const url = \`\${supabaseUrl}/rest/v1/customer_product_mappings?ps_customer_id=eq.\${currentItem.ps_customer_id}&cust_product_sku=eq.\${currentItem.custproductsku}&limit=1\`;

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': \`Bearer \${supabaseKey}\`,
    'Content-Type': 'application/json'
  }
});

const mappings = await response.json();
const mapping = mappings && mappings.length > 0 ? mappings[0] : null;

// Add mapping data to the current item (preserving all original fields)
if (mapping) {
  currentItem.mapping_found = true;
  currentItem.mapping_sonance_sku = mapping.sonance_product_sku;
  currentItem.mapping_confidence = mapping.confidence_score;
  currentItem.mapping_times_used = mapping.times_used;
} else {
  currentItem.mapping_found = false;
}

return { json: currentItem };`
    };

    console.log('  ✅ Supabase node converted to Code node\n');

    console.log('Step 4: Simplifying "Apply Product Mapping"...');
    console.log('  Now the current item has BOTH line data AND mapping data\n');

    node3.parameters.jsCode = `// Apply product mapping if found and sonanceProductOrig is null/empty
const currentItem = $input.first().json;

// Check if sonanceProductOrig is null/empty
const sonanceSkuEmpty = !currentItem.sonanceProductOrig ||
                        (typeof currentItem.sonanceProductOrig === 'string' &&
                         currentItem.sonanceProductOrig.trim() === "");

// Apply mapping if conditions are met
if (sonanceSkuEmpty && currentItem.mapping_found && currentItem.mapping_sonance_sku) {
  // Update with mapped value from customer_product_mappings table
  currentItem.sonanceProductOrig = currentItem.mapping_sonance_sku;
  currentItem.mappingSource = "customer_product_mappings";
  currentItem.mappingConfidence = currentItem.mapping_confidence || 1.0;
  currentItem.mappingTimesUsed = currentItem.mapping_times_used || 0;
} else {
  // Keep original value
  currentItem.mappingSource = sonanceSkuEmpty ? "none" : "ai_extraction";
}

// Clean up temporary fields
delete currentItem.ps_customer_id;
delete currentItem.mapping_found;
delete currentItem.mapping_sonance_sku;
delete currentItem.mapping_confidence;
delete currentItem.mapping_times_used;

return { json: currentItem };`;

    console.log('  ✅ Simplified to use current item only\n');

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

    console.log('\n✅ SUCCESS! Workflow restructured to preserve line item data.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   HOW IT WORKS NOW');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Each item (1, 2, 3, 4) flows through:');
    console.log('');
    console.log('1. Split Order Lines');
    console.log('   → Item has: lineNumber, custproductsku, sonanceProductOrig, etc.');
    console.log('');
    console.log('2. Add Header Context');
    console.log('   → Adds: ps_customer_id');
    console.log('   → Item still has ALL original fields');
    console.log('');
    console.log('3. Lookup Product Mapping (NOW A CODE NODE)');
    console.log('   → Queries Supabase');
    console.log('   → KEEPS all original fields');
    console.log('   → ADDS: mapping_found, mapping_sonance_sku, etc.');
    console.log('');
    console.log('4. Apply Product Mapping');
    console.log('   → Uses data from CURRENT item only');
    console.log('   → Updates sonanceProductOrig if needed');
    console.log('');
    console.log('5. Insert Order Line');
    console.log('   → Inserts item to database ✅\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 All 4 items should now be processed and inserted!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixPreserveLineData();
