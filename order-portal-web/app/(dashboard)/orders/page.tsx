import { OrderList } from '@/components/orders/OrderList'
import { createClient } from '@/lib/supabase/server'

export default async function OrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return (
      <div className="space-y-6">
        <div className="rounded-sm border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">User email not found. Please contact support.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#333F48]">
          Orders
        </h1>
        <p className="mt-1 text-sm text-[#6b7a85]">
          Review and validate customer sales orders
        </p>
      </div>
      
      {/* Order List */}
      <OrderList userEmail={user.email} />
    </div>
  )
}
