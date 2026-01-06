'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function StatusFunnel({ userEmail }: { userEmail: string }) {
  const supabase = createClient()

  const { data: funnelData } = useQuery({
    queryKey: ['order-funnel', userEmail],
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

      // Get status counts
      const { data: orders } = await supabase
        .from('orders')
        .select('status_code')
        .in('ps_customer_id', customerIds)

      const statusOrder = ['01', '02', '03', '04', '05']
      const statusNames: Record<string, string> = {
        '01': 'Pending',
        '02': 'Under Review',
        '03': 'Validated',
        '04': 'Exported',
        '05': 'ERP Processed',
      }

      const counts: Record<string, number> = {}
      orders?.forEach((order) => {
        counts[order.status_code] = (counts[order.status_code] || 0) + 1
      })

      const total = orders?.length || 0

      return statusOrder.map((code) => ({
        code,
        name: statusNames[code],
        count: counts[code] || 0,
        percentage: total > 0 ? ((counts[code] || 0) / total) * 100 : 0,
      }))
    },
  })

  if (!funnelData) return null

  const maxCount = Math.max(...funnelData.map((d) => d.count), 1)

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-card-foreground mb-4">
        Status Funnel
      </h2>
      <div className="space-y-2">
        {funnelData.map((item) => (
          <div key={item.code} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-medium">{item.name}</span>
              <span className="text-muted-foreground">
                {item.count} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

