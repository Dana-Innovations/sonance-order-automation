'use client'

import { useState, lazy, Suspense } from 'react'
import { ERPNumberInput } from './ERPNumberInput'
import { Tables } from '@/lib/types/database'

// Lazy load modals for better performance
const ValidateOrderModal = lazy(() =>
  import('./ValidateOrderModal').then((mod) => ({ default: mod.ValidateOrderModal }))
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
const ExportModal = lazy(() =>
  import('./ExportModal').then((mod) => ({ default: mod.ExportModal }))
)

type Order = Tables<'orders'>

export function OrderActions({
  order,
  userId,
}: {
  order: Order
  userId: string
}) {
  const [showValidate, setShowValidate] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showRestore, setShowRestore] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const canValidate = order.status_code === '02' // Under Review
  const canExport = order.status_code === '03' // Validated
  const canEnterERP = false // ERP number entry removed
  const canCancel = order.status_code !== '06' && !order.ps_order_number && order.status_code !== '05' && order.status_code !== '04'

  return (
    <div className="flex flex-wrap justify-center" style={{ gap: '24px' }}>
      {canValidate && (
        <button
          onClick={() => setShowValidate(true)}
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
      {canExport && (
        <button
          onClick={() => setShowExport(true)}
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
          Export to XML
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
      {showValidate && (
        <Suspense fallback={<div>Loading...</div>}>
          <ValidateOrderModal
            order={order}
            userId={userId}
            onClose={() => setShowValidate(false)}
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
      {showExport && (
        <Suspense fallback={<div>Loading...</div>}>
          <ExportModal
            order={order}
            userId={userId}
            onClose={() => setShowExport(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

