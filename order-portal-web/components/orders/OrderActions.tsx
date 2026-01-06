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
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const canValidate = order.status_code === '02' // Under Review
  const canExport = order.status_code === '03' // Validated
  const canEnterERP = order.status_code === '04' // Exported

  return (
    <div className="flex flex-wrap gap-2">
      {canValidate && (
        <button
          onClick={() => setShowValidate(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
        >
          Validate Order
        </button>
      )}
      {canExport && (
        <button
          onClick={() => setShowExport(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Export to XML
        </button>
      )}
      {canEnterERP && <ERPNumberInput order={order} userId={userId} />}
      <button
        onClick={() => setShowAuditLog(true)}
        className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
      >
        View Audit Log
      </button>
      {order.status_code !== '06' && (
        <button
          onClick={() => setShowCancel(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
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

