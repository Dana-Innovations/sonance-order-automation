'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { PriceValidation } from './PriceValidation'
import { LineItemEditor } from './LineItemEditor'
import { Tables } from '@/lib/types/database'
import { ShoppingCart, X } from 'lucide-react'

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

  // Track which line is being edited
  const [editingLineId, setEditingLineId] = useState<string | null>(null)

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
      
      for (const line of lines) {
        // Get the SKU and UOM to use for lookup (sonance values or fall back to cust values)
        const skuToLookup = line.sonance_prod_sku || line.cust_product_sku
        const uomToLookup = line.sonance_uom || line.cust_uom
        
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
        } else {
          // If no pricing found, use the existing sonance_unit_price if available
          updatedPrices[line.id] = line.sonance_unit_price ?? null
        }
      }
      
      setSonancePrices(updatedPrices)
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
      return sum + (Number(line.cust_line_total) || 0)
    }, 0)
  }

  const calculateSonanceTotal = () => {
    return order.order_lines.reduce((sum, line) => {
      const qty = line.sonance_quantity ?? line.cust_quantity ?? 0
      const price = sonancePrices[line.id] ?? null
      if (price != null) {
        return sum + (qty * price)
      }
      return sum
    }, 0)
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
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
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
                  {line.validated_sku || line.sonance_prod_sku || line.cust_product_sku || 'N/A'}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', width: '200px', maxWidth: '200px', lineHeight: '1.4', textDecoration: strikethrough }} className="text-foreground">
                  <div style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                    {line.cust_line_desc || 'N/A'}
                  </div>
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', width: '160px', maxWidth: '160px', lineHeight: '1.4', textDecoration: strikethrough }} className="text-foreground">
                  <div style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                    {sonanceDescriptions?.[line.id] || 'N/A'}
                  </div>
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', textAlign: 'right', width: '28px', textDecoration: strikethrough }} className="text-foreground">
                  {Math.round(line.sonance_quantity ?? line.cust_quantity ?? 0)}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 4px', verticalAlign: 'top', width: '24px', textDecoration: strikethrough }} className="text-foreground">
                  {line.sonance_uom || line.cust_uom || 'N/A'}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 4px', verticalAlign: 'top', textAlign: 'right', width: '70px', textDecoration: strikethrough }} className="text-foreground">
                  ${formatCurrency(line.cust_unit_price)}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 4px', verticalAlign: 'top', textAlign: 'right', width: '70px', textDecoration: strikethrough }} className="text-foreground">
                  {sonancePrices[line.id] != null ? `$${formatCurrency(sonancePrices[line.id])}` : ''}
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
                    return ''
                  })()}
                </td>
                <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
                  <div className="flex items-center" style={{ gap: '6px' }}>
                    <LineItemEditor
                      line={line}
                      orderId={order.id}
                      userId={userId}
                      psCustomerId={order.ps_customer_id || ''}
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
          </tbody>
        </table>
      </div>

      {/* Order Totals Footer */}
      <div className="border-t border-border pt-3">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td colSpan={9} style={{ fontSize: '13px', padding: '8px 6px', textAlign: 'right', verticalAlign: 'middle' }} className="font-semibold text-foreground">
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
