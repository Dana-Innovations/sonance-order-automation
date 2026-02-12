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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '500px', maxWidth: '90vw', maxHeight: '80vh', backgroundColor: 'white', border: '1px solid #00A3E1', position: 'relative', top: '-5vh' }}>
        {/* Header */}
        <div className="border-b border-gray-300" style={{ backgroundColor: 'white', paddingTop: '5px', paddingBottom: '20px', paddingLeft: '32px', paddingRight: '32px' }}>
          <h2 className="font-semibold" style={{ color: '#666', fontSize: '14px' }}>
            Restore Order
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'white', paddingTop: '8px', paddingBottom: '32px', paddingLeft: '32px', paddingRight: '32px' }}>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
            This will restore the cancelled order to "Under Review" status and set all lines to active.
          </p>
          <div style={{ marginBottom: '16px' }}>
            <label className="block font-medium mb-2" style={{ fontSize: '12px', color: '#333' }}>
              Reason for restoration <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for restoring the order (minimum 10 characters)"
              rows={4}
              maxLength={500}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontSize: '12px', backgroundColor: 'white', color: '#000' }}
            />
            <p style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
              {reason.length}/500 characters (minimum 10 required)
            </p>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span style={{ fontSize: '12px', color: '#333' }}>
                I understand this order and all its lines will be restored to active status
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 flex justify-center gap-3" style={{ backgroundColor: 'white', paddingTop: '20px', paddingBottom: '20px' }}>
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
            Go Back
          </button>
          <button
            onClick={handleRestore}
            disabled={reason.length < 10 || !confirmed || isRestoring}
            className="font-medium transition-colors"
            style={{
              border: '1px solid #10b981',
              borderRadius: '20px',
              backgroundColor: reason.length < 10 || !confirmed || isRestoring ? '#ccc' : '#10b981',
              color: 'white',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingTop: '6px',
              paddingBottom: '6px',
              fontSize: '9px',
              cursor: reason.length < 10 || !confirmed || isRestoring ? 'not-allowed' : 'pointer',
              opacity: reason.length < 10 || !confirmed || isRestoring ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!(reason.length < 10 || !confirmed || isRestoring)) {
                e.currentTarget.style.backgroundColor = '#059669'
              }
            }}
            onMouseLeave={(e) => {
              if (!(reason.length < 10 || !confirmed || isRestoring)) {
                e.currentTarget.style.backgroundColor = '#10b981'
              }
            }}
          >
            {isRestoring ? 'Restoring...' : 'Restore Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
