import { OrderList } from '@/components/orders/OrderList'
import { createClient } from '@/lib/supabase/server'

export default async function OrdersPage() {
  // In dev mode with DISABLE_AUTH, use a mock user email
  if (process.env.DISABLE_AUTH === 'true') {
    return (
      <div className="space-y-4">
        {/* Page Header */}
        <div style={{ lineHeight: '1.2', marginLeft: '24px', marginTop: '0px', paddingTop: '4px' }}>
          <h1 className="text-2xl font-light tracking-tight text-[#333F48]" style={{ margin: '0px' }}>
            Orders
          </h1>
          <p className="text-sm text-[#6b7a85]" style={{ margin: '0px' }}>
            Review, validate & edit new customer orders
          </p>
        </div>

        {/* Order List with dev user */}
        <OrderList userEmail="dev@sonance.com" />
      </div>
    )
  }

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
    <div className="space-y-4">
      {/* Page Header */}
      <div style={{ lineHeight: '1.2', marginLeft: '24px', marginTop: '0px', paddingTop: '4px' }}>
        <h1 className="text-2xl font-light tracking-tight text-[#333F48]" style={{ margin: '0px' }}>
          Orders
        </h1>
        <p className="text-sm text-[#6b7a85]" style={{ margin: '0px' }}>
          Review, validate & edit new customer orders
        </p>
      </div>
      
      {/* Order List */}
      <OrderList userEmail={user.email} />
    </div>
  )
}
