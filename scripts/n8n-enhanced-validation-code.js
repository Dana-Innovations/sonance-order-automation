// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED TWO-STEP VALIDATION WITH PRICING ENRICHMENT
// ═══════════════════════════════════════════════════════════════════════════════
//
// Purpose: Validate product SKUs and enrich with pricing data at order creation time
//
// UOM Matching Priority:
//   1. Exact match: Customer UOM matches pricing table UOM
//   2. Default UOM: Use record where is_default_uom = true
//   3. NULL: If no match found, leave pricing fields as NULL
//
// Instructions:
//   1. Go to n8n.cloud and open Workflow ID: WiJuy1l0UxdVNWQI
//   2. Find the validation Function node (after "Split Order Lines")
//   3. Replace the entire code with this file's contents
//   4. Update the supabaseKey variable with your actual Supabase service role key
//   5. Save and test the workflow
// ═══════════════════════════════════════════════════════════════════════════════

const items = $input.all();
const lineItems = items[0].json.lineItems;
const psCustomerId = $("Insert Order Header").first().json.ps_customer_id;
const currencyCode = $("Insert Order Header").first().json.cust_currency_code || 'USD';

console.log('═══════════════════════════════════════════════════════════');
console.log('ENHANCED VALIDATION WITH PRICING ENRICHMENT');
console.log('Processing', lineItems.length, 'line items');
console.log('Customer:', psCustomerId, '| Currency:', currencyCode);
console.log('');

const supabaseUrl = 'https://xgftwwircksmhevzkrhn.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_KEY'; // ⚠️ REPLACE WITH YOUR ACTUAL KEY

