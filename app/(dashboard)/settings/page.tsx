import { Settings, Truck, Users, Building2, Sparkles, Key } from 'lucide-react'
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

      {/* Navigation Cards - Changed to 2x2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '32px', paddingLeft: '48px', paddingRight: '24px' }}>
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

        {/* NEW: Customer Setup Wizard Card */}
        <Link href="/settings/wizard" className="no-underline">
          <div className="rounded-md shadow-sm border border-gray-200 bg-white p-6 hover:border-[#00A3E1] hover:shadow-md transition-all cursor-pointer relative">
            {/* Sparkles badge */}
            <div className="absolute top-2 right-2">
              <Sparkles className="h-6 w-6 text-[#00A3E1]" />
            </div>

            <div className="flex items-center" style={{ gap: '20px', alignItems: 'center' }}>
              <Sparkles className="h-6 w-6 text-[#00A3E1]" style={{ flexShrink: 0 }} />
              <h2 className="text-lg font-semibold text-[#333F48]" style={{ marginBottom: '0px', marginTop: '0px', lineHeight: '1' }}>Customer Setup Wizard</h2>
            </div>
            <p className="text-sm text-[#6b7a85] no-underline" style={{ marginLeft: '48px', marginTop: '2px' }}>
              AI-guided setup for new customers with automated prompt generation
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#00A3E1]" style={{ marginLeft: '48px' }}>
              <span>✨ Voice-guided questions</span>
              <span>•</span>
              <span>🤖 AI prompt generation</span>
            </div>
          </div>
        </Link>

        {/* API Keys Card */}
        <Link href="/settings/api-keys" className="no-underline">
          <div className="rounded-md shadow-sm border border-gray-200 bg-white p-6 hover:border-[#00A3E1] hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center" style={{ gap: '20px', alignItems: 'center' }}>
              <Key className="h-6 w-6 text-[#00A3E1]" style={{ flexShrink: 0 }} />
              <h2 className="text-lg font-semibold text-[#333F48]" style={{ marginBottom: '0px', marginTop: '0px', lineHeight: '1' }}>API Keys</h2>
            </div>
            <p className="text-sm text-[#6b7a85] no-underline" style={{ marginLeft: '48px', marginTop: '2px' }}>
              Configure API keys for Claude AI and other services
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
