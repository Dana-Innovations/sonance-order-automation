'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { PriceValidation } from './PriceValidation'
import { LineItemEditor } from './LineItemEditor'
import { Tables } from '@/lib/types/database'
import { ShoppingCart, X, AlertTriangle, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { usePDFHighlight } from '@/lib/contexts/PDFHighlightContext'

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
  const { isEnabled: isPDFHighlightEnabled, setHighlight, clearHighlight, highlightMatches } = usePDFHighlight()

  // Local state for sonance prices (to show updated values after lookup)
  const [sonancePrices, setSonancePrices] = useState<Record<string, number | null>>({})

  // Track current pricing table prices (for revert button)
  const [pricingTablePrices, setPricingTablePrices] = useState<Record<string, number | null>>({})

  // Price comparison state for warning icons
  const [priceComparisons, setPriceComparisons] = useState<Record<string, {
    variance: number
    custPrice: number
    sonancePrice: number
    hasValidPrice: boolean
  }>>({})

  // Track which line is being edited
  const [editingLineId, setEditingLineId] = useState<string | null>(null)

  // Track which line's price tooltip is showing and its position
  const [hoveredPriceLineId, setHoveredPriceLineId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  // Track which line's product error tooltip is showing and its position
  const [hoveredProductLineId, setHoveredProductLineId] = useState<string | null>(null)
  const [productTooltipPosition, setProductTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  // Track which line's Qty/UOM tooltip is showing and its position
  const [hoveredQtyLineId, setHoveredQtyLineId] = useState<string | null>(null)
  const [qtyTooltipPosition, setQtyTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [hoveredUomLineId, setHoveredUomLineId] = useState<string | null>(null)
  const [uomTooltipPosition, setUomTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  // Track which line's apply price button is showing tooltip
  const [hoveredApplyPriceLineId, setHoveredApplyPriceLineId] = useState<string | null>(null)

  // Track which line's revert to sonance price button is showing tooltip
  const [hoveredRevertPriceLineId, setHoveredRevertPriceLineId] = useState<string | null>(null)

  // Track which line is being cancelled (for confirmation modal)
  const [cancellingLine, setCancellingLine] = useState<OrderLine | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // Debug popup state
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [debugPosition, setDebugPosition] = useState<{ x: number; y: number } | null>(null)

  const handleCancelLine = async (line: OrderLine) => {
    if (!cancellingLine) return

    setIsCancelling(true)

    try {
      const { error } = await supabase
        .from('order_lines')
        .update({ line_status: 'cancelled' })
        .eq('id', cancellingLine.id)

      if (error) throw error

      // Log to audit log
      await supabase.from('audit_log').insert({
        order_id: order.id,
        order_line_id: cancellingLine.id,
        user_id: userId,
        action_type: 'line_cancelled',
        field_name: 'line_status',
        old_value: cancellingLine.line_status || 'active',
        new_value: 'cancelled',
        reason: 'Line cancelled - will not be posted to ERP',
      })

      // If order status is "Rev No Changes" (02), update it to "Rev With Changes" (03)
      if (order.status_code === '02') {
        await supabase
          .from('orders')
          .update({ status_code: '03' })
          .eq('id', order.id)

        // Log status change
        await supabase.from('order_status_history').insert({
          order_id: order.id,
          status_code: '03',
          changed_by: userId,
          notes: 'Line cancelled - status changed from Rev No Changes to Rev With Changes',
        })
      }

      router.refresh()
      setCancellingLine(null)
    } catch (error: any) {
      alert('Error cancelling line: ' + error.message)
    } finally {
      setIsCancelling(false)
    }
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

    // If order status is "Rev No Changes" (02), update it to "Rev With Changes" (03)
    if (order.status_code === '02') {
      await supabase
        .from('orders')
        .update({ status_code: '03' })
        .eq('id', order.id)

      // Log status change
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status_code: '03',
        changed_by: userId,
        notes: 'Line restored - status changed from Rev No Changes to Rev With Changes',
      })
    }

    router.refresh()
  }

  const handleApplyCustomerPrice = async (line: OrderLine) => {
    if (!line.cust_unit_price) return

    const { error } = await supabase
      .from('order_lines')
      .update({ sonance_unit_price: line.cust_unit_price })
      .eq('id', line.id)

    if (error) {
      alert('Error applying customer price: ' + error.message)
      return
    }

    // Update local state immediately for instant UI update
    setSonancePrices(prev => ({
      ...prev,
      [line.id]: line.cust_unit_price
    }))

    // Update price comparisons - since customer and sonance prices now match, variance = 0
    setPriceComparisons(prev => {
      const newComparisons = { ...prev }
      if (line.cust_unit_price != null) {
        newComparisons[line.id] = {
          variance: 0,
          custPrice: line.cust_unit_price,
          sonancePrice: line.cust_unit_price,
          hasValidPrice: true
        }
      }
      return newComparisons
    })

    // Log to audit log
    await supabase.from('audit_log').insert({
      order_id: order.id,
      order_line_id: line.id,
      user_id: userId,
      action_type: 'price_applied',
      field_name: 'sonance_unit_price',
      old_value: line.sonance_unit_price?.toString() || null,
      new_value: line.cust_unit_price.toString(),
      reason: 'Applied customer price to sonance price',
    })

    // If order status is "Rev No Changes" (02), update it to "Rev With Changes" (03)
    if (order.status_code === '02') {
      await supabase
        .from('orders')
        .update({ status_code: '03' })
        .eq('id', order.id)

      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status_code: '03',
        changed_by: userId,
        notes: 'Price applied - status changed from Rev No Changes to Rev With Changes',
      })
    }

    router.refresh()
  }

  const handleRevertToSonancePrice = async (line: OrderLine) => {
    const pricingTablePrice = pricingTablePrices[line.id]
    if (pricingTablePrice == null) return

    const { error } = await supabase
      .from('order_lines')
      .update({ sonance_unit_price: pricingTablePrice })
      .eq('id', line.id)

    if (error) {
      alert('Error reverting to sonance price: ' + error.message)
      return
    }

    // Update local state immediately for instant UI update
    setSonancePrices(prev => ({
      ...prev,
      [line.id]: pricingTablePrice
    }))

    // Update price comparisons with new sonance price
    setPriceComparisons(prev => {
      const newComparisons = { ...prev }
      if (line.cust_unit_price != null && pricingTablePrice != null) {
        const variance = Math.abs(line.cust_unit_price - pricingTablePrice) / line.cust_unit_price * 100
        newComparisons[line.id] = {
          variance,
          custPrice: line.cust_unit_price,
          sonancePrice: pricingTablePrice,
          hasValidPrice: true
        }
      }
      return newComparisons
    })

    // Log to audit log
    await supabase.from('audit_log').insert({
      order_id: order.id,
      order_line_id: line.id,
      user_id: userId,
      action_type: 'price_reverted',
      field_name: 'sonance_unit_price',
      old_value: line.sonance_unit_price?.toString() || null,
      new_value: pricingTablePrice.toString(),
      reason: 'Reverted to sonance pricing table price',
    })

    // If order status is "Rev No Changes" (02), update it to "Rev With Changes" (03)
    if (order.status_code === '02') {
      await supabase
        .from('orders')
        .update({ status_code: '03' })
        .eq('id', order.id)

      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status_code: '03',
        changed_by: userId,
        notes: 'Price reverted - status changed from Rev No Changes to Rev With Changes',
      })
    }

    router.refresh()
  }

  // Create a cache key that includes all line SKUs, UOMs, and prices so we refetch when they change
  const lineSkusKey = order.order_lines
    ?.map(l => `${l.id}:${l.sonance_prod_sku || l.cust_product_sku}:${l.sonance_uom}:${l.sonance_unit_price}`)
    .join(',') || ''

  // On page load or when lines change, lookup and populate sonance_unit_price
  useEffect(() => {
    const lookupAndUpdatePrices = async () => {
      const lines = order.order_lines || []
      const updatedPrices: Record<string, number | null> = {}
      const updatedPricingTablePrices: Record<string, number | null> = {}
      const updatedComparisons: Record<string, {
        variance: number
        custPrice: number
        sonancePrice: number
        hasValidPrice: boolean
      }> = {}

      for (const line of lines) {
        // PRIORITY 1: Use the stored sonance_unit_price from the order line (historical pricing)
        // This is the price that was set at order creation time or manually edited
        const storedSonancePrice = line.sonance_unit_price

        // PRIORITY 2: Lookup current pricing from customer_pricing_sync for comparison
        const skuToLookup = line.sonance_prod_sku || line.cust_product_sku
        const uomToLookup = line.sonance_uom

        // Display the stored price (source of truth for this order)
        updatedPrices[line.id] = storedSonancePrice ?? null

        // Lookup current pricing for comparison (warning icon and revert button)
        if (skuToLookup) {
          // First try exact match with UOM
          let { data: pricing } = await supabase
            .from('customer_pricing_sync')
            .select('net_price')
            .eq('cust_id', order.ps_customer_id || '')
            .eq('product_id', skuToLookup)
            .eq('unit_of_measure', uomToLookup || 'EA')
            .maybeSingle()

          // If no exact match, try without UOM filter
          if (!pricing) {
            const { data: fallbackPricing } = await supabase
              .from('customer_pricing_sync')
              .select('net_price')
              .eq('cust_id', order.ps_customer_id || '')
              .eq('product_id', skuToLookup)
              .limit(1)
              .maybeSingle()

            pricing = fallbackPricing
          }

          // Store current pricing table price
          updatedPricingTablePrices[line.id] = pricing?.net_price ?? null

          // Calculate price variance if both prices exist
          if (pricing?.net_price != null && storedSonancePrice != null) {
            const custPrice = line.cust_unit_price
            const currentPricingPrice = pricing.net_price

            if (custPrice != null && custPrice > 0) {
              // Use the STORED sonance price for variance calculation, not current pricing
              const variance = Math.abs(custPrice - storedSonancePrice) / custPrice * 100

              updatedComparisons[line.id] = {
                variance,
                custPrice,
                sonancePrice: storedSonancePrice, // Use stored price, not current pricing
                hasValidPrice: true
              }
            }
          }
        }
      }

      setSonancePrices(updatedPrices)
      setPricingTablePrices(updatedPricingTablePrices)
      setPriceComparisons(updatedComparisons)
    }

    lookupAndUpdatePrices()
  }, [order.id, lineSkusKey, order.ps_customer_id, supabase])

  // Fetch Sonance description from customer_pricing_sync for each line
  const { data: sonanceDescriptions, refetch: refetchDescriptions } = useQuery({
    queryKey: ['sonance-descriptions', order.id, order.ps_customer_id, lineSkusKey],
    queryFn: async () => {
      const lines = order.order_lines || []
      const descriptions: Record<string, string> = {}

      for (const line of lines) {
        const sonanceSku = line.sonance_prod_sku || line.cust_product_sku
        if (!sonanceSku) continue

        // Lookup description from customer_pricing_sync
        const { data: pricing } = await supabase
          .from('customer_pricing_sync')
          .select('product_description')
          .eq('cust_id', order.ps_customer_id || '')
          .eq('product_id', sonanceSku)
          .limit(1)
          .maybeSingle()

        if (pricing?.product_description) {
          descriptions[line.id] = pricing.product_description
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
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setTooltipPosition({
                x: rect.left + rect.width / 2,
                y: rect.top
              })
              setHoveredPriceLineId(line.id)
            }}
            onMouseLeave={() => {
              setHoveredPriceLineId(null)
              setTooltipPosition(null)
            }}
          />
          {isHovered && tooltipPosition && (
            <div style={{
              position: 'fixed',
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y - 10}px`,
              transform: 'translate(-50%, -100%)',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '6px',
              padding: '8px 12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              zIndex: 9999,
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

    // Price difference - show warning icon (always use orange)
    const isHighVariance = variance > 5
    const iconColor = '#f59e0b' // Orange for all price warnings
    const bgColor = '#fffbeb' // Light orange background
    const borderColor = '#fde68a' // Orange border
    const textColor = '#92400e' // Dark orange text
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
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setTooltipPosition({
              x: rect.left + rect.width / 2,
              y: rect.top
            })
            setHoveredPriceLineId(line.id)
          }}
          onMouseLeave={() => {
            setHoveredPriceLineId(null)
            setTooltipPosition(null)
          }}
        />
        {isHovered && tooltipPosition && (
          <div style={{
            position: 'fixed',
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '6px',
            padding: '10px 12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 9999,
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
    <>
    <div className="rounded-lg border border-border bg-card p-6 space-y-4" style={{ overflow: 'visible' }}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center font-bold uppercase tracking-widest text-[#333F48]" style={{ fontSize: '12px' }}>
          <ShoppingCart className="h-4 w-4 text-[#00A3E1]" style={{ marginRight: '10px' }} />
          Order Lines
        </h3>
      </div>
      <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead className="bg-muted">
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ fontSize: '0.65rem', padding: '8px 4px', width: '32px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                Line
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '90px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                Cust Item
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '200px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                Customer Desc
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '72px', textAlign: 'center', verticalAlign: 'bottom', color: '#00A3E1' }} className="font-medium uppercase">
                Sonance Product
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '160px', textAlign: 'center', verticalAlign: 'bottom', color: '#00A3E1' }} className="font-medium uppercase">
                Sonance Desc
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '70px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                Qty
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 4px', width: '60px', textAlign: 'center', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                UOM
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 4px 8px 6px', width: '70px', textAlign: 'right', verticalAlign: 'bottom' }} className="font-medium uppercase text-muted-foreground">
                Cust<br />Price
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
                <td
                  style={{
                    fontSize: '0.75rem',
                    padding: '10px 6px',
                    verticalAlign: 'top',
                    width: '90px',
                    textDecoration: strikethrough,
                    backgroundColor: 'transparent',
                    cursor: (isPDFHighlightEnabled && line.line_status !== 'cancelled' && line.cust_line_number) ? 'crosshair' : 'default',
                    transition: 'background-color 0.15s ease'
                  }}
                  className="text-foreground"
                  onMouseEnter={() => {
                    // Skip PDF highlighting for cancelled or manually added lines
                    const isLineCancelled = line.line_status === 'cancelled'
                    const isManuallyAdded = !line.cust_line_number

                    if (isPDFHighlightEnabled && line.cust_product_sku && !isLineCancelled && !isManuallyAdded) {
                      setHighlight({
                        fieldType: 'line_item',
                        fieldName: 'cust_product_sku',
                        value: line.cust_product_sku,
                        lineNumber: line.cust_line_number || undefined,
                        productId: line.cust_product_sku || undefined,
                        context: `Line ${line.cust_line_number || line.id}`,
                        columnHint: 'left' // SKU is typically in left columns
                      })
                    }
                  }}
                  onMouseLeave={() => {
                    if (isPDFHighlightEnabled) {
                      clearHighlight()
                    }
                  }}
                  onMouseOver={(e) => {
                    if (isPDFHighlightEnabled) {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (isPDFHighlightEnabled) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {line.cust_product_sku || 'N/A'}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', width: '200px', maxWidth: '200px', lineHeight: '1.4', textDecoration: strikethrough }} className="text-foreground">
                  <div style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                    {line.cust_line_desc || 'N/A'}
                  </div>
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', width: '72px', textDecoration: strikethrough }} className="text-foreground">
                  {(() => {
                    const productValue = line.validated_sku || line.sonance_prod_sku
                    const hasDescription = sonanceDescriptions?.[line.id]
                    const isInvalid = productValue && !hasDescription
                    const hasError = !productValue || isInvalid
                    const isLineCancelled = line.line_status === 'cancelled'
                    const errorMessage = !productValue
                      ? "No Sonance product assigned"
                      : "Product not found in customer pricing - not valid for this customer"
                    const isHovered = hoveredProductLineId === line.id

                    if (hasError) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{
                            color: isLineCancelled ? 'black' : 'red',
                            fontWeight: isLineCancelled ? 'normal' : (!productValue ? 'normal' : 'bold')
                          }}>
                            {!productValue ? '---' : productValue}
                          </span>
                          {!isLineCancelled && (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <XCircle
                                className="cursor-help"
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  color: '#dc2626',
                                  flexShrink: 0
                                }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setProductTooltipPosition({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top
                                  })
                                  setHoveredProductLineId(line.id)
                                }}
                                onMouseLeave={() => {
                                  setHoveredProductLineId(null)
                                  setProductTooltipPosition(null)
                                }}
                              />
                              {isHovered && productTooltipPosition && (
                                <div style={{
                                  position: 'fixed',
                                  left: `${productTooltipPosition.x}px`,
                                  top: `${productTooltipPosition.y - 10}px`,
                                  transform: 'translate(-50%, -100%)',
                                  backgroundColor: '#fee',
                                  border: '1px solid #dc2626',
                                  borderRadius: '6px',
                                  padding: '8px 10px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                  zIndex: 9999,
                                  minWidth: '200px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
                                    ⚠ Product Error
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#991b1b', lineHeight: '1.5' }}>
                                    {errorMessage}
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
                                    borderTop: '6px solid #dc2626'
                                  }} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    }

                    return productValue
                  })()}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', width: '160px', maxWidth: '160px', lineHeight: '1.4', textDecoration: strikethrough }} className="text-foreground">
                  <div style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                    {(() => {
                      const productValue = line.validated_sku || line.sonance_prod_sku
                      const description = sonanceDescriptions?.[line.id]
                      const isLineCancelled = line.line_status === 'cancelled'

                      if (description) {
                        return description
                      }

                      // No description found
                      if (!productValue) {
                        return <span style={{ color: isLineCancelled ? 'black' : 'red' }}>N/A</span>
                      }

                      // Product exists but no description (not valid for customer)
                      return (
                        <span
                          style={{
                            color: isLineCancelled ? 'black' : 'red',
                            fontWeight: isLineCancelled ? 'normal' : 'bold',
                            cursor: isLineCancelled ? 'default' : 'help'
                          }}
                          title={isLineCancelled ? undefined : "Product not found in customer pricing - not valid for this customer"}
                        >
                          N/A
                        </span>
                      )
                    })()}
                  </div>
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', textAlign: 'center', width: '70px', textDecoration: strikethrough }} className="text-foreground">
                  {(() => {
                    const isHovered = hoveredQtyLineId === line.id
                    const custQty = line.cust_quantity != null && line.cust_quantity !== 0 ? Math.round(line.cust_quantity) : null
                    const sonanceQty = line.sonance_quantity != null && line.sonance_quantity !== 0 ? Math.round(line.sonance_quantity) : null
                    const custQtyDisplay = custQty != null ? custQty.toString() : 'N/A'
                    const sonanceQtyDisplay = sonanceQty != null ? sonanceQty.toString() : '--'
                    const displayQty = `${custQtyDisplay} / ${sonanceQtyDisplay}`
                    const hasSonanceQtyIssue = sonanceQty == null

                    return (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <span
                          className="cursor-help"
                          style={{
                            cursor: (isPDFHighlightEnabled && line.line_status !== 'cancelled' && line.cust_line_number) ? 'crosshair' : 'help',
                            color: hasSonanceQtyIssue && !isLineCancelled ? 'red' : 'inherit',
                            fontWeight: hasSonanceQtyIssue && !isLineCancelled ? 'bold' : 'normal'
                          }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setQtyTooltipPosition({
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            })
                            setHoveredQtyLineId(line.id)

                            // PDF Highlight for customer quantity (skip for cancelled or manually added lines)
                            const isLineCancelled = line.line_status === 'cancelled'
                            const isManuallyAdded = !line.cust_line_number

                            if (isPDFHighlightEnabled && custQty != null && !isLineCancelled && !isManuallyAdded) {
                              // Delay to let highlight matches update
                              setTimeout(() => {
                                const debugMsg = `[HOVER QTY]\nValue: ${custQty}\nProduct: ${line.cust_product_sku}\nLine#: ${line.cust_line_number || 'none'}\nPDF Highlight: ${isPDFHighlightEnabled ? 'ON' : 'OFF'}\nHighlight Matches: ${highlightMatches.length}\n${highlightMatches.length > 0 ? `Match at X=${highlightMatches[0].x.toFixed(1)}, Y=${highlightMatches[0].y.toFixed(1)}` : 'No matches'}`;
                                console.log(debugMsg);
                                setDebugInfo(debugMsg);
                                setDebugPosition({ x: e.clientX, y: e.clientY });
                              }, 100);

                              setHighlight({
                                fieldType: 'line_item',
                                fieldName: 'cust_quantity',
                                value: custQty,
                                lineNumber: line.cust_line_number || undefined,
                                productId: line.cust_product_sku || undefined,
                                context: `Line ${line.cust_line_number || line.id}`,
                                columnHint: 'center' // Quantity is typically in center columns
                              })
                              e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            setHoveredQtyLineId(null)
                            setQtyTooltipPosition(null)
                            setDebugInfo(null)
                            setDebugPosition(null)

                            // Clear PDF highlight
                            if (isPDFHighlightEnabled) {
                              clearHighlight()
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          {displayQty}
                        </span>
                        {isHovered && qtyTooltipPosition && (
                          <div style={{
                            position: 'fixed',
                            left: `${qtyTooltipPosition.x}px`,
                            top: `${qtyTooltipPosition.y - 10}px`,
                            transform: 'translate(-50%, -100%)',
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            zIndex: 9999,
                            minWidth: '140px',
                            whiteSpace: 'nowrap'
                          }}>
                            <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.5' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: '500' }}>Customer Qty:</span>
                                <span style={{ fontWeight: '600' }}>{custQtyDisplay}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '500' }}>Sonance Qty:</span>
                                <span style={{ fontWeight: '600' }}>{sonanceQtyDisplay}</span>
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
                              borderTop: '6px solid #d1d5db'
                            }} />
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 4px', verticalAlign: 'top', width: '60px', textDecoration: strikethrough }} className="text-foreground">
                  {(() => {
                    const isHovered = hoveredUomLineId === line.id
                    const custUom = line.cust_uom || null
                    const sonanceUom = line.sonance_uom || null
                    const custUomDisplay = custUom || '--'
                    const sonanceUomDisplay = sonanceUom || '--'
                    const displayUom = `${custUomDisplay} / ${sonanceUomDisplay}`
                    const hasNullUom = !custUom || !sonanceUom

                    return (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <span
                          className="cursor-help"
                          style={{
                            cursor: (isPDFHighlightEnabled && line.line_status !== 'cancelled' && line.cust_line_number) ? 'crosshair' : 'help',
                            color: hasNullUom && !isLineCancelled ? 'red' : 'inherit',
                            fontWeight: hasNullUom && !isLineCancelled ? 'bold' : 'normal',
                            backgroundColor: 'transparent',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setUomTooltipPosition({
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            })
                            setHoveredUomLineId(line.id)

                            // PDF Highlight for customer UOM (skip for cancelled or manually added lines)
                            const isLineCancelled = line.line_status === 'cancelled'
                            const isManuallyAdded = !line.cust_line_number

                            if (isPDFHighlightEnabled && custUom && !isLineCancelled && !isManuallyAdded) {
                              setHighlight({
                                fieldType: 'line_item',
                                fieldName: 'cust_uom',
                                value: custUom,
                                lineNumber: line.cust_line_number || undefined,
                                productId: line.cust_product_sku || undefined,
                                context: `Line ${line.cust_line_number || line.id}`,
                                columnHint: 'center' // UOM is typically in center columns
                              })
                              e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            setHoveredUomLineId(null)
                            setUomTooltipPosition(null)

                            // Clear PDF highlight
                            if (isPDFHighlightEnabled) {
                              clearHighlight()
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          {displayUom}
                        </span>
                        {isHovered && uomTooltipPosition && (
                          <div style={{
                            position: 'fixed',
                            left: `${uomTooltipPosition.x}px`,
                            top: `${uomTooltipPosition.y - 10}px`,
                            transform: 'translate(-50%, -100%)',
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            zIndex: 9999,
                            minWidth: '140px',
                            whiteSpace: 'nowrap'
                          }}>
                            <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.5' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: '500' }}>Customer UOM:</span>
                                <span style={{ fontWeight: '600' }}>{custUom || 'N/A'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '500' }}>Sonance UOM:</span>
                                <span style={{ fontWeight: '600' }}>{sonanceUom || 'N/A'}</span>
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
                              borderTop: '6px solid #d1d5db'
                            }} />
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </td>
                <td
                  style={{
                    fontSize: '0.75rem',
                    padding: '10px 4px',
                    verticalAlign: 'top',
                    textAlign: 'right',
                    width: '70px',
                    textDecoration: strikethrough,
                    cursor: (isPDFHighlightEnabled && line.line_status !== 'cancelled' && line.cust_line_number) ? 'crosshair' : 'default',
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.15s ease'
                  }}
                  className="text-foreground"
                  onMouseEnter={(e) => {
                    // Skip PDF highlighting for cancelled or manually added lines
                    const isLineCancelled = line.line_status === 'cancelled'
                    const isManuallyAdded = !line.cust_line_number

                    if (isPDFHighlightEnabled && line.cust_unit_price != null && !isLineCancelled && !isManuallyAdded) {
                      setHighlight({
                        fieldType: 'line_item',
                        fieldName: 'cust_unit_price',
                        value: formatCurrency(line.cust_unit_price),
                        lineNumber: line.cust_line_number || undefined,
                        productId: line.cust_product_sku || undefined,
                        context: `Line ${line.cust_line_number || line.id}`,
                        columnHint: 'right' // Price is typically in right columns
                      })
                      e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isPDFHighlightEnabled) {
                      clearHighlight()
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  ${formatCurrency(line.cust_unit_price)}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 2px', verticalAlign: 'top', textAlign: 'center', width: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {!isLineCancelled && renderPriceWarningIcon(line)}
                    {!isLineCancelled && line.cust_unit_price != null && line.sonance_unit_price != null &&
                     line.cust_unit_price !== line.sonance_unit_price && (
                      <button
                        onClick={() => handleApplyCustomerPrice(line)}
                        onMouseEnter={() => setHoveredApplyPriceLineId(line.id)}
                        onMouseLeave={() => setHoveredApplyPriceLineId(null)}
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: '1px solid #00A3E1',
                          backgroundColor: 'white',
                          color: '#00A3E1',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          position: 'relative'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#00A3E1'
                          e.currentTarget.style.color = 'white'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'white'
                          e.currentTarget.style.color = '#00A3E1'
                        }}
                      >
                        $
                        {hoveredApplyPriceLineId === line.id && (
                          <span style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '4px',
                            backgroundColor: '#333',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            zIndex: 1000
                          }}>
                            Apply customer price (${formatCurrency(line.cust_unit_price)}) to Sonance price
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 4px', verticalAlign: 'top', textAlign: 'right', width: '70px', textDecoration: strikethrough }} className="text-foreground">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    {sonancePrices[line.id] != null ? `$${formatCurrency(sonancePrices[line.id])}` : <span style={{ color: isLineCancelled ? 'black' : 'red', fontWeight: isLineCancelled ? 'normal' : 'bold' }}>--</span>}
                    {!isLineCancelled && line.cust_unit_price != null && sonancePrices[line.id] != null &&
                     line.cust_unit_price === sonancePrices[line.id] &&
                     pricingTablePrices[line.id] != null &&
                     sonancePrices[line.id] !== pricingTablePrices[line.id] && (
                      <button
                        onClick={() => handleRevertToSonancePrice(line)}
                        onMouseEnter={() => setHoveredRevertPriceLineId(line.id)}
                        onMouseLeave={() => setHoveredRevertPriceLineId(null)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#00A3E1',
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: 0,
                          position: 'relative'
                        }}
                      >
                        <RotateCcw size={12} />
                        {hoveredRevertPriceLineId === line.id && (
                          <span style={{
                            position: 'absolute',
                            bottom: '100%',
                            right: '0',
                            marginBottom: '4px',
                            backgroundColor: '#333',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            zIndex: 1000
                          }}>
                            Revert to Sonance price (${formatCurrency(pricingTablePrices[line.id])})
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </td>
                <td
                  style={{
                    fontSize: '0.75rem',
                    padding: '10px 6px',
                    verticalAlign: 'top',
                    textAlign: 'right',
                    width: '70px',
                    textDecoration: strikethrough,
                    cursor: (isPDFHighlightEnabled && line.line_status !== 'cancelled' && line.cust_line_number) ? 'crosshair' : 'default',
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.15s ease'
                  }}
                  className="font-medium text-foreground"
                  onMouseEnter={(e) => {
                    // Skip PDF highlighting for cancelled or manually added lines
                    const isLineCancelled = line.line_status === 'cancelled'
                    const isManuallyAdded = !line.cust_line_number

                    if (isPDFHighlightEnabled && line.cust_line_total != null && !isLineCancelled && !isManuallyAdded) {
                      setHighlight({
                        fieldType: 'line_item',
                        fieldName: 'cust_line_total',
                        value: formatCurrency(line.cust_line_total),
                        lineNumber: line.cust_line_number || undefined,
                        productId: line.cust_product_sku || undefined,
                        context: `Line ${line.cust_line_number || line.id}`,
                        columnHint: 'right' // Total is typically in right columns
                      })
                      e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isPDFHighlightEnabled) {
                      clearHighlight()
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  ${formatCurrency(line.cust_line_total)}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', textAlign: 'right', width: '70px', textDecoration: strikethrough }} className="font-medium text-foreground">
                  {(() => {
                    const qty = line.sonance_quantity ?? line.cust_quantity ?? 0
                    const price = sonancePrices[line.id] ?? null
                    if (price != null) {
                      return `$${formatCurrency(qty * price)}`
                    }
                    return <span style={{ color: isLineCancelled ? 'black' : 'red', fontWeight: isLineCancelled ? 'normal' : 'bold' }}>--</span>
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
                        onClick={() => setCancellingLine(line)}
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
              <td style={{ width: '70px' }}></td>
              <td style={{ width: '60px' }}></td>
              <td style={{ width: '70px' }}></td>
              <td style={{ width: '20px' }}></td>
              <td style={{ fontSize: '13px', padding: '8px 4px', textAlign: 'right', width: '70px', verticalAlign: 'middle' }} className="font-semibold text-foreground">
                Totals:
              </td>
              <td
                style={{
                  fontSize: '13px',
                  padding: '8px 6px',
                  textAlign: 'right',
                  width: '70px',
                  verticalAlign: 'middle',
                  cursor: isPDFHighlightEnabled ? 'crosshair' : 'default',
                  backgroundColor: isPDFHighlightEnabled ? 'rgba(0, 163, 225, 0.05)' : 'transparent',
                  transition: 'background-color 0.15s ease'
                }}
                className="font-bold text-foreground"
                onMouseEnter={() => {
                  const totalValue = calculateCustomerTotal()
                  if (isPDFHighlightEnabled && totalValue != null) {
                    setHighlight({
                      fieldType: 'order_header',
                      fieldName: 'cust_order_total',
                      value: formatCurrency(totalValue),
                      context: 'Order Total'
                    })
                  }
                }}
                onMouseLeave={() => {
                  if (isPDFHighlightEnabled) {
                    clearHighlight()
                  }
                }}
              >
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

    {/* Cancel Line Confirmation Modal */}
    {cancellingLine && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '400px', maxWidth: '90vw', backgroundColor: 'white', border: '1px solid #00A3E1', position: 'relative', top: '-5vh' }}>
          {/* Header */}
          <div className="border-b border-gray-300" style={{ backgroundColor: 'white', paddingTop: '10px', paddingBottom: '10px', paddingLeft: '8px', paddingRight: '8px' }}>
            <h2 className="font-semibold" style={{ color: '#666', fontSize: '14px' }}>
              Cancel Line Item
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'white', padding: '16px' }}>
            <p style={{ fontSize: '12px', color: '#333', marginBottom: '12px' }}>
              Are you sure you want to cancel this line item?
            </p>
            <div style={{ fontSize: '11px', color: '#666', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
              <div style={{ marginBottom: '6px' }}>
                <strong>Line #:</strong> {cancellingLine.cust_line_number}
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong>Product:</strong> {cancellingLine.cust_product_sku || 'N/A'}
              </div>
              <div>
                <strong>Description:</strong> {cancellingLine.cust_line_desc || 'N/A'}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-300 flex justify-center gap-3" style={{ backgroundColor: 'white', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '16px', paddingRight: '16px' }}>
            <button
              onClick={() => setCancellingLine(null)}
              disabled={isCancelling}
              className="font-medium transition-colors"
              style={{
                border: '1px solid #00A3E1',
                borderRadius: '20px',
                backgroundColor: 'white',
                color: '#00A3E1',
                paddingLeft: '20px',
                paddingRight: '20px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '9px',
                cursor: isCancelling ? 'not-allowed' : 'pointer',
                opacity: isCancelling ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isCancelling) {
                  e.currentTarget.style.backgroundColor = '#00A3E1'
                  e.currentTarget.style.color = 'white'
                }
              }}
              onMouseLeave={(e) => {
                if (!isCancelling) {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.color = '#00A3E1'
                }
              }}
            >
              Go Back
            </button>
            <button
              onClick={() => handleCancelLine(cancellingLine)}
              disabled={isCancelling}
              className="font-medium transition-colors"
              style={{
                border: '1px solid #dc2626',
                borderRadius: '20px',
                backgroundColor: isCancelling ? '#ccc' : '#dc2626',
                color: 'white',
                paddingLeft: '20px',
                paddingRight: '20px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '9px',
                cursor: isCancelling ? 'not-allowed' : 'pointer',
                opacity: isCancelling ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isCancelling) {
                  e.currentTarget.style.backgroundColor = '#b91c1c'
                }
              }}
              onMouseLeave={(e) => {
                if (!isCancelling) {
                  e.currentTarget.style.backgroundColor = '#dc2626'
                }
              }}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Line'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Debug Popup - disabled */}
    {false && debugInfo && debugPosition && (
      <div
        style={{
          position: 'fixed',
          left: `${debugPosition!.x + 20}px`,
          top: `${debugPosition!.y + 20}px`,
          backgroundColor: '#1e293b',
          color: '#22d3ee',
          padding: '12px 16px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          zIndex: 99999,
          border: '2px solid #22d3ee',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          maxWidth: '400px',
          pointerEvents: 'none'
        }}
      >
        {debugInfo}
      </div>
    )}
  </>
  )
}
