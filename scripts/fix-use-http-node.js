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

async function useHttpNode() {
  try {
    console.log('🔧 Converting to HTTP Request node...\n');

    console.log('Step 1: Fetching current workflow...');
    const workflow = await makeRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(`  ✅ Loaded workflow with ${workflow.nodes.length} nodes\n`);

    const node2 = workflow.nodes.find(n => n.id === 'lookup-product-mapping');
    const node3 = workflow.nodes.find(n => n.id === 'apply-product-mapping');

    if (!node2 || !node3) {
      throw new Error('Could not find required nodes!');
    }

    console.log('Step 2: Converting Code node to HTTP Request node...');
    console.log('  HTTP Request nodes can make external API calls\n');

    // Convert to HTTP Request node
    node2.type = 'n8n-nodes-base.httpRequest';
    node2.typeVersion = 4.2;
    node2.parameters = {
      url: '=https://xgftwwircksmhevzkrhn.supabase.co/rest/v1/customer_product_mappings?ps_customer_id=eq.{{ $json.ps_customer_id }}&cust_product_sku=eq.{{ $json.custproductsku }}&limit=1',
      method: 'GET',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'apikey',
            value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZnR3d2lyY2tzbWhldnprcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzIxNTMsImV4cCI6MjA4MjAwODE1M30.7a5JX1ZM4uHiGS8uTfO42DVsgk2gREkBWuvVWnNpsv8'
          },
          {
            name: 'Authorization',
            value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZnR3d2lyY2tzbWhldnprcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzIxNTMsImV4cCI6MjA4MjAwODE1M30.7a5JX1ZM4uHiGS8uTfO42DVsgk2gREkBWuvVWnNpsv8'
          },
          {
            name: 'Content-Type',
            value: 'application/json'
          }
        ]
      },
      options: {}
    };

    console.log('  ✅ Converted to HTTP Request node\n');

    console.log('Step 3: Updating "Apply Product Mapping" to handle HTTP response...');
    console.log('  HTTP Request returns array, need to handle it\n');

    node3.parameters.jsCode = `// Apply product mapping if found and sonanceProductOrig is null/empty
// Get the original line item from Add Header Context node
const lineItem = $("Add Header Context to Line").first().json;

// Get the HTTP Request result (array from Supabase)
const httpResult = $input.first().json;
const mapping = (Array.isArray(httpResult) && httpResult.length > 0) ? httpResult[0] : null;

// Check if sonanceProductOrig is null/empty
const sonanceSkuEmpty = !lineItem.sonanceProductOrig ||
                        (typeof lineItem.sonanceProductOrig === 'string' &&
                         lineItem.sonanceProductOrig.trim() === "");

if (sonanceSkuEmpty && mapping && mapping.sonance_product_sku) {
  // Update with mapped value from customer_product_mappings table
  lineItem.sonanceProductOrig = mapping.sonance_product_sku;
  lineItem.mappingSource = "customer_product_mappings";
  lineItem.mappingConfidence = mapping.confidence_score || 1.0;
  lineItem.mappingTimesUsed = mapping.times_used || 0;
} else {
  // Keep original value
  lineItem.mappingSource = sonanceSkuEmpty ? "none" : "ai_extraction";
}

// Clean up temporary field
delete lineItem.ps_customer_id;

return { json: lineItem };`;

    console.log('  ✅ Updated to handle array response\n');

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

    console.log('\n✅ SUCCESS! Using HTTP Request node now.\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   HOW IT WORKS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('1. Add Header Context to Line');
    console.log('   → Adds ps_customer_id to current item');
    console.log('   → Item stored in node output\n');

    console.log('2. Lookup Product Mapping (HTTP Request node)');
    console.log('   → Queries Supabase with ps_customer_id & custproductsku');
    console.log('   → Returns array of mappings (or empty array)\n');

    console.log('3. Apply Product Mapping (Code node)');
    console.log('   → Gets line item from "Add Header Context" node');
    console.log('   → Gets mapping array from HTTP Request');
    console.log('   → Updates sonanceProductOrig if needed\n');

    console.log('4. Insert Order Line');
    console.log('   → Inserts to database ✅\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 Ready to test - HTTP Request is proper n8n method!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

useHttpNode();
