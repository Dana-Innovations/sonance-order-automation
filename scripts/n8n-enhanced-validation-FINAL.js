// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED VALIDATION WITH PRICING ENRICHMENT - FINAL VERSION
// ═══════════════════════════════════════════════════════════════════════════════
//
// Purpose: Validate product SKUs AND enrich with pricing data
//
// This version enriches ALL validated items, including items validated in the
// first pass (mapping table) and items validated in this node (pricing table)
//
// REPLACE THE CODE IN: "Validate Products against Prod Pricing Table" node
//
// ═══════════════════════════════════════════════════════════════════════════════

// Get Supabase credentials
const supabaseUrl = 'https://xgftwwircksmhevzkrhn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZnR3d2lyY2tzbWhldnprcmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzIxNTMsImV4cCI6MjA4MjAwODE1M30.7a5JX1ZM4uHiGS8uTfO42DVsgk2gREkBWuvVWnNpsv8';

// Get current item data
const customerId = $json.PS_Customer_ID;
const currencyCode = $json.currency || 'USD';
const customerUom = $json.custuom ? $json.custuom.trim().toUpperCase() : null;

// Determine which SKU to use for pricing lookup
// If already validated in first pass, use the validated_sku (mapped SKU)
// Otherwise use sonanceProdsku (AI extracted)
const skuToLookup = $json.is_validated ? $json.validated_sku : $json.sonanceProdsku;

// Initialize sonance enrichment fields
let sonance_quantity = $json.custquantity || null;
let sonance_unit_price = null;
let sonance_uom = null;

// Initialize validation fields (may be updated if not yet validated)
let validated_sku = $json.validated_sku || null;
let is_validated = $json.is_validated || false;
let validation_source = $json.validation_source || null;
let needs_manual_review = $json.needs_manual_review !== undefined ? $json.needs_manual_review : true;

// Query Supabase customer_product_pricing table
// IMPORTANT: Now selecting pricing fields (dfi_price, uom, is_default_uom)
const query = `ps_customer_id=eq.${customerId}&product_id=eq.${encodeURIComponent(skuToLookup)}&currency_code=eq.${currencyCode}`;
const url = `${supabaseUrl}/rest/v1/customer_product_pricing?${query}&select=product_id,dfi_price,uom,is_default_uom`;

try {
  const response = await this.helpers.httpRequest({
    method: 'GET',
    url: url,
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    json: true
  });

  // Check if we found ANY match in pricing table
  if (response.length > 0) {
    // Product exists in pricing table!

    // If not already validated, mark as validated now
    if (!$json.is_validated) {
      validated_sku = skuToLookup;
      is_validated = true;
      validation_source = 'cust_pricing_table';
      needs_manual_review = false;
    }

    // ═══════════════════════════════════════════════════════════
    // UOM MATCHING LOGIC (runs for ALL validated items)
    // ═══════════════════════════════════════════════════════════
    let selectedPricing = null;

    // Priority 1: Exact UOM match
    if (customerUom) {
      selectedPricing = response.find(p =>
        p.uom && p.uom.trim().toUpperCase() === customerUom
      );
    }

    // Priority 2: Default UOM
    if (!selectedPricing) {
      selectedPricing = response.find(p => p.is_default_uom === true);
    }

    // Priority 3: NULL (no fallback to arbitrary UOM)
    // If no exact match and no default, leave pricing fields as NULL

    // Enrich pricing fields if a match was found
    if (selectedPricing) {
      sonance_unit_price = selectedPricing.dfi_price || null;
      sonance_uom = selectedPricing.uom || null;
    }

    return {
      json: {
        ...$json,
        validated_sku: validated_sku,
        is_validated: is_validated,
        validation_source: validation_source,
        needs_manual_review: needs_manual_review,
        // ENRICHED FIELDS (populated for ALL validated items)
        sonance_quantity: sonance_quantity,
        sonance_unit_price: sonance_unit_price,
        sonance_uom: sonance_uom
      }
    };
  } else {
    // No match found in pricing table

    // If item was already validated in first pass, keep validation but no enrichment
    if ($json.is_validated) {
      return {
        json: {
          ...$json,
          // Keep existing validation status
          // But add enrichment fields as NULL (no pricing found)
          sonance_quantity: sonance_quantity,
          sonance_unit_price: null,
          sonance_uom: null
        }
      };
    }

    // Item not validated anywhere - explicitly set as not validated
    return {
      json: {
        ...$json,
        validated_sku: null,
        is_validated: false,
        needs_manual_review: true,
        // Enriched fields remain NULL
        sonance_quantity: sonance_quantity,
        sonance_unit_price: null,
        sonance_uom: null
      }
    };
  }

} catch (error) {
  // If lookup fails, preserve existing validation status if any
  return {
    json: {
      ...$json,
      validated_sku: validated_sku,
      is_validated: is_validated,
      validation_source: validation_source,
      needs_manual_review: true,
      pricing_lookup_error: error.message,
      // Enriched fields remain NULL
      sonance_quantity: sonance_quantity,
      sonance_unit_price: null,
      sonance_uom: null
    }
  };
}
