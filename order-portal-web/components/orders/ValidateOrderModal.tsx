'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Tables } from '@/lib/types/database'

type Order = Tables<'orders'> & {
  order_lines: Tables<'order_lines'>[]
}

export function ValidateOrderModal({
  order,
  userId,
  onClose,
}: {
  order: Order
  userId: string
  onClose: () => void
}) {
  const [isValidating, setIsValidating] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Validation checks
  const hasShipToAddress = !!(
    order.cust_shipto_address_line1 &&
    order.cust_shipto_city &&
    order.cust_shipto_state
  )
  const hasCarrier = !!order.cust_carrier
  const hasLineItems = (order.order_lines?.length || 0) > 0

  const allChecksPass = hasShipToAddress && hasCarrier && hasLineItems

  const handleValidate = async () => {
    if (!allChecksPass || !confirmed) return

    setIsValidating(true)

    try {
      // Update order status to Validated (03)
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status_code: '03' })
        .eq('id', order.id)

      if (updateError) throw updateError

      // Create status history entry
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status_code: '03',
        changed_by: userId,
        notes: 'Order validated and ready for export',
      })

      // Log to audit log
      await supabase.from('audit_log').insert({
        order_id: order.id,
        user_id: userId,
        action_type: 'status_change',
        old_value: order.status_code,
        new_value: '03',
        reason: 'Order validated and ready for export',
      })

      router.refresh()
      onClose()
    } catch (error: any) {
      alert('Error validating order: ' + error.message)
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">
          Validate Order
        </h2>
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            {hasShipToAddress ? (
              <span className="text-green-600">✓</span>
            ) : (
              <span className="text-red-600">✗</span>
            )}
            <span className="text-sm text-foreground">Ship-to address confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            {hasCarrier ? (
              <span className="text-green-600">✓</span>
            ) : (
              <span className="text-red-600">✗</span>
            )}
            <span className="text-sm text-foreground">Carrier selected</span>
          </div>
          <div className="flex items-center gap-2">
            {hasLineItems ? (
              <span className="text-green-600">✓</span>
            ) : (
              <span className="text-red-600">✗</span>
            )}
            <span className="text-sm text-foreground">At least one line item exists</span>
          </div>
        </div>
        <div className="mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm text-foreground">
              I confirm this order is ready for export
            </span>
          </label>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
          >
            Cancel
          </button>
          <button
            onClick={handleValidate}
            disabled={!allChecksPass || !confirmed || isValidating}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? 'Validating...' : 'Validate Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

