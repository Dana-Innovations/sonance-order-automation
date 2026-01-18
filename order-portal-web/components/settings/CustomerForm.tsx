'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/types/database'

type Customer = Tables<'customers'>
type CSR = {
  email: string
  first_name: string
  last_name: string
}

type CustomerFormProps = {
  mode: 'create' | 'edit'
  customer?: Customer
  csrs: CSR[]
  userId: string
}

export function CustomerForm({
  mode,
  customer,
  csrs,
  userId
}: CustomerFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    ps_customer_id: customer?.ps_customer_id || '',
    customer_name: customer?.customer_name || '',
    sender_email: customer?.sender_email || '',
    csr_id: customer?.csr_id || '',
    is_active: customer?.is_active ?? true,
    order_line_prompt: customer?.order_line_prompt || '',
    order_header_prompt: customer?.order_header_prompt || '',
    MultiAccount_Prompt: customer?.MultiAccount_Prompt || '',
    sharepoint_folder_id: customer?.sharepoint_folder_id || '',
  })

  // Auto-resize textareas on mount
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea')
    textareas.forEach((textarea) => {
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    })
  }, [])

  const validateEmailUniqueness = async (emailString: string): Promise<string | null> => {
    if (!emailString || !emailString.trim()) {
      return null // No validation needed for empty emails
    }

    // Split by semicolon and trim each email
    const emails = emailString
      .split(';')
      .map(email => email.trim())
      .filter(email => email.length > 0)

    if (emails.length === 0) {
      return null
    }

    // Check each email against all other customers
    for (const email of emails) {
      // Query all customers except the current one (in edit mode)
      let query = supabase
        .from('customers')
        .select('ps_customer_id, customer_name, sender_email')

      // In edit mode, exclude the current customer from the check
      if (mode === 'edit' && customer) {
        query = query.neq('ps_customer_id', customer.ps_customer_id)
      }

      const { data: otherCustomers, error: queryError } = await query

      if (queryError) {
        console.error('Error checking email uniqueness:', queryError)
        return 'Error validating email addresses. Please try again.'
      }

      // Check if this email exists in any other customer's sender_email list
      if (otherCustomers) {
        for (const otherCustomer of otherCustomers) {
          if (otherCustomer.sender_email) {
            // Split the other customer's emails and check for match (case-insensitive)
            const otherEmails = otherCustomer.sender_email
              .split(';')
              .map(e => e.trim().toLowerCase())
              .filter(e => e.length > 0)

            if (otherEmails.includes(email.toLowerCase())) {
              return `Email "${email}" is already associated with customer "${otherCustomer.customer_name}" (${otherCustomer.ps_customer_id}). Each email can only be associated with one customer.`
            }
          }
        }
      }
    }

    return null // No duplicates found
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      if (mode === 'create') {
        // Validate ps_customer_id is provided
        if (!formData.ps_customer_id.trim()) {
          throw new Error('PS Customer ID is required')
        }
      }

      // Validate email uniqueness
      const emailValidationError = await validateEmailUniqueness(formData.sender_email)
      if (emailValidationError) {
        throw new Error(emailValidationError)
      }

      if (mode === 'create') {
        const { error: insertError } = await supabase
          .from('customers')
          .insert({
            ps_customer_id: formData.ps_customer_id,
            customer_name: formData.customer_name,
            sender_email: formData.sender_email || null,
            csr_id: formData.csr_id || null,
            is_active: formData.is_active,
            order_line_prompt: formData.order_line_prompt || null,
            order_header_prompt: formData.order_header_prompt || null,
            MultiAccount_Prompt: formData.MultiAccount_Prompt || null,
            sharepoint_folder_id: formData.sharepoint_folder_id || null,
          })

        if (insertError) throw insertError
      } else {
        // Edit mode
        if (!customer) throw new Error('Customer not found')

        const { error: updateError } = await supabase
          .from('customers')
          .update({
            customer_name: formData.customer_name,
            sender_email: formData.sender_email || null,
            csr_id: formData.csr_id || null,
            is_active: formData.is_active,
            order_line_prompt: formData.order_line_prompt || null,
            order_header_prompt: formData.order_header_prompt || null,
            MultiAccount_Prompt: formData.MultiAccount_Prompt || null,
            sharepoint_folder_id: formData.sharepoint_folder_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('ps_customer_id', customer.ps_customer_id)

        if (updateError) throw updateError
      }

      router.push('/settings/customers')
      router.refresh()
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === 'create' ? 'create' : 'save'} customer`)
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Action buttons in header */}
      <div className="flex items-center justify-end gap-3" style={{ position: 'relative', top: '-68px', marginBottom: '-44px', marginRight: '24px' }}>
        <button
          onClick={handleSave}
          disabled={isSaving || !formData.customer_name || (mode === 'create' && !formData.ps_customer_id)}
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
            if (!isSaving && formData.customer_name && (mode === 'edit' || formData.ps_customer_id)) {
              e.currentTarget.style.backgroundColor = '#00A3E1'
              e.currentTarget.style.color = 'white'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#00A3E1'
          }}
        >
          {isSaving ? 'Saving...' : mode === 'create' ? 'Create Customer' : 'Save Changes'}
        </button>
        <button
          onClick={() => router.push('/settings/customers')}
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
      <div className="rounded-md shadow-sm border border-gray-200 bg-white p-6 space-y-6" style={{ marginTop: '0px', marginLeft: '48px', width: '75%' }}>
        {error && (
          <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#fee', border: '3px solid #dc2626' }}>
            <p style={{ color: '#dc2626', fontWeight: '700', fontSize: '14px', lineHeight: '1.5' }}>
              ⚠️ {error}
            </p>
          </div>
        )}

      {/* PS Customer ID field */}
      <div className="pb-4 border-b border-gray-200">
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
            PS Customer ID
          </label>
          <input
            type="text"
            value={formData.ps_customer_id}
            onChange={(e) => setFormData({ ...formData, ps_customer_id: e.target.value })}
            disabled={mode === 'edit'}
            className={`w-full rounded-lg border border-gray-300 px-5 py-4 text-[#333F48] ${
              mode === 'edit'
                ? 'bg-gray-50 cursor-not-allowed'
                : 'bg-white focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20'
            }`}
            style={{ fontSize: '16px', borderRadius: '7.25px' }}
            placeholder={mode === 'create' ? 'Enter PS Customer ID' : ''}
            required
          />
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-4" style={{ paddingTop: '16px' }}>
        <div className="grid grid-cols-2" style={{ gap: '48px' }}>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Customer Name
            </label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '7.25px' }}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Sender Email
            </label>
            <input
              type="text"
              value={formData.sender_email}
              onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '7.25px' }}
              placeholder="email1@example.com; email2@example.com"
            />
            <p className="text-xs text-[#6b7a85]" style={{ marginTop: '2px' }}>
              Separate multiple emails with semicolons
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '48px', marginTop: '12px' }}>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Assigned ISR
            </label>
            <select
              value={formData.csr_id}
              onChange={(e) => setFormData({ ...formData, csr_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '7.25px' }}
            >
              <option value="">Unassigned</option>
              {csrs.map((csr) => (
                <option key={csr.email} value={csr.email}>
                  {csr.first_name} {csr.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              SharePoint Folder ID
            </label>
            <input
              type="text"
              value={formData.sharepoint_folder_id}
              onChange={(e) => setFormData({ ...formData, sharepoint_folder_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '7.25px' }}
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

        <div className="pt-4 border-t border-gray-200" style={{ marginTop: '24px' }}>
          <h3 className="text-sm font-semibold text-[#333F48] mb-4">AI Prompts</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                Order Line Prompt
              </label>
              <textarea
                value={formData.order_line_prompt}
                onChange={(e) => {
                  setFormData({ ...formData, order_line_prompt: e.target.value })
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
                style={{ fontSize: '16px', minHeight: '100px', overflow: 'hidden', resize: 'vertical', borderRadius: '7.25px' }}
                placeholder="AI prompt for processing order line items"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                Order Header Prompt
              </label>
              <textarea
                value={formData.order_header_prompt}
                onChange={(e) => {
                  setFormData({ ...formData, order_header_prompt: e.target.value })
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
                style={{ fontSize: '16px', minHeight: '100px', overflow: 'hidden', resize: 'vertical', borderRadius: '7.25px' }}
                placeholder="AI prompt for processing order headers"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                Multi-Account Prompt
              </label>
              <textarea
                value={formData.MultiAccount_Prompt}
                onChange={(e) => {
                  setFormData({ ...formData, MultiAccount_Prompt: e.target.value })
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
                style={{ fontSize: '16px', minHeight: '100px', overflow: 'hidden', resize: 'vertical', borderRadius: '7.25px' }}
                placeholder="AI prompt for multi-account scenarios"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
