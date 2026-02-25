'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OrderResult {
  id: string
  cust_order_number: string | null
  ps_order_number: string | null
  cust_order_date: string | null
  customername: string | null
  status_code: string
}

interface OrderLookupModalProps {
  userEmail: string
  onClose: () => void
}

export function OrderLookupModal({ userEmail, onClose }: OrderLookupModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [orders, setOrders] = useState<OrderResult[]>([])
  const [statusMap, setStatusMap] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Load status names once on mount
  useEffect(() => {
    const fetchStatuses = async () => {
      const { data } = await supabase.from('order_statuses').select('status_code, status_name')
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((s) => { map[s.status_code] = s.status_name })
        setStatusMap(map)
      }
    }
    fetchStatuses()
  }, [])

  // Debounce search input 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setOrders([])
      setError(null)
      return
    }

    const fetchOrders = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Get the user's authorized account IDs
        const { data: customers } = await supabase
          .from('customers')
          .select('customer_id, ps_customer_id')
          .eq('csr_id', userEmail)

        if (!customers || customers.length === 0) {
          setOrders([])
          return
        }

        const customerUuids = customers.map((c) => c.customer_id)
        const customerIds = customers.map((c) => c.ps_customer_id)

        const { data: childAccounts } = await supabase
          .from('customer_child_accounts')
          .select('child_ps_account_id')
          .in('parent_customer_id', customerUuids)

        const allAccountIds = [
          ...customerIds,
          ...(childAccounts?.map((ca) => ca.child_ps_account_id) || []),
        ]

        const trimmed = debouncedQuery.trim()
        const parsedNum = Number(trimmed)

        let query = supabase
          .from('orders')
          .select('id, cust_order_number, ps_order_number, cust_order_date, customername, status_code')
          .in('ps_customer_id', allAccountIds)
          .limit(25)

        if (!isNaN(parsedNum) && trimmed !== '') {
          query = query.or(`cust_order_number.ilike.%${trimmed}%,ps_order_number.eq.${parsedNum}`)
        } else {
          query = query.ilike('cust_order_number', `%${trimmed}%`)
        }

        const { data, error: queryError } = await query.order('cust_order_date', { ascending: false })

        if (queryError) throw queryError

        if (!data || data.length === 0) {
          setError('No orders found matching that number.')
          setOrders([])
        } else {
          setOrders(data)
        }
      } catch (err: unknown) {
        setError('Error searching orders: ' + (err instanceof Error ? err.message : String(err)))
        setOrders([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [debouncedQuery, userEmail])

  const handleOrderSelect = (orderId: string) => {
    router.push(`/orders/${orderId}`)
    onClose()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '20px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-lg shadow-lg"
        style={{
          width: '640px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          border: '1px solid #00A3E1',
        }}
      >
        {/* Header */}
        <div
          className="border-b border-gray-200"
          style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <h2
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '11px',
              fontWeight: 700,
              color: '#333F48',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: 0,
            }}
          >
            Order # Lookup
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8f999f', padding: '2px' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="border-b border-gray-200" style={{ padding: '16px 24px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              style={{
                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                color: '#8f999f', width: '16px', height: '16px', pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter customer or Peoplesoft order #..."
              autoFocus
              style={{
                width: '100%',
                height: '38px',
                paddingLeft: '34px',
                paddingRight: '12px',
                border: '1px solid #D9D9D6',
                borderRadius: '6px',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '14px',
                color: '#333F48',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#00A3E1' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#D9D9D6' }}
            />
          </div>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', color: '#8f999f', margin: '6px 0 0' }}>
            Type at least 2 characters. Searches both Customer and Peoplesoft order numbers.
          </p>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {!debouncedQuery || debouncedQuery.trim().length < 2 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', color: '#8f999f' }}>
              <Search style={{ width: '32px', height: '32px', marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', textAlign: 'center', margin: 0 }}>
                Start typing to search for an order...
              </p>
            </div>
          ) : isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: '10px', color: '#8f999f' }}>
              <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px' }}>Searching orders...</span>
            </div>
          ) : error ? (
            <div style={{ padding: '24px' }}>
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px 16px' }}>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: '#dc2626', margin: 0 }}>{error}</p>
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Montserrat, sans-serif', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #D9D9D6' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#333F48', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Customer</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#333F48', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Cust Order #</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#333F48', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>PS Order #</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#333F48', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Order Date</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#333F48', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => handleOrderSelect(order.id)}
                    style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e8f6fc' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white' }}
                  >
                    <td style={{ padding: '10px 12px', color: '#333F48' }}>{order.customername || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#333F48', fontWeight: 600 }}>{order.cust_order_number || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#333F48' }}>{order.ps_order_number ?? '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7a85' }}>{formatDate(order.cust_order_date)}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7a85' }}>{statusMap[order.status_code] || order.status_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {orders.length === 25 && (
            <div style={{ padding: '8px 24px', borderTop: '1px solid #D9D9D6', backgroundColor: '#fafafa' }}>
              <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', color: '#8f999f', margin: 0, textAlign: 'center' }}>
                Showing first 25 results — type more to narrow down.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="border-t border-gray-200"
          style={{ padding: '12px 24px', display: 'flex', justifyContent: 'flex-end' }}
        >
          <button
            onClick={onClose}
            style={{
              height: '34px',
              paddingLeft: '20px',
              paddingRight: '20px',
              border: '1px solid #D9D9D6',
              borderRadius: '20px',
              backgroundColor: 'white',
              color: '#333F48',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00A3E1'; e.currentTarget.style.color = '#00A3E1' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#D9D9D6'; e.currentTarget.style.color = '#333F48' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
