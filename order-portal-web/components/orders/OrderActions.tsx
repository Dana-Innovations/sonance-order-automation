'use client'

import { useState, lazy, Suspense } from 'react'
import { ERPNumberInput } from './ERPNumberInput'
import { Tables } from '@/lib/types/database'

// Lazy load modals for better performance
const PostOrderModal = lazy(() =>
  import('./PostOrderModal').then((mod) => ({ default: mod.PostOrderModal }))
)
const CancelOrderModal = lazy(() =>
  import('./CancelOrderModal').then((mod) => ({ default: mod.CancelOrderModal }))
)
const RestoreOrderModal = lazy(() =>
  import('./RestoreOrderModal').then((mod) => ({ default: mod.RestoreOrderModal }))
)
const AuditLogModal = lazy(() =>
  import('@/components/audit/AuditLogModal').then((mod) => ({ default: mod.AuditLogModal }))
)

type Order = Tables<'orders'>

export function OrderActions({
  order,
  userId,
}: {
  order: Order
  userId: string
}) {
  const [showPostOrder, setShowPostOrder] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showRestore, setShowRestore] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState(false)

  // Post Order available for Under Review (02) or Reviewed with Changes (03)
  const canPostOrder = order.status_code === '02' || order.status_code === '03'
  const canEnterERP = false // ERP number entry removed
  const canCancel = order.status_code !== '06' && !order.ps_order_number && order.status_code !== '05' && order.status_code !== '04'

  return (
    <div className="flex flex-wrap justify-center" style={{ gap: '24px' }}>
      {canPostOrder && (
        <button
          onClick={() => setShowPostOrder(true)}
          className="py-1.5 text-xs font-medium transition-colors"
          style={{
            border: '1px solid #00A3E1',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#00A3E1',
            paddingLeft: '16px',
            paddingRight: '16px'
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
          Post Order
        </button>
      )}
      {canEnterERP && <ERPNumberInput order={order} userId={userId} />}
      <button
        onClick={() => setShowAuditLog(true)}
        className="py-1.5 text-xs font-medium transition-colors"
        style={{
          border: '1px solid #00A3E1',
          borderRadius: '20px',
          backgroundColor: 'white',
          color: '#00A3E1',
          paddingLeft: '16px',
          paddingRight: '16px'
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
        Audit Log
      </button>
      {order.status_code === '06' && (
        <button
          onClick={() => setShowRestore(true)}
          className="py-1.5 text-xs font-medium transition-colors"
          style={{
            border: '1px solid #10b981',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#10b981',
            paddingLeft: '16px',
            paddingRight: '16px'
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
          Restore Order
        </button>
      )}
      {canCancel && (
        <button
          onClick={() => setShowCancel(true)}
          className="py-1.5 text-xs font-medium transition-colors"
          style={{
            border: '1px solid #00A3E1',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#00A3E1',
            paddingLeft: '16px',
            paddingRight: '16px'
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
          Cancel Order
        </button>
      )}
      {showPostOrder && (
        <Suspense fallback={<div>Loading...</div>}>
          <PostOrderModal
            order={order}
            userId={userId}
            onClose={() => setShowPostOrder(false)}
          />
        </Suspense>
      )}
      {showCancel && (
        <Suspense fallback={<div>Loading...</div>}>
          <CancelOrderModal
            order={order}
            userId={userId}
            onClose={() => setShowCancel(false)}
          />
        </Suspense>
      )}
      {showRestore && (
        <Suspense fallback={<div>Loading...</div>}>
          <RestoreOrderModal
            order={order}
            userId={userId}
            onClose={() => setShowRestore(false)}
          />
        </Suspense>
      )}
      {showAuditLog && (
        <Suspense fallback={<div>Loading...</div>}>
          <AuditLogModal
            orderId={order.id}
            onClose={() => setShowAuditLog(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

