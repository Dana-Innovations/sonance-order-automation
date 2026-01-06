import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrackingDashboard } from '@/components/reports/TrackingDashboard'

export default async function TrackingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Order Tracking</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Monitor order status and identify bottlenecks
        </p>
      </div>
      <TrackingDashboard userEmail={user.email} />
    </div>
  )
}

