'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import StatusFunnel from './StatusFunnel'
import StuckOrders from './StuckOrders'

export function TrackingDashboard({ userEmail }: { userEmail: string }) {
  const supabase = createClient()

  const { data: statusCounts, isLoading } = useQuery({
    queryKey: ['order-status-counts', userEmail],
    queryFn: async () => {
      // Get assigned customers using email
      const { data: assignments } = await supabase
        .from('csr_assignments')
        .select('ps_customer_id')
        .eq('user_email', userEmail)

      if (!assignments || assignments.length === 0) {
        return {}
      }

      const customerIds = assignments.map((a: { ps_customer_id: string }) => a.ps_customer_id)

      // Get status counts
      const { data: orders } = await supabase
        .from('orders')
        .select('status_code')
        .in('ps_customer_id', customerIds)

      const counts: Record<string, number> = {}
      orders?.forEach((order: { status_code: string }) => {
        counts[order.status_code] = (counts[order.status_code] || 0) + 1
      })

      return counts
    },
  })

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">
            {statusCounts?.['01'] || 0}
          </div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">
            {statusCounts?.['02'] || 0}
          </div>
          <div className="text-sm text-muted-foreground">Under Review</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">
            {statusCounts?.['03'] || 0}
          </div>
          <div className="text-sm text-muted-foreground">Validated</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">
            {statusCounts?.['04'] || 0}
          </div>
          <div className="text-sm text-muted-foreground">Exported</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">
            {statusCounts?.['05'] || 0}
          </div>
          <div className="text-sm text-muted-foreground">ERP Processed</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">
            {statusCounts?.['06'] || 0}
          </div>
          <div className="text-sm text-muted-foreground">Cancelled</div>
        </div>
      </div>
      <StatusFunnel userEmail={userEmail} />
      <StuckOrders userEmail={userEmail} />
    </div>
  )
}

