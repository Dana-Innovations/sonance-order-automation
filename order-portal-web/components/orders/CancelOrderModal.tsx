'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Tables } from '@/lib/types/database'

type Order = Tables<'orders'>

export function CancelOrderModal({
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
  const [isCancelling, setIsCancelling] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Check if order can be cancelled
  const canCancel = !order.ps_order_number && order.status_code !== '05' && order.status_code !== '04'
  const cancelBlockedReason = order.ps_order_number
    ? 'This order has been imported to PeopleSoft and cannot be cancelled.'
    : order.status_code === '05'
    ? 'Orders with status "Import Successful" cannot be cancelled.'
    : order.status_code === '04'
    ? 'Orders with status "Upload in Process" cannot be cancelled.'
    : ''

  const handleCancel = async () => {
    if (reason.length < 10 || !confirmed) return

    setIsCancelling(true)

    try {
      // Update order status to Cancelled (06)
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status_code: '06',
          cancelled_by: userId,
          cancelled_at: new Date().toISOString(),
          cancelled_reason: reason,
        })
        .eq('id', order.id)

      if (updateError) throw updateError

      // Cancel all order lines for this order
      const { error: linesError } = await supabase
        .from('order_lines')
        .update({
          line_status: 'cancelled',
        })
        .eq('cust_order_number', order.cust_order_number)

      if (linesError) throw linesError

      // Create status history entry
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status_code: '06',
        changed_by: userId,
        notes: reason,
      })

      // Log to audit log
      await supabase.from('audit_log').insert({
        order_id: order.id,
        user_id: userId,
        action_type: 'order_cancelled',
        old_value: order.status_code,
        new_value: '06',
        reason: reason,
      })

      router.refresh()
      onClose()
    } catch (error: any) {
      alert('Error cancelling order: ' + error.message)
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '500px', maxWidth: '90vw', maxHeight: '80vh', backgroundColor: 'white', border: '1px solid #00A3E1', position: 'relative', top: '-5vh' }}>
        {/* Header */}
        <div className="border-b border-gray-300" style={{ backgroundColor: 'white', paddingTop: '10px', paddingBottom: '10px', paddingLeft: '8px', paddingRight: '8px' }}>
          <h2 className="font-semibold" style={{ color: '#666', fontSize: '14px' }}>
            Cancel Order
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'white', padding: '16px' }}>

          {!canCancel ? (
            <div>
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800 font-medium">
                  Cannot Cancel Order
                </p>
                <p className="text-sm text-red-700 mt-2">
                  {cancelBlockedReason}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label className="block font-medium mb-2" style={{ fontSize: '12px', color: '#333' }}>
                  Reason for cancellation <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for cancellation (minimum 10 characters)"
                  rows={4}
                  maxLength={500}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontSize: '12px', backgroundColor: 'white', color: '#000' }}
                />
                <p style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
                  {reason.length}/500 characters (minimum 10 required)
                </p>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span style={{ fontSize: '12px', color: '#333' }}>
                    Confirm cancellation
                  </span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 flex justify-center gap-3" style={{ backgroundColor: 'white', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '16px', paddingRight: '16px' }}>
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
            {canCancel ? 'Go Back' : 'Close'}
          </button>
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={reason.length < 10 || !confirmed || isCancelling}
              className="font-medium transition-colors"
              style={{
                border: '1px solid #dc2626',
                borderRadius: '20px',
                backgroundColor: reason.length < 10 || !confirmed || isCancelling ? '#ccc' : '#dc2626',
                color: 'white',
                paddingLeft: '20px',
                paddingRight: '20px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '9px',
                cursor: reason.length < 10 || !confirmed || isCancelling ? 'not-allowed' : 'pointer',
                opacity: reason.length < 10 || !confirmed || isCancelling ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!(reason.length < 10 || !confirmed || isCancelling)) {
                  e.currentTarget.style.backgroundColor = '#b91c1c'
                }
              }}
              onMouseLeave={(e) => {
                if (!(reason.length < 10 || !confirmed || isCancelling)) {
                  e.currentTarget.style.backgroundColor = '#dc2626'
                }
              }}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}














