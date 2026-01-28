'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createPortal } from 'react-dom'
import { Trash2, Edit, Plus } from 'lucide-react'

interface ChildAccount {
  id: string
  parent_ps_customer_id: string
  child_ps_account_id: string
  routing_description: string
  ai_mapping_instructions: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ChildAccountsManagementProps {
  customerId: string
  isEditMode: boolean
}

export function ChildAccountsManagement({ customerId, isEditMode }: ChildAccountsManagementProps) {
  const supabase = createClient()
  const [childAccounts, setChildAccounts] = useState<ChildAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ChildAccount | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    child_ps_account_id: '',
    routing_description: ''
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch child accounts
  const fetchChildAccounts = async () => {
    if (!isEditMode) return // Only fetch in edit mode

    setLoading(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/child-accounts`)
      const data = await response.json()

      if (data.success) {
        setChildAccounts(data.child_accounts || [])
      } else {
        console.error('Error fetching child accounts:', data.error)
      }
    } catch (error) {
      console.error('Error fetching child accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isEditMode && customerId) {
      fetchChildAccounts()
    }
  }, [customerId, isEditMode])

  const handleAdd = () => {
    setFormData({ child_ps_account_id: '', routing_description: '' })
    setFormError(null)
    setShowAddModal(true)
  }

  const handleEdit = (account: ChildAccount) => {
    setSelectedAccount(account)
    setFormData({
      child_ps_account_id: account.child_ps_account_id,
      routing_description: account.routing_description
    })
    setFormError(null)
    setShowEditModal(true)
  }

  const handleDelete = (account: ChildAccount) => {
    setSelectedAccount(account)
    setShowDeleteModal(true)
  }

  const handleSaveAdd = async () => {
    setFormError(null)

    // Validation
    if (!formData.child_ps_account_id.trim()) {
      setFormError('Child Account ID is required')
      return
    }
    if (!formData.routing_description.trim()) {
      setFormError('AI Mapping is required')
      return
    }
    if (formData.routing_description.length < 20) {
      setFormError('AI Mapping must be at least 20 characters')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/child-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        await fetchChildAccounts()
        setShowAddModal(false)
      } else {
        setFormError(data.error || 'Failed to add child account')
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to add child account')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedAccount) return

    setFormError(null)

    // Validation
    if (!formData.routing_description.trim()) {
      setFormError('AI Mapping is required')
      return
    }
    if (formData.routing_description.length < 20) {
      setFormError('AI Mapping must be at least 20 characters')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/child-accounts/${selectedAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_ps_account_id: formData.child_ps_account_id,
          routing_description: formData.routing_description
        })
      })

      const data = await response.json()

      if (data.success) {
        await fetchChildAccounts()
        setShowEditModal(false)
      } else {
        setFormError(data.error || 'Failed to update child account')
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to update child account')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedAccount) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/child-accounts/${selectedAccount.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        await fetchChildAccounts()
        setShowDeleteModal(false)
        if (data.recent_order_count > 0) {
          alert(`Warning: This account was used in ${data.recent_order_count} recent orders (last 90 days)`)
        }
      } else {
        alert(data.error || 'Failed to delete child account')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to delete child account')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditMode) {
    return null // Only show in edit mode
  }

  if (loading) {
    return (
      <div className="pt-4 border-t border-gray-200" style={{ marginTop: '24px' }}>
        <h3 className="text-sm font-semibold text-[#333F48] mb-4">Multi-Account Configuration</h3>
        <p className="text-xs text-[#6b7a85]">Loading child accounts...</p>
      </div>
    )
  }

  return (
    <>
      <div className="pt-4 border-t border-gray-200" style={{ marginTop: '24px' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#333F48]">Multi-Account Configuration</h3>
            <p className="text-xs text-[#6b7a85] mt-1">
              Manage child PeopleSoft account IDs for this MULTI customer
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="py-1.5 text-xs font-medium transition-colors flex items-center gap-1"
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
            <Plus size={12} />
            Add Child Account
          </button>
        </div>

        {childAccounts.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-[#6b7a85]">No child accounts configured</p>
            <p className="text-xs text-[#999] mt-1">Click "Add Child Account" to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {childAccounts.map((account, index) => (
              <div
                key={account.id}
                className="border border-gray-200 rounded-lg p-4 bg-white hover:border-[#00A3E1] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-[#999] uppercase">Account #{index + 1}</span>
                      {!account.is_active && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Inactive</span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-[#333F48] mb-1">
                      PS Account ID: {account.child_ps_account_id}
                    </div>
                    <div className="text-xs text-[#6b7a85]">
                      <span className="font-medium">Used When:</span> {account.routing_description}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => handleEdit(account)}
                      className="text-xs font-medium transition-colors flex items-center gap-1"
                      style={{
                        border: '1px solid #00A3E1',
                        borderRadius: '20px',
                        backgroundColor: 'white',
                        color: '#00A3E1',
                        paddingTop: '6px',
                        paddingBottom: '6px',
                        paddingLeft: '12px',
                        paddingRight: '12px'
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
                      <Edit size={12} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(account)}
                      className="text-xs font-medium transition-colors flex items-center gap-1"
                      style={{
                        border: '1px solid #dc2626',
                        borderRadius: '20px',
                        backgroundColor: 'white',
                        color: '#dc2626',
                        paddingTop: '6px',
                        paddingBottom: '6px',
                        paddingLeft: '12px',
                        paddingRight: '12px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#dc2626'
                        e.currentTarget.style.color = 'white'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white'
                        e.currentTarget.style.color = '#dc2626'
                      }}
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            💡 <strong>Important:</strong> Changes to child accounts may require regenerating the Multi-Account Routing Prompt to ensure orders route correctly.
          </p>
        </div>
      </div>

      {/* Add Child Account Modal */}
      {isMounted && showAddModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowAddModal(false)}>
          <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '500px', maxWidth: '90vw', backgroundColor: 'white', border: '1px solid #00A3E1' }} onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-300" style={{ padding: '20px 32px' }}>
              <h2 className="font-semibold text-[#333F48]" style={{ fontSize: '14px' }}>Add Child Account</h2>
              <p className="text-xs text-[#6b7a85] mt-1">Customer: {customerId}</p>
            </div>

            <div className="space-y-4" style={{ padding: '32px' }}>
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                  PeopleSoft Account ID *
                </label>
                <input
                  type="text"
                  value={formData.child_ps_account_id}
                  onChange={(e) => setFormData({ ...formData, child_ps_account_id: e.target.value })}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                  style={{ fontSize: '13px', width: '50%' }}
                  placeholder="e.g., 99999"
                />
              </div>

              <div style={{ marginTop: '24px' }}>
                <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                  AI Mapping * (min 20 chars)
                </label>
                <textarea
                  value={formData.routing_description}
                  onChange={(e) => setFormData({ ...formData, routing_description: e.target.value })}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                  style={{ fontSize: '13px', minHeight: '80px' }}
                  placeholder='Describe when to use this account, e.g., "Arizona orders (ship-to state AZ)"'
                />
                <p className="text-xs text-[#999] mt-1">{formData.routing_description.length} / 20 characters</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-800">
                  💡 The AI Mapping is used to tell the LLM when to use this account ID, example, Ship To State = AZ or TX
                </p>
              </div>
            </div>

            <div className="border-t border-gray-300 flex justify-end gap-3" style={{ padding: '20px 32px' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs font-medium transition-colors"
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '20px',
                  backgroundColor: 'white',
                  color: '#333F48',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  paddingLeft: '20px',
                  paddingRight: '20px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAdd}
                className="text-xs font-medium transition-colors"
                style={{
                  border: '1px solid #00A3E1',
                  borderRadius: '20px',
                  backgroundColor: '#00A3E1',
                  color: 'white',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  paddingLeft: '20px',
                  paddingRight: '20px'
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.backgroundColor = '#0088c7'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#00A3E1'
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Adding...' : 'Add Account'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Child Account Modal */}
      {isMounted && showEditModal && selectedAccount && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowEditModal(false)}>
          <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '500px', maxWidth: '90vw', backgroundColor: 'white', border: '1px solid #00A3E1' }} onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-300" style={{ padding: '20px 32px' }}>
              <h2 className="font-semibold text-[#333F48]" style={{ fontSize: '14px' }}>Edit Child Account</h2>
              <p className="text-xs text-[#6b7a85] mt-1">Customer: {customerId}</p>
            </div>

            <div className="space-y-4" style={{ padding: '32px' }}>
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                  PeopleSoft Account ID *
                </label>
                <input
                  type="text"
                  value={formData.child_ps_account_id}
                  onChange={(e) => setFormData({ ...formData, child_ps_account_id: e.target.value })}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                  style={{ fontSize: '13px', width: '50%' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                  AI Mapping * (min 20 chars)
                </label>
                <textarea
                  value={formData.routing_description}
                  onChange={(e) => setFormData({ ...formData, routing_description: e.target.value })}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                  style={{ fontSize: '13px', minHeight: '80px' }}
                />
                <p className="text-xs text-[#999] mt-1">{formData.routing_description.length} / 20 characters</p>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-800">
                  ⚠️ Changes to routing descriptions require regenerating the Multi-Account Routing Prompt.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-300 flex justify-end gap-3" style={{ padding: '20px 32px' }}>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-xs font-medium transition-colors"
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '20px',
                  backgroundColor: 'white',
                  color: '#333F48',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  paddingLeft: '20px',
                  paddingRight: '20px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="text-xs font-medium transition-colors"
                style={{
                  border: '1px solid #00A3E1',
                  borderRadius: '20px',
                  backgroundColor: '#00A3E1',
                  color: 'white',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  paddingLeft: '20px',
                  paddingRight: '20px'
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.backgroundColor = '#0088c7'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#00A3E1'
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {isMounted && showDeleteModal && selectedAccount && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowDeleteModal(false)}>
          <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '500px', maxWidth: '90vw', backgroundColor: 'white', border: '1px solid #dc2626' }} onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-300" style={{ padding: '20px 32px' }}>
              <h2 className="font-semibold text-red-600" style={{ fontSize: '14px' }}>Delete Child Account?</h2>
            </div>

            <div className="space-y-4" style={{ padding: '32px' }}>
              <p className="text-sm text-[#333F48]">
                Are you sure you want to delete this child account?
              </p>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <div className="text-xs text-[#333F48] space-y-1">
                  <div><strong>Account:</strong> {selectedAccount.child_ps_account_id}</div>
                  <div><strong>Used for:</strong> {selectedAccount.routing_description}</div>
                </div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-800">
                  <strong>⚠️ WARNING:</strong> Any orders currently using this account ID may fail to process correctly after deletion. Consider verifying no active orders use this account before deleting.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-300 flex justify-end gap-3" style={{ padding: '20px 32px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-xs font-medium transition-colors"
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '20px',
                  backgroundColor: 'white',
                  color: '#333F48',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  paddingLeft: '20px',
                  paddingRight: '20px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="text-xs font-medium transition-colors"
                style={{
                  border: '1px solid #dc2626',
                  borderRadius: '20px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  paddingLeft: '20px',
                  paddingRight: '20px'
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.backgroundColor = '#b91c1c'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626'
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
