'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/types/database'

type CSR = Tables<'csrs'>

export function CSRForm({
  mode,
  csr,
  userId
}: {
  mode: 'create' | 'edit'
  csr?: CSR
  userId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: csr?.email || '',
    first_name: csr?.first_name || '',
    last_name: csr?.last_name || '',
    is_active: csr?.is_active ?? true,
    slack_id: csr?.slack_id || '',
    teams_id: csr?.teams_id || '',
  })

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.email.trim()) {
        throw new Error('Email is required')
      }
      if (!formData.first_name.trim()) {
        throw new Error('First Name is required')
      }
      if (!formData.last_name.trim()) {
        throw new Error('Last Name is required')
      }

      if (mode === 'create') {
        const { error: insertError } = await supabase
          .from('csrs')
          .insert({
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            is_active: formData.is_active,
            slack_id: formData.slack_id || null,
            teams_id: formData.teams_id || null,
          })

        if (insertError) throw insertError
      } else {
        const { error: updateError} = await supabase
          .from('csrs')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            is_active: formData.is_active,
            slack_id: formData.slack_id || null,
            teams_id: formData.teams_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('email', csr!.email)

        if (updateError) throw updateError
      }

      router.push('/settings/csrs')
      router.refresh()
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === 'create' ? 'create' : 'save'} ISR`)
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Action buttons in header */}
      <div className="flex items-center justify-end gap-3" style={{ position: 'relative', top: '-68px', marginBottom: '-44px', marginRight: '24px' }}>
        <button
          onClick={handleSave}
          disabled={isSaving || !formData.email || !formData.first_name || !formData.last_name}
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
            if (!isSaving && formData.email && formData.first_name && formData.last_name) {
              e.currentTarget.style.backgroundColor = '#00A3E1'
              e.currentTarget.style.color = 'white'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#00A3E1'
          }}
        >
          {isSaving ? 'Saving...' : mode === 'create' ? 'Create ISR' : 'Save Changes'}
        </button>
        <button
          onClick={() => router.push('/settings/csrs')}
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

      {/* Email field */}
      <div className="pb-4 border-b border-gray-200">
        <div className="grid grid-cols-2" style={{ gap: '48px' }}>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Email <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={mode === 'edit'}
              className="w-full rounded-lg border border-gray-300 px-5 py-4 text-[#333F48]"
              style={{ fontSize: '16px', backgroundColor: mode === 'edit' ? '#F9FAFB' : 'white', borderRadius: '5px' }}
              required
            />
          </div>
          <div></div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-4" style={{ paddingTop: '16px' }}>
        <div className="grid grid-cols-2" style={{ gap: '48px' }}>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              First Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '5px' }}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Last Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '5px' }}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '48px', marginTop: '24px' }}>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Slack ID
            </label>
            <input
              type="text"
              value={formData.slack_id}
              onChange={(e) => setFormData({ ...formData, slack_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '5px' }}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Teams ID
            </label>
            <input
              type="text"
              value={formData.teams_id}
              onChange={(e) => setFormData({ ...formData, teams_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '5px' }}
              placeholder="Optional"
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
