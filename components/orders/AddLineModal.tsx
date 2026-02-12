'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Tables } from '@/lib/types/database'
import { ProductLookupModal } from './ProductLookupModal'

type Order = Tables<'orders'> & {
  customers: Tables<'customers'> | null
  order_lines: Tables<'order_lines'>[]
}

interface AddLineModalProps {
  order: Order
  userId: string
  onClose: () => void
}

export function AddLineModal({ order, userId, onClose }: AddLineModalProps) {
  const [nextLineNumber, setNextLineNumber] = useState<number>(1)
  const [isCalculating, setIsCalculating] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  // Calculate next line number on mount
  useEffect(() => {
    const calculateNextLineNumber = async () => {
      try {
        const { data: lines, error } = await supabase
          .from('order_lines')
          .select('cust_line_number')
          .eq('cust_order_number', order.cust_order_number)
          .order('cust_line_number', { ascending: false })
          .limit(1)

        if (error) throw error

        const maxLineNumber = lines?.[0]?.cust_line_number || 0
        const nextNumber = maxLineNumber + 1
        setNextLineNumber(nextNumber)
        setIsCalculating(false)
      } catch (error: any) {
        console.error('Error calculating next line number:', error)
        setError('Error calculating line number: ' + error.message)
        setIsCalculating(false)
      }
    }

    calculateNextLineNumber()
  }, [order.cust_order_number, supabase, onClose])

  // Handle product selection - create the line immediately
  const handleProductSelect = async (product: {
    product_id: string
    uom: string
    dfi_price: number
    description: string
    quantity?: number
  }) => {
    try {
      const qty = product.quantity || 1
      const lineTotal = product.dfi_price * qty

      // Insert new line with product information
      const { data: newLine, error } = await supabase
        .from('order_lines')
        .insert({
          cust_order_number: order.cust_order_number,
          cust_line_number: nextLineNumber,
          cust_product_sku: 'Added Item',
          cust_line_desc: 'Manually added Product',
          cust_quantity: qty,
          cust_unit_price: product.dfi_price,
          cust_line_total: lineTotal,
          cust_uom: product.uom,
          cust_currency_code: order.currency_code,
          ps_customer_id: order.ps_customer_id,
          line_status: 'active',
          sonance_prod_sku: product.product_id,
          sonance_quantity: qty,
          sonance_uom: product.uom,
          sonance_unit_price: product.dfi_price,
          validated_sku: product.product_id,
          validation_source: 'manual_add',
          is_validated: true,
        })
        .select()
        .single()

      if (error) throw error
      if (!newLine) throw new Error('Failed to insert line')

      // Create audit log entry
      await supabase
        .from('audit_log')
        .insert({
          order_id: order.id,
          order_line_id: newLine.id,
          user_id: userId,
          action_type: 'line_added',
          field_name: 'line_status',
          old_value: null,
          new_value: 'active',
          reason: `Manual line item added - Line ${nextLineNumber}: ${product.product_id} (${product.description}) - Qty: ${qty}`,
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
          notes: 'New line item added - status changed from Rev No Changes to Rev With Changes',
        })
      }

      // Refresh and close
      router.refresh()
      onClose()
    } catch (error: any) {
      console.error('Error adding line:', error)
      alert('Error adding line: ' + error.message)
      onClose()
    }
  }

  // Show error if there's an error
  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}>
        <div className="rounded-lg shadow-lg flex flex-col items-center justify-center p-8" style={{ width: '400px', backgroundColor: 'white', border: '1px solid #dc2626' }}>
          <div className="text-red-600 text-4xl mb-4">⚠</div>
          <h3 className="font-semibold text-[#333F48] mb-4" style={{ fontSize: '15px' }}>Error</h3>
          <p className="text-red-600 text-center mb-6" style={{ fontSize: '13px' }}>
            {error}
          </p>
          <button
            onClick={onClose}
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
            Close
          </button>
        </div>
      </div>
    )
  }

  // Show loading state while calculating
  if (isCalculating) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}>
        <div className="rounded-lg shadow-lg flex flex-col items-center justify-center p-8" style={{ width: '400px', backgroundColor: 'white', border: '1px solid #00A3E1' }}>
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: '#00A3E1' }}></div>
          <p className="font-medium text-[#333F48]" style={{ fontSize: '13px' }}>
            Preparing new line...
          </p>
        </div>
      </div>
    )
  }

  // Show only the ProductLookupModal with quantity entry
  return (
    <ProductLookupModal
      orderId={order.id}
      psCustomerId={order.ps_customer_id || ''}
      currencyCode={order.currency_code || 'USD'}
      lineNumber={nextLineNumber}
      showQuantityEntry={true}
      onSelect={handleProductSelect}
      onClose={onClose}
    />
  )
}
