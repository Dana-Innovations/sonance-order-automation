'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Tables } from '@/lib/types/database'

type Order = Tables<'orders'>

export function RestoreOrderModal({
  order,
  userId,
  onClose,
}: {
  order: Order
  userId: string
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleRestore = async () => {
    if (reason.length < 10 || !confirmed) return

    setIsRestoring(true)

    try {
      // Restore order status to Under Review (02)
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status_code: '02',
          cancelled_by: null,
          cancelled_at: null,
          cancelled_reason: null,
        })
        .eq('id', order.id)

      if (updateError) throw updateError

      // Restore all order lines to active status
      const { error: linesError } = await supabase
        .from('order_lines')
        .update({
          line_status: 'active',
        })
        .eq('cust_order_number', order.cust_order_number)

      if (linesError) throw linesError

      // Create status history entry
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status_code: '02',
        changed_by: userId,
        notes: reason,
      })

      // Log to audit log
      await supabase.from('audit_log').insert({
        order_id: order.id,
        user_id: userId,
        action_type: 'order_restored',
        old_value: '06',
        new_value: '02',
        reason: reason,
      })

      router.refresh()
      onClose()
    } catch (error: any) {
      alert('Error restoring order: ' + error.message)
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">
          Restore Order
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          This will restore the cancelled order to "Under Review" status and set all lines to active.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Reason for restoration <span className="text-destructive">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for restoring the order (minimum 10 characters)"
            rows={4}
            maxLength={500}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {reason.length}/500 characters (minimum 10 required)
          </p>
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
              I understand this order and all its lines will be restored to active status
            </span>
          </label>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
          >
            Go Back
          </button>
          <button
            onClick={handleRestore}
            disabled={reason.length < 10 || !confirmed || isRestoring}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRestoring ? 'Restoring...' : 'Restore Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
