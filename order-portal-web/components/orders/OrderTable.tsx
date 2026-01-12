'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { format, parseISO } from 'date-fns'
import { Tables } from '@/lib/types/database'
import { AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import { useEffect } from 'react'

type Order = Tables<'orders'> & {
  customer_name: string
  status_name: string
  price_issues_count: number
  invalid_items_count: number
  total_amount: number
  csr_name: string
}

export function OrderTable({ orders }: { orders: Order[] }) {
  // Store filtered order IDs in sessionStorage for navigation
  useEffect(() => {
    if (orders.length > 0) {
      const orderIds = orders.map(order => order.id)
      sessionStorage.setItem('filteredOrderIds', JSON.stringify(orderIds))
    }
  }, [orders])
  if (orders.length === 0) {
    return (
      <div className="rounded-md shadow-sm border border-gray-200 bg-white p-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-[#F5F5F5] flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-[#8f999f]" />
          </div>
          <p className="text-sm text-[#6b7a85]">No orders found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md shadow-sm border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto" style={{ paddingLeft: '24px', paddingTop: '24px' }}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#D9D9D6]" style={{ backgroundColor: '#F5F5F5' }}>
              <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '11px' }}>
                Cust. Order #
              </th>
              <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '11px' }}>
                PS Order #
              </th>
              <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '11px' }}>
                Order Date
              </th>
              <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '11px' }}>
                Customer
              </th>
              <th className="py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '11px', paddingLeft: '16px', paddingRight: '8px', maxWidth: '120px' }}>
                PS Account
              </th>
              <th className="py-4 text-right font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '11px', paddingLeft: '8px', paddingRight: '24px' }}>
                Total $
              </th>
              <th className="py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '11px', paddingLeft: '24px', paddingRight: '16px' }}>
                Assigned ISR
              </th>
              <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '11px' }}>
                Status
              </th>
              <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-[#6b7a85]" style={{ fontSize: '11px' }}>
                Issues
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9D9D6]">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="bg-white hover:bg-[#F5F5F5]/50 transition-colors duration-150"
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <Link
                    href={`/orders/${order.id}`}
                    className="text-[#00A3E1] hover:text-[#008bc4] font-medium transition-colors"
                    style={{ fontSize: '13px' }}
                  >
                    {order.cust_order_number}
                  </Link>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-[#6b7a85]" style={{ fontSize: '13px' }}>
                  {order.status_code === '05' && order.ps_order_number ? (
                    <a
                      href={`https://sonanceerp.corp.sonance.com/psp/FS92SYS/EMPLOYEE/ERP/c/MAINTAIN_SALES_ORDERS.ORDENT_SEARCH.GBL?Page=ORDENT_SEARCH&Action=U&BUSINESS_UNIT=DANA1&ORDER_NO=${order.ps_order_number}&ICAction=ORDENT_SEARCH_BTN`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00A3E1] hover:text-[#008bc4] transition-colors"
                      style={{ textDecoration: 'underline' }}
                    >
                      {order.ps_order_number}
                    </a>
                  ) : (
                    order.ps_order_number || '—'
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-[#6b7a85]" style={{ fontSize: '13px' }}>
                  {order.cust_order_date
                    ? format(parseISO(order.cust_order_date), 'MMM d, yyyy')
                    : 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-[#333F48]" style={{ fontSize: '13px' }}>
                  {order.customer_name || order.customername || 'N/A'}
                </td>
              <td className="py-4 whitespace-nowrap text-[#6b7a85] font-mono" style={{ fontSize: '13px', paddingLeft: '16px', paddingRight: '8px', maxWidth: '120px' }}>
                {order.ps_customer_id}
              </td>
              <td className="py-4 whitespace-nowrap text-[#333F48] text-right font-medium" style={{ fontSize: '13px', paddingLeft: '8px', paddingRight: '24px' }}>
                {order.total_amount > 0
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency_code || 'USD' }).format(order.total_amount)
                  : '—'}
              </td>
              <td className="py-4 whitespace-nowrap text-[#333F48]" style={{ fontSize: '13px', paddingLeft: '24px', paddingRight: '16px' }}>
                {order.csr_name || '—'}
              </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <StatusBadge statusCode={order.status_code} statusName={order.status_name} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {order.price_issues_count > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-amber-50 border border-amber-200 px-2.5 py-1 font-medium text-amber-700" style={{ fontSize: '11px' }}>
                        <AlertTriangle className="h-3 w-3" />
                        {order.price_issues_count} price
                      </span>
                    )}
                    {order.invalid_items_count > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-red-50 border border-red-200 px-2.5 py-1 font-medium text-red-700" style={{ fontSize: '11px' }}>
                        <XCircle className="h-3 w-3" />
                        {order.invalid_items_count} invalid
                      </span>
                    )}
                    {order.price_issues_count === 0 && order.invalid_items_count === 0 && (
                      <span className="inline-flex items-center gap-1 text-[#6b7a85]" style={{ fontSize: '11px' }}>
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        No issues
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
