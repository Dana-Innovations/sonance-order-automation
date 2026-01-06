'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { Tables } from '@/lib/types/database'
import { AlertTriangle, XCircle, CheckCircle } from 'lucide-react'

type Order = Tables<'orders'> & {
  customer_name: string
  status_name: string
  price_issues_count: number
  invalid_items_count: number
}

export function OrderTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-sm border border-[#D9D9D6] bg-white p-12 text-center">
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
    <div className="rounded-sm border border-[#D9D9D6] bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#D9D9D6]" style={{ backgroundColor: '#F5F5F5' }}>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-medium uppercase tracking-widest text-[#6b7a85]">
                Status
              </th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-medium uppercase tracking-widest text-[#6b7a85]">
                Order Number
              </th>
              <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-medium uppercase tracking-widest text-[#6b7a85]">
                Customer
              </th>
              <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-medium uppercase tracking-widest text-[#6b7a85]">
                Order Date
              </th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-medium uppercase tracking-widest text-[#6b7a85]">
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
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <StatusBadge statusCode={order.status_code} statusName={order.status_name} />
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/orders/${order.id}`}
                    className="text-[#00A3E1] hover:text-[#008bc4] font-medium transition-colors"
                  >
                    {order.cust_order_number}
                  </Link>
                </td>
                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-[#333F48]">
                  {order.customer_name || order.customername || 'N/A'}
                </td>
                <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-[#6b7a85]">
                  {order.cust_order_date
                    ? format(new Date(order.cust_order_date), 'MMM d, yyyy')
                    : 'N/A'}
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {order.price_issues_count > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        {order.price_issues_count} price
                      </span>
                    )}
                    {order.invalid_items_count > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700">
                        <XCircle className="h-3 w-3" />
                        {order.invalid_items_count} invalid
                      </span>
                    )}
                    {order.price_issues_count === 0 && order.invalid_items_count === 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-[#6b7a85]">
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
