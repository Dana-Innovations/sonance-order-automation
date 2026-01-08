const fs = require('fs');

// Read the CSV file
const inputPath = './CustomerPriceCSV.csv';
const outputPath = './CustomerPriceCSV_formatted.csv';

const content = fs.readFileSync(inputPath, 'utf8');
const lines = content.split('\n');

// New header mapping
const newHeader = 'ps_customer_id,customer_name,currency_code,catalog_number,prod_group_catalog,product_id,description,brand,category,is_kit,uom,is_default_uom,pricing_uom,list_price,discount_pct,dfi_price';

// Process lines
const outputLines = [newHeader];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // Parse CSV properly handling quoted fields
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  
  // Convert Y/N to true/false for Kit (index 9) and Default UOM (index 11)
  if (values.length >= 12) {
    values[9] = values[9] === 'Y' ? 'true' : 'false';  // Kit -> is_kit
    values[11] = values[11] === 'Y' ? 'true' : 'false'; // Default UOM -> is_default_uom
  }
  
  // Escape any fields with commas or quotes
  const escapedValues = values.map(v => {
    if (v.includes(',') || v.includes('"')) {
      return '"' + v.replace(/"/g, '""') + '"';
    }
    return v;
  });
  
  outputLines.push(escapedValues.join(','));
}

fs.writeFileSync(outputPath, outputLines.join('\n'));
console.log('Created formatted CSV with ' + (outputLines.length - 1) + ' data rows');
console.log('Output file: ' + outputPath);

