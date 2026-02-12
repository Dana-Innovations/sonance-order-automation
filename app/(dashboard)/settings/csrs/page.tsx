import { CSRsTable } from '@/components/settings/CSRsTable'
import { AddButton } from '@/components/settings/AddButton'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Plus } from 'lucide-react'

export default async function CSRsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: csrs } = await supabase
    .from('csrs')
    .select('*')
    .order('email', { ascending: true })

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between" style={{ marginLeft: '24px', marginRight: '24px', marginBottom: '24px' }}>
        <div style={{ lineHeight: '1.2', paddingTop: '4px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0px' }}>
            <Link href="/settings" className="text-[#6b7a85] hover:text-[#00A3E1] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Users className="text-[#00A3E1]" style={{ flexShrink: 0, height: '1.875rem', width: '1.875rem' }} />
            <h1 className="text-2xl font-light tracking-tight text-[#333F48]" style={{ margin: '0px', marginLeft: '8px' }}>
              ISRs
            </h1>
          </div>
          <p className="text-sm text-[#6b7a85]" style={{ marginLeft: '48px', marginTop: '2px', marginBottom: '0px' }}>
            Manage Inside Sales Representatives
          </p>
        </div>
        <AddButton href="/settings/csrs/new">
          <Plus className="h-4 w-4" />
          Add ISR
        </AddButton>
      </div>

      {/* CSRs Table */}
      <div style={{ paddingLeft: '48px', paddingRight: '24px' }}>
        <CSRsTable csrs={csrs || []} />
      </div>
    </div>
  )
}
