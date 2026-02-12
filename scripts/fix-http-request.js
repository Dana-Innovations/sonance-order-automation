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

async function fixHttpRequest() {
  try {
    console.log('🔧 Fixing Lookup Product Mapping to use $http helper...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const node2 = workflow.nodes.find(n => n.id === 'lookup-product-mapping');

    if (!node2) {
      throw new Error('Could not find lookup-product-mapping node!');
    }

    console.log('Step 2: Replacing fetch() with $http helper...');
    console.log('  n8n Code nodes use $http, not fetch()\n');

    // Use n8n's $http helper instead of fetch
    node2.parameters.jsCode = `// Lookup product mapping while preserving original line item data
const currentItem = $input.first().json;

// Query Supabase for product mapping using n8n's $http helper
const supabaseUrl = 'https://xgftwwircksmhevzkrhn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZnR3d2lyY2tzbWhldnprcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzIxNTMsImV4cCI6MjA4MjAwODE1M30.7a5JX1ZM4uHiGS8uTfO42DVsgk2gREkBWuvVWnNpsv8';

const url = \`\${supabaseUrl}/rest/v1/customer_product_mappings?ps_customer_id=eq.\${currentItem.ps_customer_id}&cust_product_sku=eq.\${encodeURIComponent(currentItem.custproductsku)}&limit=1\`;

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

return { json: currentItem };`;

    console.log('  ✅ Updated to use $http.request()\n');

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

    console.log('\n✅ SUCCESS! HTTP request fixed.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   UPDATED CODE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('✅ Using $http.request() instead of fetch()');
    console.log('✅ Properly encodes custproductsku in URL');
    console.log('✅ Parses response.body instead of awaiting json()');
    console.log('✅ Preserves all original line item fields\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test again!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fixHttpRequest();
