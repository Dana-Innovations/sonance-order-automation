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

async function addFunctionDebug() {
  try {
    console.log('🔧 Adding comprehensive debug logging to Function node...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const enrichNode = workflow.nodes.find(n => n.id === 'enrich-line-items');

    if (!enrichNode) {
      throw new Error('Could not find enrichment node!');
    }

    console.log('Step 2: Adding detailed debug logging...');

    enrichNode.parameters.functionCode = `// Two-step validation with DETAILED DEBUG LOGGING
const items = $input.all();
const lineItems = items[0].json.lineItems;
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;

console.log('═══════════════════════════════════════════════════════════');
console.log('TWO-STEP VALIDATION DEBUG');
console.log('═══════════════════════════════════════════════════════════');
console.log('Customer ID:', psCustomerId);
console.log('Line items count:', lineItems.length);
console.log('');

const supabaseUrl = 'https://xgftwwircksmhevzkrhn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZnR3d2lyY2tzbWhldnprcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzIxNTMsImV4cCI6MjA4MjAwODE1M30.7a5JX1ZM4uHiGS8uTfO42DVsgk2gREkBWuvVWnNpsv8';

for (let i = 0; i < lineItems.length; i++) {
  const lineItem = lineItems[i];

  console.log('-----------------------------------------------------------');
  console.log('LINE', i+1);
  console.log('-----------------------------------------------------------');
  console.log('custproductsku:', lineItem.custproductsku);
  console.log('sonanceProductOrig BEFORE:', lineItem.sonanceProductOrig);

  let foundValidProduct = false;

  // STEP 1: Check if sonanceProductOrig is valid product_id in pricing
  if (lineItem.sonanceProductOrig && lineItem.sonanceProductOrig.trim() !== "") {
    const pricingUrl = supabaseUrl + '/rest/v1/customer_product_pricing?ps_customer_id=eq.' + psCustomerId + '&product_id=eq.' + encodeURIComponent(lineItem.sonanceProductOrig) + '&limit=1';

    console.log('STEP 1: Validate in pricing table');
    console.log('  URL:', pricingUrl);

    try {
      const pricingResponse = await $http.request({
        method: 'GET',
        url: pricingUrl,
        headers: {
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey
        }
      });

      console.log('  HTTP Status:', pricingResponse.statusCode);
      console.log('  Response body:', JSON.stringify(pricingResponse.body));

      const pricingResults = pricingResponse.body;

      if (pricingResults && pricingResults.length > 0) {
        console.log('  ✅ FOUND in pricing table - keeping original value');
        lineItem.mappingSource = "customer_product_pricing";
        foundValidProduct = true;
      } else {
        console.log('  ❌ NOT FOUND in pricing - will check mappings');
      }
    } catch (error) {
      console.log('  ❌ ERROR:', error.message);
      console.log('  Stack:', error.stack);
    }
  } else {
    console.log('STEP 1: Skipped (sonanceProductOrig is empty)');
  }

  // STEP 2: Check customer_product_mappings
  if (!foundValidProduct && lineItem.custproductsku) {
    const mappingUrl = supabaseUrl + '/rest/v1/customer_product_mappings?ps_customer_id=eq.' + psCustomerId + '&cust_product_sku=eq.' + encodeURIComponent(lineItem.custproductsku) + '&limit=1';

    console.log('STEP 2: Check mappings table');
    console.log('  URL:', mappingUrl);

    try {
      const mappingResponse = await $http.request({
        method: 'GET',
        url: mappingUrl,
        headers: {
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey
        }
      });

      console.log('  HTTP Status:', mappingResponse.statusCode);
      console.log('  Response body:', JSON.stringify(mappingResponse.body));

      const mappingResults = mappingResponse.body;

      if (mappingResults && mappingResults.length > 0) {
        const mapping = mappingResults[0];
        console.log('  ✅ FOUND MAPPING!');
        console.log('    sonance_product_sku:', mapping.sonance_product_sku);
        console.log('    confidence_score:', mapping.confidence_score);

        // UPDATE THE VALUE
        console.log('  UPDATING: sonanceProductOrig from', lineItem.sonanceProductOrig, 'to', mapping.sonance_product_sku);
        lineItem.sonanceProductOrig = mapping.sonance_product_sku;
        lineItem.mappingSource = "customer_product_mappings";
        lineItem.mappingConfidence = mapping.confidence_score || 1.0;
        foundValidProduct = true;

        console.log('  AFTER UPDATE: sonanceProductOrig is now', lineItem.sonanceProductOrig);
      } else {
        console.log('  ❌ NO MAPPING FOUND (empty result)');
      }
    } catch (error) {
      console.log('  ❌ ERROR:', error.message);
      console.log('  Stack:', error.stack);
    }
  } else if (!foundValidProduct) {
    console.log('STEP 2: Skipped (already found in pricing or no custproductsku)');
  }

  if (!foundValidProduct) {
    const hasValue = lineItem.sonanceProductOrig && lineItem.sonanceProductOrig.trim() !== "";
    lineItem.mappingSource = hasValue ? "ai_extraction" : "none";
    console.log('  Using mappingSource:', lineItem.mappingSource);
  }

  console.log('sonanceProductOrig AFTER:', lineItem.sonanceProductOrig);
  console.log('mappingSource:', lineItem.mappingSource);
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════');
console.log('VALIDATION COMPLETE - Returning enriched array');
console.log('═══════════════════════════════════════════════════════════');

// Return in the format Split expects
return [{ json: { lineItems: lineItems } }];`;

    console.log('  ✅ Added comprehensive debug logging\n');

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
    console.log('   WHAT TO CHECK');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Run your workflow and check the Function node logs for Line 4.');
    console.log('');
    console.log('The logs will show:');
    console.log('  1. sonanceProductOrig BEFORE validation');
    console.log('  2. Step 1 result (pricing table check)');
    console.log('  3. Step 2 result (mappings table check)');
    console.log('  4. Whether mapping was found');
    console.log('  5. The UPDATE statement showing old → new value');
    console.log('  6. sonanceProductOrig AFTER validation');
    console.log('');
    console.log('Send me the complete log output for Line 4!\n');

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

addFunctionDebug();
