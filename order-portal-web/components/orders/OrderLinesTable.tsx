'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { PriceValidation } from './PriceValidation'
import { LineItemEditor } from './LineItemEditor'
import { Tables } from '@/lib/types/database'
import { ShoppingCart, X, AlertTriangle, CheckCircle } from 'lucide-react'

type OrderLine = Tables<'order_lines'>
type Order = Tables<'orders'> & {
  order_lines: OrderLine[]
}

// Helper function to format currency with comma separators
const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '0.00'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function OrderLinesTable({
  order,
  userId,
}: {
  order: Order
  userId: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const isCancelled = order.status_code === '06'
  const isImportSuccessful = order.status_code === '05'
  const isUploadInProcess = order.status_code === '04'
  const canEdit = !isCancelled && !isImportSuccessful && !isUploadInProcess

  // Local state for sonance prices (to show updated values after lookup)
  const [sonancePrices, setSonancePrices] = useState<Record<string, number | null>>({})

  // Price comparison state for warning icons
  const [priceComparisons, setPriceComparisons] = useState<Record<string, {
    variance: number
    custPrice: number
    sonancePrice: number
    hasValidPrice: boolean
  }>>({})

  // Track which line is being edited
  const [editingLineId, setEditingLineId] = useState<string | null>(null)

  // Track which line's price tooltip is showing
  const [hoveredPriceLineId, setHoveredPriceLineId] = useState<string | null>(null)

  const handleCancelLine = async (line: OrderLine) => {
    if (!confirm('Are you sure you want to cancel this line?')) return

    const { error } = await supabase
      .from('order_lines')
      .update({ line_status: 'cancelled' })
      .eq('id', line.id)

    if (error) {
      alert('Error cancelling line: ' + error.message)
      return
    }

    // Log to audit log
    await supabase.from('audit_log').insert({
      order_id: order.id,
      order_line_id: line.id,
      user_id: userId,
      action_type: 'line_cancelled',
      field_name: 'line_status',
      old_value: line.line_status || 'active',
      new_value: 'cancelled',
      reason: 'Line cancelled - will not be posted to ERP',
    })

    router.refresh()
  }

  const handleRestoreLine = async (line: OrderLine) => {
    const { error } = await supabase
      .from('order_lines')
      .update({ line_status: 'active' })
      .eq('id', line.id)

    if (error) {
      alert('Error restoring line: ' + error.message)
      return
    }

    // Log to audit log
    await supabase.from('audit_log').insert({
      order_id: order.id,
      order_line_id: line.id,
      user_id: userId,
      action_type: 'line_restored',
      field_name: 'line_status',
      old_value: 'cancelled',
      new_value: 'active',
      reason: 'Line restored - can be posted to ERP',
    })

    router.refresh()
  }

  // Create a cache key that includes all line SKUs so we refetch when they change
  const lineSkusKey = order.order_lines
    ?.map(l => `${l.id}:${l.sonance_prod_sku || l.cust_product_sku}`)
    .join(',') || ''

  // On page load or when lines change, lookup and populate sonance_unit_price
  useEffect(() => {
    const lookupAndUpdatePrices = async () => {
      const lines = order.order_lines || []
      const updatedPrices: Record<string, number | null> = {}
      const updatedComparisons: Record<string, {
        variance: number
        custPrice: number
        sonancePrice: number
        hasValidPrice: boolean
      }> = {}

      for (const line of lines) {
        // Get the SKU and UOM to use for lookup (sonance values only)
        const skuToLookup = line.sonance_prod_sku || line.cust_product_sku
        const uomToLookup = line.sonance_uom

        if (!skuToLookup) {
          updatedPrices[line.id] = null
          continue
        }

        // Always lookup price from customer_product_pricing to get the current value
        // First try exact match with UOM
        let { data: pricing } = await supabase
          .from('customer_product_pricing')
          .select('dfi_price')
          .eq('ps_customer_id', order.ps_customer_id || '')
          .eq('product_id', skuToLookup)
          .eq('uom', uomToLookup || 'EA')
          .maybeSingle()

        let hasMatchingUom = !!pricing

        // If no exact match, try without UOM filter
        if (!pricing) {
          const { data: fallbackPricing } = await supabase
            .from('customer_product_pricing')
            .select('dfi_price')
            .eq('ps_customer_id', order.ps_customer_id || '')
            .eq('product_id', skuToLookup)
            .limit(1)
            .maybeSingle()

          pricing = fallbackPricing
          hasMatchingUom = false
        }

        if (pricing?.dfi_price != null) {
          updatedPrices[line.id] = pricing.dfi_price

          // Only update the order_lines table if the current value is different
          if (line.sonance_unit_price !== pricing.dfi_price) {
            await supabase
              .from('order_lines')
              .update({ sonance_unit_price: pricing.dfi_price })
              .eq('id', line.id)
          }

          // Calculate price variance if both prices exist
          const custPrice = line.cust_unit_price
          const sonancePrice = pricing.dfi_price

          if (custPrice != null && custPrice > 0) {
            const variance = Math.abs(custPrice - sonancePrice) / custPrice * 100

            updatedComparisons[line.id] = {
              variance,
              custPrice,
              sonancePrice,
              hasValidPrice: true
            }
          }
        } else {
          // If no pricing found, use the existing sonance_unit_price if available
          updatedPrices[line.id] = line.sonance_unit_price ?? null
        }
      }

      setSonancePrices(updatedPrices)
      setPriceComparisons(updatedComparisons)
    }

    lookupAndUpdatePrices()
  }, [order.id, lineSkusKey, order.ps_customer_id, supabase])

  // Fetch Sonance description from customer_product_pricing for each line
  const { data: sonanceDescriptions, refetch: refetchDescriptions } = useQuery({
    queryKey: ['sonance-descriptions', order.id, order.ps_customer_id, order.currency_code, lineSkusKey],
    queryFn: async () => {
      const lines = order.order_lines || []
      const descriptions: Record<string, string> = {}

      for (const line of lines) {
        const sonanceSku = line.sonance_prod_sku || line.cust_product_sku
        if (!sonanceSku) continue

        // Lookup description from customer_product_pricing
        // Try with currency_code first, then without
        let { data: pricing } = await supabase
          .from('customer_product_pricing')
          .select('description')
          .eq('ps_customer_id', order.ps_customer_id || '')
          .eq('product_id', sonanceSku)
          .limit(1)
          .maybeSingle()

        if (pricing?.description) {
          descriptions[line.id] = pricing.description
        }
      }

      return descriptions
    },
    staleTime: 0, // Always refetch when query key changes
  })

  // Fetch pricing data for each line item
  const { data: pricingData } = useQuery({
    queryKey: ['order-pricing', order.id],
    queryFn: async () => {
      const lines = order.order_lines || []
      const pricingResults: Record<string, any> = {}

      for (const line of lines) {
        if (!line.cust_product_sku) continue

        // Try to find product by SKU
        const { data: product } = await supabase
          .from('products')
          .select('id')
          .eq('product_sku', line.cust_product_sku)
          .single()

        if (product) {
          // Get customer pricing
          const { data: customerPricing } = await supabase
            .from('customer_pricing')
            .select('*')
            .eq('ps_customer_id', order.ps_customer_id)
            .eq('product_id', product.id)
            .eq('uom', line.cust_uom || '')
            .eq('currency_code', line.cust_currency_code || 'USD')
            .single()

          pricingResults[line.id] = {
            product,
            customerPricing,
            isValidItem: true,
          }
        } else {
          pricingResults[line.id] = {
            isValidItem: false,
          }
        }
      }

      return pricingResults
    },
  })

  const calculateCustomerTotal = () => {
    return order.order_lines.reduce((sum, line) => {
      // Exclude cancelled lines from totals
      if (line.line_status === 'cancelled') return sum
      return sum + (Number(line.cust_line_total) || 0)
    }, 0)
  }

  const calculateSonanceTotal = () => {
    return order.order_lines.reduce((sum, line) => {
      // Exclude cancelled lines from totals
      if (line.line_status === 'cancelled') return sum
      const qty = line.sonance_quantity ?? line.cust_quantity ?? 0
      const price = sonancePrices[line.id] ?? null
      if (price != null) {
        return sum + (qty * price)
      }
      return sum
    }, 0)
  }

  const renderPriceWarningIcon = (line: OrderLine) => {
    const comparison = priceComparisons[line.id]

    // Only show icon if:
    // 1. Both prices exist and are valid
    // 2. Sonance price has valid UOM match
    if (!comparison?.hasValidPrice) return null

    const variance = comparison.variance
    const isHovered = hoveredPriceLineId === line.id

    // Exact match - show green checkmark
    if (variance < 0.01) {
      return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <CheckCircle
            className="text-green-600"
            style={{ width: '16px', height: '16px', cursor: 'help', color: '#16a34a' }}
            onMouseEnter={() => setHoveredPriceLineId(line.id)}
            onMouseLeave={() => setHoveredPriceLineId(null)}
          />
          {isHovered && (
            <div style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: '24px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '6px',
              padding: '8px 12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              zIndex: 1000,
              minWidth: '220px',
              whiteSpace: 'nowrap'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#15803d', marginBottom: '4px' }}>
                ✓ Prices Match
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                Customer PO and Sonance pricing are identical
              </div>
              {/* Tooltip arrow */}
              <div style={{
                position: 'absolute',
                bottom: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '0',
                height: '0',
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid #86efac'
              }} />
            </div>
          )}
        </div>
      )
    }

    // Price difference - show warning icon
    const isHighVariance = variance > 5
    const iconColor = isHighVariance ? '#dc2626' : '#f59e0b'
    const bgColor = isHighVariance ? '#fef2f2' : '#fffbeb'
    const borderColor = isHighVariance ? '#fca5a5' : '#fde68a'
    const textColor = isHighVariance ? '#991b1b' : '#92400e'
    const priceDiff = comparison.sonancePrice - comparison.custPrice
    const diffSign = priceDiff > 0 ? '+' : ''
    const priceDirection = priceDiff > 0 ? 'higher' : 'lower'

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <AlertTriangle
          className="cursor-help"
          style={{
            width: '16px',
            height: '16px',
            color: iconColor
          }}
          onMouseEnter={() => setHoveredPriceLineId(line.id)}
          onMouseLeave={() => setHoveredPriceLineId(null)}
        />
        {isHovered && (
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: '24px',
            backgroundColor: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '6px',
            padding: '10px 12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 1000,
            minWidth: '240px',
            whiteSpace: 'nowrap'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: textColor, marginBottom: '6px' }}>
              ⚠ Price Mismatch Detected
            </div>
            <div style={{ fontSize: '10px', color: textColor, lineHeight: '1.5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: '500' }}>Customer PO:</span>
                <span style={{ fontWeight: '600' }}>${comparison.custPrice.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontWeight: '500' }}>Sonance Pricing:</span>
                <span style={{ fontWeight: '600' }}>${comparison.sonancePrice.toFixed(2)}</span>
              </div>
              <div style={{ borderTop: `1px solid ${borderColor}`, marginTop: '6px', paddingTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '500' }}>Difference:</span>
                  <span style={{ fontWeight: '700' }}>
                    {diffSign}${Math.abs(priceDiff).toFixed(2)} ({diffSign}{variance.toFixed(1)}%)
                  </span>
                </div>
                <div style={{ fontSize: '9px', marginTop: '4px', fontStyle: 'italic', opacity: 0.8 }}>
                  Sonance price is {variance.toFixed(1)}% {priceDirection}
                </div>
              </div>
            </div>
            {/* Tooltip arrow */}
            <div style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '0',
              height: '0',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${borderColor}`
            }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center font-bold uppercase tracking-widest text-[#333F48]" style={{ fontSize: '12px' }}>
          <ShoppingCart className="h-4 w-4 text-[#00A3E1]" style={{ marginRight: '10px' }} />
          Order Lines
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead className="bg-muted">
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ fontSize: '0.65rem', padding: '8px 4px', width: '32px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                Line
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '90px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                Cust Item
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '72px', textAlign: 'center', verticalAlign: 'bottom', color: '#00A3E1' }} className="font-medium uppercase">
                Sonance Product
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '200px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                Customer Desc
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '160px', textAlign: 'center', verticalAlign: 'bottom', color: '#00A3E1' }} className="font-medium uppercase">
                Sonance Desc
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '28px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                Qty
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 4px', width: '24px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                UOM
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 4px', width: '70px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                Cust Price
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 2px', width: '20px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                {/* Warning icon column */}
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 4px', width: '70px', textAlign: 'center', verticalAlign: 'bottom', color: '#00A3E1' }} className="font-medium uppercase">
                Sonance Price
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '70px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                Cust<br />Total
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '70px', textAlign: 'center', verticalAlign: 'bottom', color: '#00A3E1' }} className="font-medium uppercase">
                Sonance Total
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 8px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.order_lines.map((line, index) => {
              const isLineCancelled = line.line_status === 'cancelled'
              const strikethrough = isLineCancelled ? 'line-through' : 'none'

              return (
              <tr key={line.id} className="hover:bg-muted/50" style={{ marginBottom: index < order.order_lines.length - 1 ? '6px' : '0' }}>
                <td style={{ fontSize: '0.75rem', padding: '10px 4px', verticalAlign: 'top', textAlign: 'center', width: '32px', textDecoration: strikethrough }} className="text-foreground">
                  {line.cust_line_number}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', width: '90px', textDecoration: strikethrough }} className="text-foreground">
                  {line.cust_product_sku || 'N/A'}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', width: '72px', textDecoration: strikethrough }} className="text-foreground">
                  {(() => {
                    const productValue = line.validated_sku || line.sonance_prod_sku
                    const hasDescription = sonanceDescriptions?.[line.id]
                    const isInvalid = productValue && !hasDescription

                    if (!productValue) {
                      return <span style={{ color: 'red' }}>---</span>
                    }

                    if (isInvalid) {
                      return (
                        <span
                          style={{ color: 'red', fontWeight: 'bold', cursor: 'help' }}
                          title="Product not found in customer pricing - not valid for this customer"
                        >
                          {productValue}
                        </span>
                      )
                    }

                    return productValue
                  })()}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', width: '200px', maxWidth: '200px', lineHeight: '1.4', textDecoration: strikethrough }} className="text-foreground">
                  <div style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                    {line.cust_line_desc || 'N/A'}
                  </div>
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', width: '160px', maxWidth: '160px', lineHeight: '1.4', textDecoration: strikethrough }} className="text-foreground">
                  <div style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                    {(() => {
                      const productValue = line.validated_sku || line.sonance_prod_sku
                      const description = sonanceDescriptions?.[line.id]

                      if (description) {
                        return description
                      }

                      // No description found
                      if (!productValue) {
                        return <span style={{ color: 'red' }}>N/A</span>
                      }

                      // Product exists but no description (not valid for customer)
                      return (
                        <span
                          style={{ color: 'red', fontWeight: 'bold', cursor: 'help' }}
                          title="Product not found in customer pricing - not valid for this customer"
                        >
                          N/A
                        </span>
                      )
                    })()}
                  </div>
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', textAlign: 'right', width: '28px', textDecoration: strikethrough }} className="text-foreground">
                  {Math.round(line.sonance_quantity ?? line.cust_quantity ?? 0)}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 4px', verticalAlign: 'top', width: '24px', textDecoration: strikethrough }} className="text-foreground">
                  {line.sonance_uom || 'N/A'}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 4px', verticalAlign: 'top', textAlign: 'right', width: '70px', textDecoration: strikethrough }} className="text-foreground">
                  ${formatCurrency(line.cust_unit_price)}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 2px', verticalAlign: 'top', textAlign: 'center', width: '20px' }}>
                  {!isLineCancelled && renderPriceWarningIcon(line)}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 4px', verticalAlign: 'top', textAlign: 'right', width: '70px', textDecoration: strikethrough }} className="text-foreground">
                  {sonancePrices[line.id] != null ? `$${formatCurrency(sonancePrices[line.id])}` : <span style={{ color: 'red', fontWeight: 'bold' }}>--</span>}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', textAlign: 'right', width: '70px', textDecoration: strikethrough }} className="font-medium text-foreground">
                  ${formatCurrency(line.cust_line_total)}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', textAlign: 'right', width: '70px', textDecoration: strikethrough }} className="font-medium text-foreground">
                  {(() => {
                    const qty = line.sonance_quantity ?? line.cust_quantity ?? 0
                    const price = sonancePrices[line.id] ?? null
                    if (price != null) {
                      return `$${formatCurrency(qty * price)}`
                    }
                    return <span style={{ color: 'red', fontWeight: 'bold' }}>--</span>
                  })()}
                </td>
                <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
                  <div className="flex items-center" style={{ gap: '6px' }}>
                    <LineItemEditor
                      line={line}
                      orderId={order.id}
                      userId={userId}
                      psCustomerId={order.ps_customer_id || ''}
                      currencyCode={order.currency_code || 'USD'}
                      isCancelled={!canEdit}
                      isLineCancelled={isLineCancelled}
                      onRestore={() => handleRestoreLine(line)}
                      onEditStart={() => setEditingLineId(line.id)}
                      onEditEnd={() => setEditingLineId(null)}
                    />
                    {canEdit && !isLineCancelled && editingLineId !== line.id && (
                      <button
                        onClick={() => handleCancelLine(line)}
                        className="transition-colors flex items-center justify-center"
                        style={{
                          border: '1px solid #00A3E1',
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          color: '#00A3E1',
                          width: '19px',
                          height: '19px',
                          padding: '0'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#00A3E1'
                          e.currentTarget.style.color = 'white'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white'
                          e.currentTarget.style.color = '#00A3E1'
                        }}
                        title="Cancel Line"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              )
            })}
            {/* Order Totals Row */}
            <tr style={{ borderTop: '2px solid #e2e8f0' }}>
              <td style={{ width: '32px' }}></td>
              <td style={{ width: '90px' }}></td>
              <td style={{ width: '72px' }}></td>
              <td style={{ width: '200px' }}></td>
              <td style={{ width: '160px' }}></td>
              <td style={{ width: '28px' }}></td>
              <td style={{ width: '24px' }}></td>
              <td style={{ width: '70px' }}></td>
              <td style={{ width: '20px' }}></td>
              <td style={{ fontSize: '13px', padding: '8px 4px', textAlign: 'right', width: '70px', verticalAlign: 'middle' }} className="font-semibold text-foreground">
                Totals:
              </td>
              <td style={{ fontSize: '13px', padding: '8px 6px', textAlign: 'right', width: '70px', verticalAlign: 'middle' }} className="font-bold text-foreground">
                ${formatCurrency(calculateCustomerTotal())}
              </td>
              <td style={{ fontSize: '13px', padding: '8px 6px', textAlign: 'right', width: '70px', verticalAlign: 'middle', color: '#00A3E1' }} className="font-bold">
                ${formatCurrency(calculateSonanceTotal())}
              </td>
              <td style={{ width: '60px' }}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
