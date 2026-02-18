'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/types/database'
import { createPortal } from 'react-dom'
import { ChildAccountsManagement } from './ChildAccountsManagement'

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
    Folder_ID_Proc: customer?.Folder_ID_Proc || '',
    default_carrier: customer?.default_carrier || '',
    default_ship_via: customer?.default_ship_via || '',
    default_shipto_name: customer?.default_shipto_name || '',
  })

  // Copy prompts modal state
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [copyOptions, setCopyOptions] = useState({
    order_line_prompt: false,
    order_header_prompt: false,
    MultiAccount_Prompt: false,
  })
  const [isMounted, setIsMounted] = useState(false)

  // Carriers and ship via options
  const [carriers, setCarriers] = useState<{ carrier_id: string; carrier_descr: string }[]>([])
  const [shipViaOptions, setShipViaOptions] = useState<{ ship_via_code: string; ship_via_desc: string }[]>([])

  // Multi-account toggle state
  const [isMultiAccount, setIsMultiAccount] = useState(customer?.ps_customer_id === 'MULTI')

  // Track if component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Handle multi-account toggle
  const handleMultiAccountToggle = (enabled: boolean) => {
    setIsMultiAccount(enabled)
    if (enabled) {
      setFormData({ ...formData, ps_customer_id: 'MULTI' })
    } else {
      setFormData({ ...formData, ps_customer_id: '' })
    }
  }

  // Fetch carriers on mount
  useEffect(() => {
    const fetchCarriers = async () => {
      const { data, error } = await supabase
        .from('carriers')
        .select('carrier_id, carrier_descr')
        .eq('is_active', true)
        .order('carrier_id')

      if (error) {
        console.error('Error fetching carriers:', error)
        return
      }

      // Get unique carriers
      const uniqueCarriers = Array.from(
        new Map(data.map(item => [item.carrier_id, item])).values()
      )

      setCarriers(uniqueCarriers)
    }

    fetchCarriers()
  }, [])

  // Fetch ship via options when carrier is selected
  useEffect(() => {
    const fetchShipViaOptions = async () => {
      if (!formData.default_carrier) {
        setShipViaOptions([])
        return
      }

      const { data, error } = await supabase
        .from('carriers')
        .select('ship_via_code, ship_via_desc')
        .eq('carrier_id', formData.default_carrier)
        .order('ship_via_code')

      if (error) {
        console.error('Error fetching ship via options:', error)
        return
      }

      setShipViaOptions(data || [])
    }

    fetchShipViaOptions()
  }, [formData.default_carrier])

  // Auto-resize textareas on mount and when data changes
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea')
    textareas.forEach((textarea) => {
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    })
  }, [formData.order_line_prompt, formData.order_header_prompt, formData.MultiAccount_Prompt])

  // Fetch customers for copy modal
  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('customer_name', { ascending: true })

    if (error) {
      console.error('Error fetching customers:', error)
      return
    }

    setCustomers(data || [])
  }

  // Handle opening copy modal
  const handleOpenCopyModal = async () => {
    try {
      await fetchCustomers()
      setShowCopyModal(true)
    } catch (error) {
      console.error('Error opening copy modal:', error)
    }
  }

  // Handle copying prompts
  const handleCopyPrompts = () => {
    const selectedCustomer = customers.find(c => c.ps_customer_id === selectedCustomerId)
    if (!selectedCustomer) return

    const updates: any = {}
    if (copyOptions.order_line_prompt) {
      updates.order_line_prompt = selectedCustomer.order_line_prompt || ''
    }
    if (copyOptions.order_header_prompt) {
      updates.order_header_prompt = selectedCustomer.order_header_prompt || ''
    }
    if (copyOptions.MultiAccount_Prompt) {
      updates.MultiAccount_Prompt = selectedCustomer.MultiAccount_Prompt || ''
    }

    setFormData({ ...formData, ...updates })
    setShowCopyModal(false)
    setSelectedCustomerId('')
    setCopyOptions({
      order_line_prompt: false,
      order_header_prompt: false,
      MultiAccount_Prompt: false,
    })
  }

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
      // Validate required fields
      if (!formData.ps_customer_id.trim()) {
        throw new Error('PeopleSoft Customer ID is required')
      }
      if (!formData.customer_name.trim()) {
        throw new Error('Customer Name is required')
      }
      if (!formData.sender_email.trim()) {
        throw new Error('Sender Email is required')
      }
      if (!formData.csr_id.trim()) {
        throw new Error('Assigned ISR is required')
      }
      if (!formData.sharepoint_folder_id.trim()) {
        throw new Error('SharePoint Folder ID is required')
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
            sender_email: formData.sender_email,
            csr_id: formData.csr_id,
            is_active: formData.is_active,
            order_line_prompt: formData.order_line_prompt || null,
            order_header_prompt: formData.order_header_prompt || null,
            MultiAccount_Prompt: formData.MultiAccount_Prompt || null,
            sharepoint_folder_id: formData.sharepoint_folder_id,
            Folder_ID_Proc: formData.Folder_ID_Proc || null,
            default_carrier: formData.default_carrier || null,
            default_ship_via: formData.default_ship_via || null,
            default_shipto_name: formData.default_shipto_name || null,
          })

        if (insertError) throw insertError
      } else {
        // Edit mode
        if (!customer) throw new Error('Customer not found')

        const { error: updateError } = await supabase
          .from('customers')
          .update({
            customer_name: formData.customer_name,
            sender_email: formData.sender_email,
            csr_id: formData.csr_id,
            is_active: formData.is_active,
            order_line_prompt: formData.order_line_prompt || null,
            order_header_prompt: formData.order_header_prompt || null,
            MultiAccount_Prompt: formData.MultiAccount_Prompt || null,
            sharepoint_folder_id: formData.sharepoint_folder_id,
            Folder_ID_Proc: formData.Folder_ID_Proc || null,
            default_carrier: formData.default_carrier || null,
            default_ship_via: formData.default_ship_via || null,
            default_shipto_name: formData.default_shipto_name || null,
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
      {/* Form content */}
      <div className="rounded-md shadow-sm border border-gray-200 bg-white p-6 space-y-6" style={{ marginTop: '0px', marginLeft: '48px', width: '75%' }}>
      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3" style={{ marginBottom: '16px' }}>
        <button
          onClick={handleSave}
          disabled={isSaving || !formData.customer_name || !formData.ps_customer_id || !formData.sender_email || !formData.csr_id || !formData.sharepoint_folder_id}
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
            if (!isSaving && formData.customer_name && formData.ps_customer_id && formData.sender_email && formData.csr_id && formData.sharepoint_folder_id) {
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
        {error && (
          <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#fee', border: '3px solid #dc2626' }}>
            <p style={{ color: '#dc2626', fontWeight: '700', fontSize: '14px', lineHeight: '1.5' }}>
              ⚠️ {error}
            </p>
          </div>
        )}

      {/* Customer Configuration Toggles */}
      <div className="pb-4 border-b border-gray-200">
        <div className="grid grid-cols-2" style={{ gap: '48px' }}>
          {/* Multi-Account Toggle - Only show in edit mode */}
          {mode === 'edit' && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer" style={{ marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={isMultiAccount}
                  onChange={(e) => handleMultiAccountToggle(e.target.checked)}
                  className="rounded cursor-pointer"
                  style={{
                    width: '20px',
                    height: '20px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    border: '2px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: isMultiAccount ? '#00A3E1' : 'white',
                    backgroundImage: isMultiAccount ? "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E\")" : 'none',
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
                <span className="text-sm text-[#333F48] font-medium">Multi-Account Customer</span>
              </label>
              <p className="text-xs text-[#6b7a85] ml-6">
                {isMultiAccount
                  ? 'Multiple PeopleSoft account IDs. Add at least 2 child accounts below.'
                  : 'Enable for multi-territory customers.'}
              </p>
            </div>
          )}

          {/* Customer Status Toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer" style={{ marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded cursor-pointer"
                style={{
                  width: '20px',
                  height: '20px',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  border: '2px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: formData.is_active ? '#00A3E1' : 'white',
                  backgroundImage: formData.is_active ? "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E\")" : 'none',
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />
              <span className="text-sm text-[#333F48] font-medium">Customer Status = Active</span>
            </label>
            <p className="text-xs text-[#6b7a85] ml-6">Checked = Active, Unchecked = Inactive</p>
          </div>
        </div>
      </div>

      {/* Info message for create mode if they enter MULTI */}
      {mode === 'create' && formData.ps_customer_id.toUpperCase() === 'MULTI' && (
        <div className="pb-4 border-b border-gray-200">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-blue-800">
              💡 <strong>Multi-Account Customer:</strong> After creating this customer, you'll be able to add child PeopleSoft account IDs. You must add at least 2 child accounts.
            </p>
          </div>
        </div>
      )}

      {/* PS Customer ID field */}
      <div className="pb-4 border-b border-gray-200">
        <div className="grid grid-cols-2" style={{ gap: '48px' }}>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              PEOPLESOFT CUSTOMER ID <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.ps_customer_id}
              onChange={(e) => setFormData({ ...formData, ps_customer_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{
                fontSize: '16px',
                borderRadius: '7.25px',
                backgroundColor: isMultiAccount ? '#f3f4f6' : 'white',
                cursor: isMultiAccount ? 'not-allowed' : 'text'
              }}
              placeholder={isMultiAccount ? 'MULTI (auto-set)' : 'Enter PS Customer ID'}
              required
              readOnly={isMultiAccount}
              disabled={isMultiAccount}
            />
            {isMultiAccount && (
              <p className="text-xs text-[#6b7a85] mt-1">
                Auto-set to MULTI for multi-account customers
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Customer Name <span style={{ color: '#dc2626' }}>*</span>
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
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-4" style={{ paddingTop: '16px' }}>
        <div className="grid grid-cols-2" style={{ gap: '48px' }}>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Sender Email <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.sender_email}
              onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '7.25px' }}
              placeholder="email1@example.com; email2@example.com"
              required
            />
            <p className="text-xs text-[#6b7a85]" style={{ marginTop: '2px' }}>
              Separate multiple emails with semicolons
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              SharePoint Folder ID <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.sharepoint_folder_id}
              onChange={(e) => setFormData({ ...formData, sharepoint_folder_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '7.25px' }}
              placeholder="Enter SharePoint Folder ID"
              required
            />
            <p className="text-xs text-[#6b7a85]" style={{ marginTop: '2px' }}>
              Navigate to <a href="https://danainnovations.sharepoint.com/sites/SonanceOrderManagementAutomation/Shared%20Documents/Forms/AllItems.aspx" target="_blank" rel="noopener noreferrer" className="text-[#00A3E1] hover:underline">PDF Order Storage</a> to setup folder
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '48px', marginTop: '12px' }}>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Assigned ISR <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={formData.csr_id}
              onChange={(e) => setFormData({ ...formData, csr_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '7.25px' }}
              required
            >
              <option value="">-- Select an ISR --</option>
              {csrs.map((csr) => (
                <option key={csr.email} value={csr.email}>
                  {csr.first_name} {csr.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
              Email Processed Folder
            </label>
            <textarea
              value={formData.Folder_ID_Proc}
              onChange={(e) => setFormData({ ...formData, Folder_ID_Proc: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
              style={{ fontSize: '16px', borderRadius: '7.25px', resize: 'none', height: '98px' }}
              placeholder="Enter Exchange folder ID"
            />
          </div>
        </div>

        {/* Default Values Section */}
        <div className="pt-4 border-t border-gray-200" style={{ marginTop: '24px' }}>
          <h3 className="text-sm font-semibold text-[#333F48] mb-4">Default Order Values</h3>

          <div className="grid grid-cols-2" style={{ gap: '48px' }}>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                Default Carrier
              </label>
              <select
                value={formData.default_carrier}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    default_carrier: e.target.value,
                    default_ship_via: '' // Reset ship via when carrier changes
                  })
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
                style={{ fontSize: '16px', borderRadius: '7.25px' }}
              >
                <option value="">-- Select Carrier --</option>
                {carriers.map((carrier) => (
                  <option key={carrier.carrier_id} value={carrier.carrier_id}>
                    {carrier.carrier_id} - {carrier.carrier_descr}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#6b7a85]" style={{ marginTop: '2px' }}>
                Default carrier for new orders
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                Default Ship Via
              </label>
              <select
                value={formData.default_ship_via}
                onChange={(e) => setFormData({ ...formData, default_ship_via: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
                style={{ fontSize: '16px', borderRadius: '7.25px' }}
                disabled={!formData.default_carrier}
              >
                <option value="">-- Select Ship Via --</option>
                {shipViaOptions.map((option) => (
                  <option key={option.ship_via_code} value={option.ship_via_code}>
                    {option.ship_via_code} - {option.ship_via_desc}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#6b7a85]" style={{ marginTop: '2px' }}>
                Default ship via for new orders
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2" style={{ gap: '48px', marginTop: '12px' }}>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                Default Ship To Name
              </label>
              <input
                type="text"
                value={formData.default_shipto_name}
                onChange={(e) => setFormData({ ...formData, default_shipto_name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20"
                style={{ fontSize: '16px', borderRadius: '7.25px' }}
                placeholder="Enter default ship-to name"
              />
              <p className="text-xs text-[#6b7a85]" style={{ marginTop: '2px' }}>
                Default ship-to name for new orders
              </p>
            </div>

            <div></div>
          </div>
        </div>

        {/* Child Accounts Management - Show for multi-account customers */}
        {isMultiAccount && mode === 'edit' && formData.ps_customer_id === 'MULTI' && customer && (
          <ChildAccountsManagement
            customerId={customer.customer_id}
            isEditMode={mode === 'edit'}
          />
        )}

        <div className="pt-4 border-t border-gray-200" style={{ marginTop: '24px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#333F48]">AI Prompts</h3>
            <button
              type="button"
              onClick={handleOpenCopyModal}
              className="py-1.5 text-xs font-medium transition-colors"
              style={{
                border: '1px solid #00A3E1',
                borderRadius: '20px',
                backgroundColor: 'white',
                color: '#00A3E1',
                paddingLeft: '16px',
                paddingRight: '16px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = '#00A3E1'
              }}
            >
              Copy from Another Customer
            </button>
          </div>

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

            <div style={{ marginTop: '24px' }}>
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

            <div style={{ marginTop: '24px' }}>
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

    {/* Copy Prompts Modal */}
    {isMounted && showCopyModal && createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowCopyModal(false)}>
        <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '525px', maxWidth: '90vw', maxHeight: '80vh', backgroundColor: 'white', border: '1px solid #00A3E1', position: 'relative', top: '-5vh' }} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="border-b border-gray-300" style={{ backgroundColor: 'white', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '32px', paddingRight: '32px' }}>
            <h2 className="font-semibold" style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>
              Copy AI Prompts
            </h2>
            <p style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
              Select a customer and choose which prompts to copy
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto" style={{ paddingTop: '16px', paddingBottom: '32px', paddingLeft: '32px', paddingRight: '32px' }}>
            <div className="space-y-4">
              {/* Customer Selection */}
              <div>
                <label className="block font-medium text-[#333F48] uppercase tracking-wider" style={{ fontSize: '13px', marginBottom: '8px' }}>
                  Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                  style={{ fontSize: '13px' }}
                >
                  <option value="">-- Select a customer --</option>
                  {customers.map((c) => (
                    <option key={c.ps_customer_id} value={c.ps_customer_id}>
                      {c.customer_name} ({c.ps_customer_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Prompt Selection Checkboxes */}
              <div style={{ marginTop: '24px' }}>
                <label className="block font-medium text-[#333F48] uppercase tracking-wider" style={{ fontSize: '13px', marginBottom: '12px' }}>
                  Prompts to Copy
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copyOptions.order_line_prompt}
                      onChange={(e) => setCopyOptions({ ...copyOptions, order_line_prompt: e.target.checked })}
                      className="rounded border-gray-300 text-[#00A3E1] focus:ring-[#00A3E1]"
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span className="text-[#333F48]" style={{ fontSize: '13px' }}>Order Line Prompt</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copyOptions.order_header_prompt}
                      onChange={(e) => setCopyOptions({ ...copyOptions, order_header_prompt: e.target.checked })}
                      className="rounded border-gray-300 text-[#00A3E1] focus:ring-[#00A3E1]"
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span className="text-[#333F48]" style={{ fontSize: '13px' }}>Order Header Prompt</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copyOptions.MultiAccount_Prompt}
                      onChange={(e) => setCopyOptions({ ...copyOptions, MultiAccount_Prompt: e.target.checked })}
                      className="rounded border-gray-300 text-[#00A3E1] focus:ring-[#00A3E1]"
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span className="text-[#333F48]" style={{ fontSize: '13px' }}>Multi-Account Prompt</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-300 flex justify-center" style={{ backgroundColor: 'white', paddingTop: '20px', paddingBottom: '20px', gap: '20px' }}>
            <button
              type="button"
              onClick={() => {
                setShowCopyModal(false)
                setSelectedCustomerId('')
                setCopyOptions({
                  order_line_prompt: false,
                  order_header_prompt: false,
                  MultiAccount_Prompt: false,
                })
              }}
              className="font-medium transition-colors"
              style={{
                border: '1px solid #00A3E1',
                borderRadius: '20px',
                backgroundColor: 'white',
                color: '#00A3E1',
                paddingLeft: '20px',
                paddingRight: '20px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '9px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = '#00A3E1'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCopyPrompts}
              disabled={!selectedCustomerId || (!copyOptions.order_line_prompt && !copyOptions.order_header_prompt && !copyOptions.MultiAccount_Prompt)}
              className="font-medium transition-colors"
              style={{
                border: '1px solid #00A3E1',
                borderRadius: '20px',
                backgroundColor: !selectedCustomerId || (!copyOptions.order_line_prompt && !copyOptions.order_header_prompt && !copyOptions.MultiAccount_Prompt) ? '#ccc' : '#00A3E1',
                color: 'white',
                paddingLeft: '20px',
                paddingRight: '20px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '9px',
                cursor: !selectedCustomerId || (!copyOptions.order_line_prompt && !copyOptions.order_header_prompt && !copyOptions.MultiAccount_Prompt) ? 'not-allowed' : 'pointer',
                opacity: !selectedCustomerId || (!copyOptions.order_line_prompt && !copyOptions.order_header_prompt && !copyOptions.MultiAccount_Prompt) ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (selectedCustomerId && (copyOptions.order_line_prompt || copyOptions.order_header_prompt || copyOptions.MultiAccount_Prompt)) {
                  e.currentTarget.style.backgroundColor = '#008bc4'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCustomerId && (copyOptions.order_line_prompt || copyOptions.order_header_prompt || copyOptions.MultiAccount_Prompt)) {
                  e.currentTarget.style.backgroundColor = '#00A3E1'
                }
              }}
            >
              Copy Prompts
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  )
}
