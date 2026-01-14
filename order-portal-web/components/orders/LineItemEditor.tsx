'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Tables } from '@/lib/types/database'

type OrderLine = Tables<'order_lines'>

export function LineItemEditor({
  line,
  orderId,
  userId,
  psCustomerId,
  isCancelled = false,
  isLineCancelled = false,
  onRestore,
  onEditStart,
  onEditEnd,
}: {
  line: OrderLine
  orderId: string
  userId: string
  psCustomerId: string
  isCancelled?: boolean
  isLineCancelled?: boolean
  onRestore?: () => void
  onEditStart?: () => void
  onEditEnd?: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    quantity: line.cust_quantity?.toString() || '',
    unitPrice: line.sonance_unit_price?.toString() || '',
    description: line.cust_line_desc || '',
    productSku: line.cust_product_sku || '',
    uom: line.cust_uom || '',
    sonanceItem: line.sonance_prod_sku || '',
  })
  const supabase = createClient()
  const router = useRouter()

  const handleSave = async () => {
    const quantity = parseFloat(formData.quantity)
    let unitPrice = parseFloat(formData.unitPrice)

    if (quantity <= 0 || unitPrice < 0) {
      alert('Quantity must be greater than 0 and price must be non-negative')
      return
    }

    setIsSaving(true)

    // If the Sonance Item SKU changed, look up the new price and UOM from customer_product_pricing
    const sonanceSkuChanged = line.sonance_prod_sku !== formData.sonanceItem
    let lookedUpPrice: number | null = null
    let lookedUpUom: string | null = null
    
    if (sonanceSkuChanged && formData.sonanceItem && psCustomerId) {
      const uomToLookup = formData.uom || 'EA'
      
      // First try exact match with UOM
      let { data: pricing, error } = await supabase
        .from('customer_product_pricing')
        .select('dfi_price, uom')
        .eq('ps_customer_id', psCustomerId)
        .eq('product_id', formData.sonanceItem)
        .eq('uom', uomToLookup)
        .maybeSingle()
      
      // If no exact match, try without UOM filter to find the default price/UOM for this product
      if (!pricing && !error) {
        const { data: fallbackPricing } = await supabase
          .from('customer_product_pricing')
          .select('dfi_price, uom')
          .eq('ps_customer_id', psCustomerId)
          .eq('product_id', formData.sonanceItem)
          .limit(1)
          .maybeSingle()
        
        pricing = fallbackPricing
      }
      
      if (pricing?.dfi_price != null) {
        lookedUpPrice = pricing.dfi_price
        unitPrice = pricing.dfi_price
      }
      
      // Always use the UOM from the pricing table when product changes
      if (pricing?.uom) {
        lookedUpUom = pricing.uom
        console.log(`Lookup success: Product ${formData.sonanceItem}, UOM ${pricing.uom}, Price ${pricing.dfi_price}`)
      } else {
        console.log(`Lookup failed: Product ${formData.sonanceItem}, Customer ${psCustomerId}, UOM ${uomToLookup}`, error)
      }
    }

    // Build update object - include sonance_uom if we looked it up
    const updateData: Record<string, any> = {
      cust_quantity: quantity,
      cust_line_desc: formData.description,
      cust_product_sku: formData.productSku,
      cust_uom: formData.uom,
      sonance_prod_sku: formData.sonanceItem,
      sonance_unit_price: unitPrice,
    }
    
    // If we looked up a UOM from pricing, also update sonance_uom
    if (lookedUpUom) {
      updateData.sonance_uom = lookedUpUom
    }
    
    const { error } = await supabase
      .from('order_lines')
      .update(updateData)
      .eq('id', line.id)

    if (error) {
      setIsSaving(false)
      alert('Error saving changes: ' + error.message)
      return
    }

    // Log changes to audit log
    const changes = []
    if (line.sonance_prod_sku !== formData.sonanceItem) {
      changes.push({
        field_name: 'sonance_item',
        old_value: line.sonance_prod_sku || '',
        new_value: formData.sonanceItem,
      })
    }
    if (line.cust_quantity?.toString() !== formData.quantity) {
      changes.push({
        field_name: 'quantity',
        old_value: line.cust_quantity?.toString() || '',
        new_value: formData.quantity,
      })
    }
    if (line.cust_uom !== formData.uom) {
      changes.push({
        field_name: 'uom',
        old_value: line.cust_uom || '',
        new_value: formData.uom,
      })
    }
    // Log price change - use the final unitPrice (which may have been looked up)
    if (line.sonance_unit_price !== unitPrice) {
      changes.push({
        field_name: 'sonance_unit_price',
        old_value: line.sonance_unit_price?.toString() || '',
        new_value: unitPrice.toString(),
        reason: lookedUpPrice != null ? 'Price auto-updated from customer pricing' : 'Sonance price correction',
      })
    }
    // Log UOM change if it was auto-updated
    if (lookedUpUom && line.sonance_uom !== lookedUpUom) {
      changes.push({
        field_name: 'sonance_uom',
        old_value: line.sonance_uom || '',
        new_value: lookedUpUom,
        reason: 'UOM auto-updated from customer pricing',
      })
    }

    for (const change of changes) {
      await supabase.from('audit_log').insert({
        order_id: orderId,
        order_line_id: line.id,
        user_id: userId,
        action_type: 'field_edit',
        field_name: change.field_name,
        old_value: change.old_value,
        new_value: change.new_value,
        reason: (change as any).reason || (change.field_name === 'sonance_unit_price' ? 'Sonance price correction' : undefined),
      })
    }

    setIsSaving(false)
    setIsEditing(false)
    onEditEnd?.()
    router.refresh()
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    onEditStart?.()
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    onEditEnd?.()
  }

  if (isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div className="flex items-center" style={{ gap: '8px' }}>
          <label className="font-medium text-muted-foreground whitespace-nowrap" style={{ fontSize: '11px', width: '45px', textAlign: 'right' }}>ITEM</label>
          <input
            type="text"
            value={formData.sonanceItem}
            onChange={(e) => setFormData({ ...formData, sonanceItem: e.target.value })}
            placeholder="Item"
            style={{ width: '80px', textAlign: 'left' }}
            className="rounded-xl border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center" style={{ gap: '8px' }}>
          <label className="font-medium text-muted-foreground whitespace-nowrap" style={{ fontSize: '11px', width: '45px', textAlign: 'right' }}>QTY</label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="Quantity"
            step="1"
            min="0"
            style={{ width: '80px', textAlign: 'left' }}
            className="rounded-xl border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center" style={{ gap: '8px' }}>
          <label className="font-medium text-muted-foreground whitespace-nowrap" style={{ fontSize: '11px', width: '45px', textAlign: 'right' }}>UOM</label>
          <input
            type="text"
            value={formData.uom}
            onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
            placeholder="UOM"
            style={{ width: '80px', textAlign: 'left' }}
            className="rounded-xl border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center" style={{ gap: '8px' }}>
          <label className="font-medium text-muted-foreground whitespace-nowrap" style={{ fontSize: '11px', width: '45px', textAlign: 'right' }}>PRICE</label>
          <input
            type="number"
            value={formData.unitPrice}
            onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
            placeholder="Unit Price"
            step="0.01"
            min="0"
            style={{ width: '80px', textAlign: 'left' }}
            className="rounded-xl border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center justify-center" style={{ gap: '6px' }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs font-medium transition-colors"
            style={{
              border: '1px solid #00A3E1',
              borderRadius: '14px',
              backgroundColor: 'white',
              color: '#00A3E1',
              paddingLeft: '10px',
              paddingRight: '10px',
              height: '24px',
              fontSize: '11px',
              opacity: isSaving ? 0.6 : 1,
              cursor: isSaving ? 'wait' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                e.currentTarget.style.color = 'white'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.color = '#00A3E1'
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleCancelEdit}
            className="text-xs font-medium transition-colors"
            style={{
              border: '1px solid #00A3E1',
              borderRadius: '14px',
              backgroundColor: 'white',
              color: '#00A3E1',
              paddingLeft: '10px',
              paddingRight: '10px',
              height: '24px',
              fontSize: '11px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00A3E1'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.color = '#00A3E1'
            }}
          >
            Exit
          </button>
        </div>
      </div>
    )
  }

  // Don't show any button for cancelled orders
  if (isCancelled) {
    return null
  }

  // Show Restore button for cancelled lines
  if (isLineCancelled) {
    return (
      <button
        onClick={onRestore}
        className="py-1.5 px-3 text-xs font-medium transition-colors"
        style={{
          border: '1px solid #10b981',
          borderRadius: '20px',
          backgroundColor: 'white',
          color: '#10b981'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#10b981'
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'white'
          e.currentTarget.style.color = '#10b981'
        }}
      >
        Restore
      </button>
    )
  }

  return (
    <button
      onClick={handleStartEdit}
      className="py-1.5 px-3 text-xs font-medium transition-colors"
      style={{
        border: '1px solid #00A3E1',
        borderRadius: '20px',
        backgroundColor: 'white',
        color: '#00A3E1'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#00A3E1'
        e.currentTarget.style.color = 'white'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white'
        e.currentTarget.style.color = '#00A3E1'
      }}
    >
      Edit
    </button>
  )
}




