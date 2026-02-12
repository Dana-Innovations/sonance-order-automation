'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/types/database'

type Carrier = Tables<'carriers'>

export function CarrierForm({
  mode,
  carrier,
  userId
}: {
  mode: 'create' | 'edit'
  carrier?: Carrier
  userId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    carrier_id: carrier?.carrier_id || '',
    ship_via_code: carrier?.ship_via_code || '',
    carrier_descr: carrier?.carrier_descr || '',
    ship_via_desc: carrier?.ship_via_desc || '',
    is_active: carrier?.is_active ?? true,
  })

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.carrier_id.trim()) {
        throw new Error('PeopleSoft Carrier ID is required')
      }
      if (!formData.ship_via_code.trim()) {
        throw new Error('PeopleSoft Ship Via Code is required')
      }
      if (!formData.carrier_descr.trim()) {
        throw new Error('Carrier Description is required')
      }
      if (!formData.ship_via_desc.trim()) {
        throw new Error('Ship Via Description is required')
      }

      if (mode === 'create') {
        const { error: insertError } = await supabase
          .from('carriers')
          .insert({
            carrier_id: formData.carrier_id,
            ship_via_code: formData.ship_via_code,
            carrier_descr: formData.carrier_descr,
            ship_via_desc: formData.ship_via_desc,
            is_active: formData.is_active,
          })

        if (insertError) throw insertError
      } else {
        const { error: updateError } = await supabase
          .from('carriers')
          .update({
            carrier_descr: formData.carrier_descr,
            ship_via_desc: formData.ship_via_desc,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('carrier_id', carrier!.carrier_id)
          .eq('ship_via_code', carrier!.ship_via_code)

        if (updateError) throw updateError
      }

      router.push('/settings/carriers')
      router.refresh()
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === 'create' ? 'create' : 'save'} carrier`)
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Action buttons in header */}
      <div className="flex items-center justify-end gap-3" style={{ position: 'relative', top: '-68px', marginBottom: '-44px', marginRight: '24px' }}>
        <button
          onClick={handleSave}
          disabled={isSaving || !formData.carrier_id || !formData.ship_via_code || !formData.carrier_descr || !formData.ship_via_desc}
          className="py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            border: '1px solid #00A3E1',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#00A3E1',
            paddingLeft: '16px',
            paddingRight: '16px'
          }}
          onMouseEnter={(e) => {
            if (!isSaving && formData.carrier_id && formData.ship_via_code && formData.carrier_descr && formData.ship_via_desc) {
              e.currentTarget.style.backgroundColor = '#00A3E1'
              e.currentTarget.style.color = 'white'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#00A3E1'
          }}
        >
          {isSaving ? 'Saving...' : mode === 'create' ? 'Create Carrier' : 'Save Changes'}
        </button>
        <button
          onClick={() => router.push('/settings/carriers')}
          disabled={isSaving}
          className="py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            border: '1px solid #6b7a85',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#6b7a85',
            paddingLeft: '16px',
            paddingRight: '16px'
          }}
          onMouseEnter={(e) => {
            if (!isSaving) {
              e.currentTarget.style.backgroundColor = '#6b7a85'
              e.currentTarget.style.color = 'white'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#6b7a85'
          }}
        >
          Cancel
        </button>
      </div>

      {/* Form content */}
      <div className="rounded-md shadow-sm border border-gray-200 bg-white p-6 space-y-6" style={{ marginTop: '0px', marginLeft: '48px' }}>
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

      {/* Primary Key fields */}
      <div className="pb-4 border-b border-gray-200">
        <div className="grid grid-cols-2" style={{ gap: '48px' }}>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              PeopleSoft Carrier ID <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.carrier_id}
              onChange={(e) => setFormData({ ...formData, carrier_id: e.target.value })}
              disabled={mode === 'edit'}
              className="w-full rounded-lg border border-gray-300 px-5 py-4 text-[#333F48]"
              style={{ fontSize: '16px', backgroundColor: mode === 'edit' ? '#F9FAFB' : 'white', borderRadius: '5px' }}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              PeopleSoft Ship Via Code <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.ship_via_code}
              onChange={(e) => setFormData({ ...formData, ship_via_code: e.target.value })}
              disabled={mode === 'edit'}
              className="w-full rounded-lg border border-gray-300 px-5 py-4 text-[#333F48]"
              style={{ fontSize: '16px', backgroundColor: mode === 'edit' ? '#F9FAFB' : 'white', borderRadius: '5px' }}
              required
            />
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-4" style={{ paddingTop: '16px' }}>
        <div className="grid grid-cols-2" style={{ gap: '48px' }}>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Carrier Description <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.carrier_descr}
              onChange={(e) => setFormData({ ...formData, carrier_descr: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '5px' }}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Ship Via Description <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.ship_via_desc}
              onChange={(e) => setFormData({ ...formData, ship_via_desc: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '5px' }}
              required
            />
          </div>
        </div>

        <div style={{ paddingTop: '16px' }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 text-[#00A3E1] focus:ring-[#00A3E1]"
              style={{ width: '20px', height: '20px' }}
            />
            <span className="text-sm text-[#333F48]">Active</span>
          </label>
          <p className="text-xs text-[#6b7a85] mt-1 ml-6">Checked = Active, Unchecked = Inactive</p>
        </div>
      </div>
    </div>
    </>
  )
}