for (let i = 0; i < lineItems.length; i++) {
  const lineItem = lineItems[i];

  console.log(`Line ${i+1}: ${lineItem.custproductsku}`);
  console.log(`  AI extracted SKU: "${lineItem.sonanceProductOrig}"`);
  console.log(`  Customer qty: ${lineItem.custquantity}, UOM: ${lineItem.custuom}`);

  let isValidated = false;
  let validatedSku = null;
  let validationSource = null;

  // Initialize sonance fields
  lineItem.sonance_quantity = lineItem.custquantity || null;
  lineItem.sonance_unit_price = null;
  lineItem.sonance_uom = null;

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Validate in customer_product_pricing AND enrich
  // ═══════════════════════════════════════════════════════════
  if (lineItem.sonanceProductOrig && lineItem.sonanceProductOrig.trim() !== "") {
    const pricingUrl = `${supabaseUrl}/rest/v1/customer_product_pricing?ps_customer_id=eq.${psCustomerId}&product_id=eq.${encodeURIComponent(lineItem.sonanceProductOrig)}&currency_code=eq.${currencyCode}&select=product_id,dfi_price,uom,is_default_uom`;

    console.log(`  Step 1: Checking pricing table`);

    try {
      const pricingResponse = await $http.request({
        method: 'GET',
        url: pricingUrl,
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      const pricingResults = pricingResponse.body;

      if (pricingResults && pricingResults.length > 0) {
        console.log(`  ✅ Valid SKU! Found ${pricingResults.length} UOM record(s)`);

        validatedSku = pricingResults[0].product_id;
        validationSource = "customer_product_pricing";
        isValidated = true;

        // UOM MATCHING LOGIC
        const customerUom = lineItem.custuom ? lineItem.custuom.trim().toUpperCase() : null;
        let selectedPricing = null;

        // Priority 1: Exact UOM match
        if (customerUom) {
          selectedPricing = pricingResults.find(p =>
            p.uom && p.uom.trim().toUpperCase() === customerUom
          );
          if (selectedPricing) {
            console.log(`  🎯 UOM Match: Customer UOM "${customerUom}" matched`);
          }
        }

        // Priority 2: Default UOM
        if (!selectedPricing) {
          selectedPricing = pricingResults.find(p => p.is_default_uom === true);
          if (selectedPricing) {
            console.log(`  🎯 Default UOM: ${selectedPricing.uom}`);
          } else {
            console.log(`  ⚠️ No exact or default UOM match - pricing remains NULL`);
          }
        }

        // ENRICH PRICING DATA
        if (selectedPricing) {
          lineItem.sonance_unit_price = selectedPricing.dfi_price || null;
          lineItem.sonance_uom = selectedPricing.uom || null;

          console.log(`  💰 Enriched: qty=${lineItem.sonance_quantity}, price=${lineItem.sonance_unit_price}, uom=${lineItem.sonance_uom}`);
        }

        lineItem.is_validated = true;
        lineItem.validated_sku = validatedSku;
        lineItem.validation_source = validationSource;

      } else {
        console.log(`  ❌ Not found in pricing table`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking pricing: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Check customer_product_mappings (if not validated)
  // ═══════════════════════════════════════════════════════════
  if (!isValidated && lineItem.custproductsku) {
    const mappingUrl = `${supabaseUrl}/rest/v1/customer_product_mappings?ps_customer_id=eq.${psCustomerId}&cust_product_sku=eq.${encodeURIComponent(lineItem.custproductsku)}&select=sonance_product_sku,confidence_score&limit=1`;

    console.log(`  Step 2: Checking mappings table`);

    try {
      const mappingResponse = await $http.request({
        method: 'GET',
        url: mappingUrl,
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      const mappingResults = mappingResponse.body;

      if (mappingResults && mappingResults.length > 0) {
        const mapping = mappingResults[0];
        console.log(`  ✅ Found mapping! ${lineItem.custproductsku} → ${mapping.sonance_product_sku}`);

        validatedSku = mapping.sonance_product_sku;
        validationSource = "customer_product_mappings";
        isValidated = true;

        lineItem.sonanceProductOrig = mapping.sonance_product_sku;

        // FETCH PRICING FOR MAPPED SKU
        console.log(`  Step 2b: Fetching pricing for mapped SKU`);

        const mappedPricingUrl = `${supabaseUrl}/rest/v1/customer_product_pricing?ps_customer_id=eq.${psCustomerId}&product_id=eq.${encodeURIComponent(mapping.sonance_product_sku)}&currency_code=eq.${currencyCode}&select=product_id,dfi_price,uom,is_default_uom`;

        try {
          const mappedPricingResponse = await $http.request({
            method: 'GET',
            url: mappedPricingUrl,
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            }
          });

          const mappedPricingResults = mappedPricingResponse.body;

          if (mappedPricingResults && mappedPricingResults.length > 0) {
            // Apply same UOM matching logic
            const customerUom = lineItem.custuom ? lineItem.custuom.trim().toUpperCase() : null;
            let selectedPricing = null;

            // Priority 1: Exact UOM match
            if (customerUom) {
              selectedPricing = mappedPricingResults.find(p =>
                p.uom && p.uom.trim().toUpperCase() === customerUom
              );
            }

            // Priority 2: Default UOM
            if (!selectedPricing) {
              selectedPricing = mappedPricingResults.find(p => p.is_default_uom === true);
            }

            // ENRICH PRICING DATA
            if (selectedPricing) {
              lineItem.sonance_unit_price = selectedPricing.dfi_price || null;
              lineItem.sonance_uom = selectedPricing.uom || null;

              console.log(`  💰 Enriched mapped: qty=${lineItem.sonance_quantity}, price=${lineItem.sonance_unit_price}, uom=${lineItem.sonance_uom}`);
            } else {
              console.log(`  ⚠️ Mapped SKU validated but no UOM match found`);
            }
          } else {
            console.log(`  ⚠️ Mapped SKU validated but no pricing found`);
          }
        } catch (error) {
          console.log(`  ⚠️ Error fetching pricing for mapped SKU: ${error.message}`);
        }

        lineItem.is_validated = true;
        lineItem.validated_sku = validatedSku;
        lineItem.validation_source = validationSource;
        lineItem.mapping_confidence = mapping.confidence_score || 1.0;

      } else {
        console.log(`  ❌ Not found in mappings table`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking mappings: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // FINAL: Mark unvalidated items
  // ═══════════════════════════════════════════════════════════
  if (!isValidated) {
    const hasValue = lineItem.sonanceProductOrig && lineItem.sonanceProductOrig.trim() !== "";
    lineItem.is_validated = false;
    lineItem.validated_sku = null;
    lineItem.validation_source = hasValue ? "ai_extraction" : "none";
    console.log(`  ℹ️ Not validated - source: ${lineItem.validation_source}`);
    // sonance_* fields remain NULL (except quantity from customer)
  }

  console.log('');
}

console.log('Validation and enrichment complete');
console.log('═══════════════════════════════════════════════════════════');

return [{ json: { lineItems: lineItems } }];
