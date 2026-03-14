'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { TrackingDashboard } from '@/components/reports/TrackingDashboard'

export default function TrackingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) {
        router.push('/login')
      } else {
        setUserEmail(user.email)
      }
    })
  }, [])

  if (!userEmail) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Order Tracking</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Monitor order status and identify bottlenecks
        </p>
      </div>
      <TrackingDashboard userEmail={userEmail} />
    </div>
  )
}
