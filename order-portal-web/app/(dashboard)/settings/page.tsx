import { Settings, Truck, Users, Building2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div style={{ lineHeight: '1.2', marginLeft: '24px', marginTop: '0px', paddingTop: '4px', marginBottom: '36px' }}>
        <h1 className="text-2xl font-light tracking-tight text-[#333F48]" style={{ margin: '0px' }}>
          Settings
        </h1>
        <p className="text-sm text-[#6b7a85]" style={{ margin: '0px' }}>
          Manage Shipping Carriers, ISRs and Customer Accounts
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '32px', paddingLeft: '48px', paddingRight: '24px' }}>
        {/* Carriers Card */}
        <Link href="/settings/carriers" className="no-underline">
          <div className="rounded-md shadow-sm border border-gray-200 bg-white p-6 hover:border-[#00A3E1] hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center" style={{ gap: '20px', alignItems: 'center' }}>
              <Truck className="h-6 w-6 text-[#00A3E1]" style={{ flexShrink: 0 }} />
              <h2 className="text-lg font-semibold text-[#333F48]" style={{ marginBottom: '0px', marginTop: '0px', lineHeight: '1' }}>Carriers & Ship Methods</h2>
            </div>
            <p className="text-sm text-[#6b7a85] no-underline" style={{ marginLeft: '48px', marginTop: '2px' }}>
              Manage shipping carriers and ship-via codes for order fulfillment
            </p>
          </div>
        </Link>

        {/* CSRs Card */}
        <Link href="/settings/csrs" className="no-underline">
          <div className="rounded-md shadow-sm border border-gray-200 bg-white p-6 hover:border-[#00A3E1] hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center" style={{ gap: '20px', alignItems: 'center' }}>
              <Users className="h-6 w-6 text-[#00A3E1]" style={{ flexShrink: 0 }} />
              <h2 className="text-lg font-semibold text-[#333F48]" style={{ marginBottom: '0px', marginTop: '0px', lineHeight: '1' }}>Inside Sales Representatives</h2>
            </div>
            <p className="text-sm text-[#6b7a85] no-underline" style={{ marginLeft: '48px', marginTop: '2px' }}>
              Manage Inside Sales Representatives
            </p>
          </div>
        </Link>

        {/* Customers Card */}
        <Link href="/settings/customers" className="no-underline">
          <div className="rounded-md shadow-sm border border-gray-200 bg-white p-6 hover:border-[#00A3E1] hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center" style={{ gap: '20px', alignItems: 'center' }}>
              <Building2 className="h-6 w-6 text-[#00A3E1]" style={{ flexShrink: 0 }} />
              <h2 className="text-lg font-semibold text-[#333F48]" style={{ marginBottom: '0px', marginTop: '0px', lineHeight: '1' }}>Customers</h2>
            </div>
            <p className="text-sm text-[#6b7a85] no-underline" style={{ marginLeft: '48px', marginTop: '2px' }}>
              Manage customer accounts, email addresses, and ISR assignments
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
