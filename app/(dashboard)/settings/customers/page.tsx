import { CustomersTable } from '@/components/settings/CustomersTable'
import { AddButton } from '@/components/settings/AddButton'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Plus } from 'lucide-react'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: customers } = await supabase
    .from('customers')
    .select(`
      *,
      csrs (
        email,
        first_name,
        last_name
      )
    `)
    .order('customer_name', { ascending: true })

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between" style={{ marginLeft: '24px', marginRight: '24px', marginBottom: '24px' }}>
        <div style={{ lineHeight: '1.2', paddingTop: '4px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0px' }}>
            <Link href="/settings" className="text-[#6b7a85] hover:text-[#00A3E1] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Building2 className="text-[#00A3E1]" style={{ flexShrink: 0, height: '1.875rem', width: '1.875rem' }} />
            <h1 className="text-2xl font-light tracking-tight text-[#333F48]" style={{ margin: '0px', marginLeft: '8px' }}>
              Customers
            </h1>
          </div>
          <p className="text-sm text-[#6b7a85]" style={{ marginLeft: '48px', marginTop: '2px', marginBottom: '0px' }}>
            Manage customer accounts and ISR assignments
          </p>
        </div>
        <AddButton href="/settings/customers/new">
          <Plus className="h-4 w-4" />
          Add Customer
        </AddButton>
      </div>

      {/* Customers Table */}
      <div style={{ paddingLeft: '48px', paddingRight: '24px' }}>
        <CustomersTable customers={customers || []} />
      </div>
    </div>
  )
}
