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
}: {
  line: OrderLine
  orderId: string
  userId: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    quantity: line.cust_quantity?.toString() || '',
    unitPrice: line.cust_unit_price?.toString() || '',
    description: line.cust_line_desc || '',
    productSku: line.cust_product_sku || '',
    uom: line.cust_uom || '',
  })
  const supabase = createClient()
  const router = useRouter()

  const handleSave = async () => {
    const quantity = parseFloat(formData.quantity)
    const unitPrice = parseFloat(formData.unitPrice)

    if (quantity <= 0 || unitPrice < 0) {
      alert('Quantity must be greater than 0 and price must be non-negative')
      return
    }

    const lineTotal = quantity * unitPrice

    const { error } = await supabase
      .from('order_lines')
      .update({
        cust_quantity: quantity,
        cust_unit_price: unitPrice,
        cust_line_total: lineTotal,
        cust_line_desc: formData.description,
        cust_product_sku: formData.productSku,
        cust_uom: formData.uom,
      })
      .eq('id', line.id)

    if (error) {
      alert('Error saving changes: ' + error.message)
      return
    }

    // Log changes to audit log
    const changes = []
    if (line.cust_quantity?.toString() !== formData.quantity) {
      changes.push({
        field_name: 'quantity',
        old_value: line.cust_quantity?.toString() || '',
        new_value: formData.quantity,
      })
    }
    if (line.cust_unit_price?.toString() !== formData.unitPrice) {
      changes.push({
        field_name: 'unit_price',
        old_value: line.cust_unit_price?.toString() || '',
        new_value: formData.unitPrice,
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
        reason: change.field_name === 'unit_price' ? 'Price correction' : undefined,
      })
    }

    setIsEditing(false)
    router.refresh()
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <input
          type="number"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
          placeholder="Quantity"
          step="0.01"
          min="0"
          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
        />
        <input
          type="number"
          value={formData.unitPrice}
          onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
          placeholder="Unit Price"
          step="0.01"
          min="0"
          className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
        />
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs hover:bg-muted/80"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-primary hover:text-primary/80 text-sm"
    >
      Edit
    </button>
  )
}

