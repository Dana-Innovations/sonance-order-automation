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

async function fixPricingValidationField() {
  try {
    console.log('🔧 Fixing pricing validation to use product_id field...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const enrichNode = workflow.nodes.find(n => n.id === 'enrich-line-items');

    if (!enrichNode) {
      throw new Error('Could not find enrichment node!');
    }

    console.log('Step 2: Fixing to check product_id instead of catalog_number...');

    enrichNode.parameters.jsCode = `// Two-step validation:
// 1. Check if sonanceProductOrig (product_id) is valid in customer_product_pricing
// 2. If not, check customer_product_mappings

const items = $input.all();
const lineItems = items[0].json.lineItems;
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;

console.log('═══════════════════════════════════════════════════════════');
console.log('TWO-STEP VALIDATION');
console.log('═══════════════════════════════════════════════════════════');
console.log('Processing', lineItems.length, 'line items for customer', psCustomerId);
console.log('');

const supabaseUrl = 'https://xgftwwircksmhevzkrhn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZnR3d2lyY2tzbWhldnprcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzIxNTMsImV4cCI6MjA4MjAwODE1M30.7a5JX1ZM4uHiGS8uTfO42DVsgk2gREkBWuvVWnNpsv8';

for (let i = 0; i < lineItems.length; i++) {
  const lineItem = lineItems[i];

  console.log(\`Line \${i+1}: \${lineItem.custproductsku}\`);
  console.log(\`  sonanceProductOrig: "\${lineItem.sonanceProductOrig}"\`);

  let foundValidProduct = false;

  // STEP 1: Check if sonanceProductOrig exists as product_id in customer_product_pricing
  if (lineItem.sonanceProductOrig && lineItem.sonanceProductOrig.trim() !== "") {
    const pricingUrl = \`\${supabaseUrl}/rest/v1/customer_product_pricing?ps_customer_id=eq.\${psCustomerId}&product_id=eq.\${encodeURIComponent(lineItem.sonanceProductOrig)}&limit=1\`;

    console.log(\`  Step 1: Checking pricing table for product_id "\${lineItem.sonanceProductOrig}"\`);

    try {
      const pricingResponse = await $http.request({
        method: 'GET',
        url: pricingUrl,
        headers: {
          'apikey': supabaseKey,
          'Authorization': \`Bearer \${supabaseKey}\`,
          'Content-Type': 'application/json'
        }
      });

      const pricingResults = pricingResponse.body;

      if (pricingResults && pricingResults.length > 0) {
        const pricing = pricingResults[0];
        console.log(\`  ✅ Valid! Found in pricing table - product_id: \${pricing.product_id}, catalog: \${pricing.catalog_number}\`);

        // Keep the existing sonanceProductOrig (it's valid)
        lineItem.mappingSource = "customer_product_pricing";
        lineItem.validatedCatalogNumber = pricing.catalog_number;
        lineItem.validatedProductId = pricing.product_id;
        foundValidProduct = true;
      } else {
        console.log(\`  ❌ Not found in pricing table\`);
      }
    } catch (error) {
      console.log(\`  ❌ Error checking pricing: \${error.message}\`);
    }
  }

  // STEP 2: If not found in pricing, check customer_product_mappings
  if (!foundValidProduct && lineItem.custproductsku) {
    const mappingUrl = \`\${supabaseUrl}/rest/v1/customer_product_mappings?ps_customer_id=eq.\${psCustomerId}&cust_product_sku=eq.\${encodeURIComponent(lineItem.custproductsku)}&limit=1\`;

    console.log(\`  Step 2: Checking mappings table for cust_product_sku "\${lineItem.custproductsku}"\`);

    try {
      const mappingResponse = await $http.request({
        method: 'GET',
        url: mappingUrl,
        headers: {
          'apikey': supabaseKey,
          'Authorization': \`Bearer \${supabaseKey}\`,
          'Content-Type': 'application/json'
        }
      });

      const mappingResults = mappingResponse.body;

      if (mappingResults && mappingResults.length > 0) {
        const mapping = mappingResults[0];
        console.log(\`  ✅ Found in mappings table! sonance_product_sku: \${mapping.sonance_product_sku}\`);

        // Update with mapped value
        lineItem.sonanceProductOrig = mapping.sonance_product_sku;
        lineItem.mappingSource = "customer_product_mappings";
        lineItem.mappingConfidence = mapping.confidence_score || 1.0;
        foundValidProduct = true;
      } else {
        console.log(\`  ❌ Not found in mappings table\`);
      }
    } catch (error) {
      console.log(\`  ❌ Error checking mappings: \${error.message}\`);
    }
  }

  // Set final mapping source
  if (!foundValidProduct) {
    const hasValue = lineItem.sonanceProductOrig && lineItem.sonanceProductOrig.trim() !== "";
    lineItem.mappingSource = hasValue ? "ai_extraction" : "none";
    console.log(\`  ℹ️ Using \${lineItem.mappingSource}\`);
  }

  console.log('');
}

console.log('Validation complete');
console.log('═══════════════════════════════════════════════════════════');

return [{ json: { lineItems: lineItems } }];`;

    console.log('  ✅ Updated to check product_id field\n');

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

    console.log('\n✅ SUCCESS! Pricing validation fixed.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   CORRECTED LOGIC');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('STEP 1: Validate sonanceProductOrig in pricing table');
    console.log('  Query: ps_customer_id + product_id (NOT catalog_number)');
    console.log('  Match: product_id=eq.{sonanceProductOrig}');
    console.log('  If found: VALID - keep existing value');
    console.log('  If found: STOP (don\'t check mappings)\n');

    console.log('STEP 2: Check mappings table (if Step 1 not found)');
    console.log('  Query: ps_customer_id + cust_product_sku');
    console.log('  If found: Update sonanceProductOrig\n');

    console.log('Example: Line 4 (VX80R)');
    console.log('  AI extracted: sonanceProductOrig = "VX80R"');
    console.log('  1. Check: ps_customer_id=203745 + product_id="VX80R"');
    console.log('  2. Not found (VX80R is not a valid product_id)');
    console.log('  3. Check mappings: ps_customer_id=203745 + cust_product_sku="VX80R"');
    console.log('  4. Found: VX80R → 96089');
    console.log('  5. Update: sonanceProductOrig = "96089"\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test - should correctly validate product_id!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixPricingValidationField();
