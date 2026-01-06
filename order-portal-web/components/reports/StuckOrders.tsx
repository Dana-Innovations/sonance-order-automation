'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format } from 'date-fns'
import { StatusBadge } from '@/components/ui/StatusBadge'

export function StuckOrders({ userEmail }: { userEmail: string }) {
  const supabase = createClient()

  const { data: stuckOrders } = useQuery({
    queryKey: ['stuck-orders', userEmail],
    queryFn: async () => {
      // Get assigned customers using email
      const { data: assignments } = await supabase
        .from('csr_assignments')
        .select('ps_customer_id')
        .eq('user_email', userEmail)

      if (!assignments || assignments.length === 0) {
        return []
      }

      const customerIds = assignments.map((a) => a.ps_customer_id)

      // Get orders that have been in the same status for more than 24 hours
      const twentyFourHoursAgo = new Date()
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

      const { data: orders } = await supabase
        .from('orders')
        .select(
          `
          id,
          cust_order_number,
          status_code,
          updated_at,
          customers!orders_ps_customer_id_fkey(customer_name),
          order_statuses!orders_status_code_fkey(status_name)
        `
        )
        .in('ps_customer_id', customerIds)
        .neq('status_code', '05') // Exclude ERP Processed
        .neq('status_code', '06') // Exclude Cancelled
        .lt('updated_at', twentyFourHoursAgo.toISOString())
        .order('updated_at', { ascending: true })
        .limit(10)

      return orders || []
    },
  })

  if (!stuckOrders || stuckOrders.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">
          Stuck Orders
        </h2>
        <p className="text-sm text-muted-foreground">
          No orders stuck in the same status for more than 24 hours
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-card-foreground mb-4">
        Stuck Orders (Needs Attention)
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Order Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Last Updated
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Days in Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stuckOrders.map((order: any) => {
              const daysInStatus = Math.floor(
                (new Date().getTime() - new Date(order.updated_at).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
              return (
                <tr key={order.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-primary hover:text-primary/80 font-medium"
                    >
                      {order.cust_order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {order.customers?.customer_name || 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      statusCode={order.status_code}
                      statusName={order.order_statuses?.status_name || ''}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {format(new Date(order.updated_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground font-medium">
                    {daysInStatus} day{daysInStatus !== 1 ? 's' : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

