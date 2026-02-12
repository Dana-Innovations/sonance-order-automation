import { CustomerForm } from '@/components/settings/CustomerForm'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'

export default async function CustomerEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('ps_customer_id', id)
    .single()

  if (!customer) notFound()

  // Fetch all active CSRs for the dropdown
  const { data: csrs } = await supabase
    .from('csrs')
    .select('email, first_name, last_name')
    .eq('is_active', true)
    .order('first_name', { ascending: true })

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between" style={{ marginLeft: '24px', marginRight: '24px', paddingTop: '4px', marginBottom: '32px' }}>
        <div style={{ lineHeight: '1.2' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0px' }}>
            <Link href="/settings/customers" className="text-[#6b7a85] hover:text-[#00A3E1] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Building2 className="text-[#00A3E1]" style={{ flexShrink: 0, height: '1.875rem', width: '1.875rem' }} />
            <h1 className="text-2xl font-light tracking-tight text-[#333F48]" style={{ margin: '0px', marginLeft: '8px' }}>
              Edit Customer
            </h1>
          </div>
          <p className="text-sm text-[#6b7a85]" style={{ marginLeft: '48px', marginTop: '2px', marginBottom: '0px' }}>
            {customer.ps_customer_id} - {customer.customer_name}
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <div className="px-6" style={{ maxWidth: '75%' }}>
        <CustomerForm mode="edit" customer={customer} csrs={csrs || []} userId={user.id} />
      </div>
    </div>
  )
}
