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

async function fixUseFunctionNode() {
  try {
    console.log('🔧 Switching to Function node (supports $http)...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const enrichNode = workflow.nodes.find(n => n.id === 'enrich-line-items');

    if (!enrichNode) {
      throw new Error('Could not find enrichment node!');
    }

    console.log('Step 2: Converting to Function node (supports $http)...');

    // Change to Function node which supports $http
    enrichNode.type = 'n8n-nodes-base.function';
    enrichNode.typeVersion = 1;
    enrichNode.parameters = {
      functionCode: `// Two-step validation using Function node ($http supported)
const items = $input.all();
const lineItems = items[0].json.lineItems;
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;

console.log('TWO-STEP VALIDATION');
console.log('Processing', lineItems.length, 'line items for customer', psCustomerId);

const supabaseUrl = 'https://xgftwwircksmhevzkrhn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZnR3d2lyY2tzbWhldnprcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzIxNTMsImV4cCI6MjA4MjAwODE1M30.7a5JX1ZM4uHiGS8uTfO42DVsgk2gREkBWuvVWnNpsv8';

for (let i = 0; i < lineItems.length; i++) {
  const lineItem = lineItems[i];

  console.log('Line', i+1, ':', lineItem.custproductsku);
  console.log('  sonanceProductOrig:', lineItem.sonanceProductOrig);

  let foundValidProduct = false;

  // STEP 1: Check if sonanceProductOrig is valid product_id in pricing
  if (lineItem.sonanceProductOrig && lineItem.sonanceProductOrig.trim() !== "") {
    const pricingUrl = supabaseUrl + '/rest/v1/customer_product_pricing?ps_customer_id=eq.' + psCustomerId + '&product_id=eq.' + encodeURIComponent(lineItem.sonanceProductOrig) + '&limit=1';

    console.log('  Step 1: Checking pricing for product_id', lineItem.sonanceProductOrig);

    try {
      const pricingResponse = await $http.request({
        method: 'GET',
        url: pricingUrl,
        headers: {
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey
        }
      });

      const pricingResults = pricingResponse.body;

      if (pricingResults && pricingResults.length > 0) {
        console.log('  ✅ Valid product_id in pricing table');
        lineItem.mappingSource = "customer_product_pricing";
        foundValidProduct = true;
      } else {
        console.log('  ❌ Not found in pricing');
      }
    } catch (error) {
      console.log('  ❌ Pricing check error:', error.message);
    }
  }

  // STEP 2: Check customer_product_mappings
  if (!foundValidProduct && lineItem.custproductsku) {
    const mappingUrl = supabaseUrl + '/rest/v1/customer_product_mappings?ps_customer_id=eq.' + psCustomerId + '&cust_product_sku=eq.' + encodeURIComponent(lineItem.custproductsku) + '&limit=1';

    console.log('  Step 2: Checking mappings for', lineItem.custproductsku);

    try {
      const mappingResponse = await $http.request({
        method: 'GET',
        url: mappingUrl,
        headers: {
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey
        }
      });

      const mappingResults = mappingResponse.body;

      if (mappingResults && mappingResults.length > 0) {
        const mapping = mappingResults[0];
        console.log('  ✅ Found mapping! sonance_product_sku:', mapping.sonance_product_sku);

        // UPDATE WITH MAPPED VALUE
        lineItem.sonanceProductOrig = mapping.sonance_product_sku;
        lineItem.mappingSource = "customer_product_mappings";
        lineItem.mappingConfidence = mapping.confidence_score || 1.0;
        foundValidProduct = true;
      } else {
        console.log('  ❌ No mapping found');
      }
    } catch (error) {
      console.log('  ❌ Mapping check error:', error.message);
    }
  }

  if (!foundValidProduct) {
    const hasValue = lineItem.sonanceProductOrig && lineItem.sonanceProductOrig.trim() !== "";
    lineItem.mappingSource = hasValue ? "ai_extraction" : "none";
  }
}

console.log('Validation complete');
return [lineItems];`
    };

    console.log('  ✅ Converted to Function node\n');

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

    console.log('\n✅ SUCCESS! Switched to Function node.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   WHY FUNCTION NODE?');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Code node: $http NOT available (throws error)');
    console.log('Function node: $http IS available ✅\n');

    console.log('This is why the mapping wasn\'t updating - $http.request()');
    console.log('was failing silently in the try/catch block!\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Test now - should correctly update VX80R → 96089!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixUseFunctionNode();
