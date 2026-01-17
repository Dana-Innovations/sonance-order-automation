'use client'

import { useState, useEffect } from 'react'
import { ERPNumberInput } from './ERPNumberInput'
import { Tables } from '@/lib/types/database'
import { PostOrderModal } from './PostOrderModal'
import { CancelOrderModal } from './CancelOrderModal'
import { RestoreOrderModal } from './RestoreOrderModal'
import { AuditLogModal } from '@/components/audit/AuditLogModal'
import { AddLineModal } from './AddLineModal'

type Order = Tables<'orders'> & {
  customers: Tables<'customers'> | null
  order_statuses: Tables<'order_statuses'> | null
  order_lines: Tables<'order_lines'>[]
}

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
  const [showAddLine, setShowAddLine] = useState(false)

  // Helper function to close all modals
  const closeAllModals = () => {
    setShowPostOrder(false)
    setShowCancel(false)
    setShowRestore(false)
    setShowAuditLog(false)
    setShowAddLine(false)
  }

  // Helper function to open a specific modal (closes others first)
  const openModal = (modalType: 'post' | 'cancel' | 'restore' | 'audit' | 'addLine') => {
    closeAllModals()
    // Use setTimeout to ensure state updates are processed
    setTimeout(() => {
      switch (modalType) {
        case 'post':
          setShowPostOrder(true)
          break
        case 'cancel':
          setShowCancel(true)
          break
        case 'restore':
          setShowRestore(true)
          break
        case 'audit':
          setShowAuditLog(true)
          break
        case 'addLine':
          setShowAddLine(true)
          break
      }
    }, 0)
  }

  // Post Order available for Under Review (02) or Reviewed with Changes (03)
  const canPostOrder = order.status_code === '02' || order.status_code === '03'
  const canEnterERP = false // ERP number entry removed
  const canCancel = order.status_code !== '06' && !order.ps_order_number && order.status_code !== '05' && order.status_code !== '04'

  // Add Line available for NEW (01), REVIEWED NO CHANGES (02), or REVIEWED WITH CHANGES (03)
  // and order has not been posted to PeopleSoft yet
  const canAddLine = (
    (order.status_code === '01' || order.status_code === '02' || order.status_code === '03') &&
    !order.ps_order_number &&
    order.status_code !== '06'
  )

  return (
    <div className="flex flex-wrap justify-center" style={{ gap: '24px' }}>
      {canPostOrder && (
        <button
          onClick={() => openModal('post')}
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
      {canAddLine && (
        <button
          onClick={() => openModal('addLine')}
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
          Add Line
        </button>
      )}
      <button
        onClick={() => openModal('audit')}
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
          onClick={() => openModal('restore')}
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
          onClick={() => openModal('cancel')}
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
        <PostOrderModal
          order={order as any}
          userId={userId}
          onClose={closeAllModals}
        />
      )}
      {showCancel && (
        <CancelOrderModal
          order={order}
          userId={userId}
          onClose={closeAllModals}
        />
      )}
      {showRestore && (
        <RestoreOrderModal
          order={order}
          userId={userId}
          onClose={closeAllModals}
        />
      )}
      {showAuditLog && (
        <AuditLogModal
          orderId={order.id}
          onClose={closeAllModals}
        />
      )}
      {showAddLine && (
        <AddLineModal
          order={order as any}
          userId={userId}
          onClose={closeAllModals}
        />
      )}
    </div>
  )
}

