import { Tables } from '../types/database'

type Order = Tables<'orders'> & {
  customers: Tables<'customers'>
  order_lines: Tables<'order_lines'>[]
}

export function generateOrderXML(order: Order): string {
  // Use validated values where available, fallback to original
  const orderDate = order.cust_order_date
    ? new Date(order.cust_order_date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Order>
  <OrderHeader>
    <OrderNumber>${escapeXML(order.cust_order_number)}</OrderNumber>
    <CustomerID>${escapeXML(order.ps_customer_id)}</CustomerID>
    <CustomerName>${escapeXML(order.customers?.customer_name || order.customername || '')}</CustomerName>
    <OrderDate>${orderDate}</OrderDate>
    <CurrencyCode>${escapeXML(order.currency_code || 'USD')}</CurrencyCode>
    <ShipTo>
      <Name>${escapeXML(order.shipto_name || '')}</Name>
      <AddressLine1>${escapeXML(order.cust_shipto_address_line1 || '')}</AddressLine1>
      ${order.cust_shipto_address_line2 ? `<AddressLine2>${escapeXML(order.cust_shipto_address_line2)}</AddressLine2>` : ''}
      ${order.cust_shipto_address_line3 ? `<AddressLine3>${escapeXML(order.cust_shipto_address_line3)}</AddressLine3>` : ''}
      <City>${escapeXML(order.cust_shipto_city || '')}</City>
      <State>${escapeXML(order.cust_shipto_state || '')}</State>
      <PostalCode>${escapeXML(order.cust_shipto_postal_code || '')}</PostalCode>
      <Country>${escapeXML(order.cust_shipto_country || 'US')}</Country>
    </ShipTo>
    <Carrier>
      <CustomerCarrier>${escapeXML(order.cust_carrier || '')}</CustomerCarrier>
      <SonanceCarrierID>${escapeXML(order.Son_Carrier_ID || '')}</SonanceCarrierID>
    </Carrier>
    <ShipVia>
      <CustomerShipVia>${escapeXML(order.cust_ship_via || '')}</CustomerShipVia>
      <SonanceShipVia>${escapeXML(order.Son_Ship_via || '')}</SonanceShipVia>
    </ShipVia>
    ${order.cust_header_notes ? `<HeaderNotes>${escapeXML(order.cust_header_notes)}</HeaderNotes>` : ''}
  </OrderHeader>
  <OrderLines>
    ${order.order_lines
      ?.map(
        (line) => `    <OrderLine>
      <LineNumber>${line.cust_line_number}</LineNumber>
      <ProductSKU>${escapeXML(line.cust_product_sku || '')}</ProductSKU>
      <Description>${escapeXML(line.cust_line_desc || '')}</Description>
      <Quantity>${line.cust_quantity?.toFixed(4) || '0.0000'}</Quantity>
      <UOM>${escapeXML(line.cust_uom || '')}</UOM>
      <UnitPrice>${line.cust_unit_price?.toFixed(2) || '0.00'}</UnitPrice>
      <LineTotal>${line.cust_line_total?.toFixed(2) || '0.00'}</LineTotal>
      <CurrencyCode>${escapeXML(line.cust_currency_code || order.currency_code || 'USD')}</CurrencyCode>
    </OrderLine>`
      )
      .join('\n') || '    <!-- No order lines -->'}
  </OrderLines>
</Order>`

  return xml
}

function escapeXML(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function validateOrderForExport(order: Order): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (order.status_code !== '03') {
    errors.push('Order must be in Validated status to export')
  }

  if (!order.cust_order_number) {
    errors.push('Order number is required')
  }

  if (!order.ps_customer_id) {
    errors.push('Customer ID is required')
  }

  if (!order.cust_shipto_address_line1 || !order.cust_shipto_city || !order.cust_shipto_state) {
    errors.push('Complete ship-to address is required')
  }

  if (!order.cust_carrier) {
    errors.push('Carrier is required')
  }

  if (!order.order_lines || order.order_lines.length === 0) {
    errors.push('At least one order line is required')
  }

  // Validate order lines
  order.order_lines?.forEach((line, index) => {
    if (!line.cust_product_sku) {
      errors.push(`Line ${line.cust_line_number}: Product SKU is required`)
    }
    if (!line.cust_quantity || line.cust_quantity <= 0) {
      errors.push(`Line ${line.cust_line_number}: Valid quantity is required`)
    }
    if (line.cust_unit_price === null || line.cust_unit_price === undefined || line.cust_unit_price < 0) {
      errors.push(`Line ${line.cust_line_number}: Valid unit price is required`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

