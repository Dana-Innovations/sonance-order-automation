import { CarrierForm } from '@/components/settings/CarrierForm'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Truck } from 'lucide-react'

export default async function CarrierEditPage({
  params,
}: {
  params: Promise<{ carrierId: string; shipViaCode: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { carrierId, shipViaCode } = await params

  const { data: carrier } = await supabase
    .from('carriers')
    .select('*')
    .eq('carrier_id', carrierId)
    .eq('ship_via_code', shipViaCode)
    .single()

  if (!carrier) notFound()

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between" style={{ marginLeft: '24px', marginRight: '24px', paddingTop: '4px', marginBottom: '32px' }}>
        <div style={{ lineHeight: '1.2' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0px' }}>
            <Link href="/settings/carriers" className="text-[#6b7a85] hover:text-[#00A3E1] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Truck className="text-[#00A3E1]" style={{ flexShrink: 0, height: '1.875rem', width: '1.875rem' }} />
            <h1 className="text-2xl font-light tracking-tight text-[#333F48]" style={{ margin: '0px', marginLeft: '8px' }}>
              Edit Carrier
            </h1>
          </div>
          <p className="text-sm text-[#6b7a85]" style={{ marginLeft: '48px', marginTop: '2px', marginBottom: '0px' }}>
            {carrier.carrier_id} - {carrier.ship_via_code}
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <div className="px-6" style={{ maxWidth: '50%' }}>
        <CarrierForm mode="edit" carrier={carrier} userId={user.id} />
      </div>
    </div>
  )
}
