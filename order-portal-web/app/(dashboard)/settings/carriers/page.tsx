import { CarriersTable } from '@/components/settings/CarriersTable'
import { AddButton } from '@/components/settings/AddButton'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Truck, Plus } from 'lucide-react'

export default async function CarriersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: carriers } = await supabase
    .from('carriers')
    .select('*')
    .order('carrier_id', { ascending: true })

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between" style={{ marginLeft: '24px', marginRight: '24px', marginBottom: '24px' }}>
        <div style={{ lineHeight: '1.2', paddingTop: '4px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0px' }}>
            <Link href="/settings" className="text-[#6b7a85] hover:text-[#00A3E1] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Truck className="text-[#00A3E1]" style={{ flexShrink: 0, height: '1.875rem', width: '1.875rem' }} />
            <h1 className="text-2xl font-light tracking-tight text-[#333F48]" style={{ margin: '0px', marginLeft: '8px' }}>
              Carriers
            </h1>
          </div>
          <p className="text-sm text-[#6b7a85]" style={{ marginLeft: '48px', marginTop: '2px', marginBottom: '0px' }}>
            Manage shipping carriers and ship-via codes
          </p>
        </div>
        <AddButton href="/settings/carriers/new">
          <Plus className="h-4 w-4" />
          Add Carrier
        </AddButton>
      </div>

      {/* Carriers Table */}
      <div style={{ paddingLeft: '48px', paddingRight: '24px' }}>
        <CarriersTable carriers={carriers || []} />
      </div>
    </div>
  )
}
