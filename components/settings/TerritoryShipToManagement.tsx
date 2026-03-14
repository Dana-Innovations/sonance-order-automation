'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createPortal } from 'react-dom'
import { Trash2, Edit, Plus } from 'lucide-react'

interface TerritoryShipTo {
  id: string
  parent_ps_customer_id: string
  shipto_ps_customer_id: string
  city: string
  state: string
  country_code: string | null
  description: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

interface TerritoryShipToManagementProps {
  customerId: string
  customerName?: string
  isEditMode: boolean
}

export function TerritoryShipToManagement({ customerId, customerName, isEditMode }: TerritoryShipToManagementProps) {
  const supabase = createClient()
  const [territoryShipTos, setTerritoryShipTos] = useState<TerritoryShipTo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedTerritoryShipTo, setSelectedTerritoryShipTo] = useState<TerritoryShipTo | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    shipto_ps_customer_id: '',
    city: '',
    state: '',
    country_code: 'USA',
    description: ''
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch territory ship-to records
  const fetchTerritoryShipTos = async () => {
    if (!isEditMode) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customer_territory_shipto')
        .select('*')
        .eq('parent_ps_customer_id', customerId)
        .order('state, city')

      if (error) {
        console.error('Error fetching territory ship-to records:', error)
      } else {
        setTerritoryShipTos(data || [])
      }
    } catch (error) {
      console.error('Error fetching territory ship-to records:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isEditMode && customerId) {
      fetchTerritoryShipTos()
    }
  }, [customerId, isEditMode])

  const handleAdd = () => {
    setFormData({
      shipto_ps_customer_id: '',
      city: '',
      state: '',
      country_code: 'USA',
      description: ''
    })
    setFormError(null)
    setShowAddModal(true)
  }

  const handleEdit = (territoryShipTo: TerritoryShipTo) => {
    setSelectedTerritoryShipTo(territoryShipTo)
    setFormData({
      shipto_ps_customer_id: territoryShipTo.shipto_ps_customer_id,
      city: territoryShipTo.city,
      state: territoryShipTo.state,
      country_code: territoryShipTo.country_code || 'USA',
      description: territoryShipTo.description || ''
    })
    setFormError(null)
    setShowEditModal(true)
  }

  const handleDelete = (territoryShipTo: TerritoryShipTo) => {
    setSelectedTerritoryShipTo(territoryShipTo)
    setShowDeleteModal(true)
  }

  const handleSaveAdd = async () => {
    setFormError(null)

    // Validation
    if (!formData.shipto_ps_customer_id.trim()) {
      setFormError('Ship-To Customer ID is required')
      return
    }
    if (!formData.city.trim()) {
      setFormError('City is required')
      return
    }
    if (!formData.state.trim()) {
      setFormError('State is required')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('customer_territory_shipto')
        .insert({
          parent_ps_customer_id: customerId,
          shipto_ps_customer_id: formData.shipto_ps_customer_id.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          country_code: formData.country_code,
          description: formData.description.trim() || null,
          is_active: true
        })

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setFormError('A territory ship-to already exists for this city/state/country combination')
        } else {
          setFormError(error.message || 'Failed to add territory ship-to')
        }
      } else {
        await fetchTerritoryShipTos()
        setShowAddModal(false)
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to add territory ship-to')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedTerritoryShipTo) return

    setFormError(null)

    // Validation
    if (!formData.shipto_ps_customer_id.trim()) {
      setFormError('Ship-To Customer ID is required')
      return
    }
    if (!formData.city.trim()) {
      setFormError('City is required')
      return
    }
    if (!formData.state.trim()) {
      setFormError('State is required')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('customer_territory_shipto')
        .update({
          shipto_ps_customer_id: formData.shipto_ps_customer_id.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          country_code: formData.country_code,
          description: formData.description.trim() || null
        })
        .eq('id', selectedTerritoryShipTo.id)

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setFormError('A territory ship-to already exists for this city/state/country combination')
        } else {
          setFormError(error.message || 'Failed to update territory ship-to')
        }
      } else {
        await fetchTerritoryShipTos()
        setShowEditModal(false)
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to update territory ship-to')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedTerritoryShipTo) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('customer_territory_shipto')
        .delete()
        .eq('id', selectedTerritoryShipTo.id)

      if (error) {
        alert(error.message || 'Failed to delete territory ship-to')
      } else {
        await fetchTerritoryShipTos()
        setShowDeleteModal(false)
      }
    } catch (error: any) {
      alert(error.message || 'Failed to delete territory ship-to')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditMode) {
    return null
  }

  if (loading) {
    return (
      <div className="pt-4 border-t border-gray-200" style={{ marginTop: '24px' }}>
        <h3 className="text-sm font-semibold text-[#333F48] mb-4">Territory Ship-To Accounts</h3>
        <p className="text-xs text-[#6b7a85]">Loading territory ship-to accounts...</p>
      </div>
    )
  }

  return (
    <>
      <div className="pt-4 border-t border-gray-200" style={{ marginTop: '24px' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#333F48]">Territory Ship-To Accounts</h3>
            <p className="text-xs text-[#6b7a85] mt-1">
              Manage ship-to customer IDs based on shipping address
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
            Add Ship-To Account
          </button>
        </div>

        {territoryShipTos.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-[#6b7a85]">No territory ship-to accounts configured</p>
            <p className="text-xs text-[#999] mt-1">Click "Add Ship-To Account" to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg bg-white">
              <thead style={{ backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th className="text-xs font-semibold text-[#6b7a85] uppercase tracking-wider px-4 py-3 text-left border-b border-gray-200">
                    Ship-To Cust ID
                  </th>
                  <th className="text-xs font-semibold text-[#6b7a85] uppercase tracking-wider px-4 py-3 text-left border-b border-gray-200">
                    City
                  </th>
                  <th className="text-xs font-semibold text-[#6b7a85] uppercase tracking-wider px-4 py-3 text-left border-b border-gray-200">
                    State
                  </th>
                  <th className="text-xs font-semibold text-[#6b7a85] uppercase tracking-wider px-4 py-3 text-left border-b border-gray-200">
                    Country
                  </th>
                  <th className="text-xs font-semibold text-[#6b7a85] uppercase tracking-wider px-4 py-3 text-left border-b border-gray-200">
                    Description
                  </th>
                  <th className="text-xs font-semibold text-[#6b7a85] uppercase tracking-wider px-4 py-3 text-left border-b border-gray-200">
                    Active
                  </th>
                  <th className="text-xs font-semibold text-[#6b7a85] uppercase tracking-wider px-4 py-3 text-center border-b border-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {territoryShipTos.map((territoryShipTo) => (
                  <tr key={territoryShipTo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-[#333F48] font-medium border-b border-gray-100">
                      {territoryShipTo.shipto_ps_customer_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#333F48] border-b border-gray-100">
                      {territoryShipTo.city}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#333F48] border-b border-gray-100">
                      {territoryShipTo.state}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#333F48] border-b border-gray-100">
                      {territoryShipTo.country_code || 'USA'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6b7a85] border-b border-gray-100">
                      {territoryShipTo.description || '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      {territoryShipTo.is_active ? (
                        <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-600 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-600 rounded">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(territoryShipTo)}
                          className="text-xs font-medium transition-colors flex items-center gap-1"
                          style={{
                            border: '1px solid #00A3E1',
                            borderRadius: '20px',
                            backgroundColor: 'white',
                            color: '#00A3E1',
                            paddingTop: '4px',
                            paddingBottom: '4px',
                            paddingLeft: '8px',
                            paddingRight: '8px'
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
                          <Edit size={10} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(territoryShipTo)}
                          className="text-xs font-medium transition-colors flex items-center gap-1"
                          style={{
                            border: '1px solid #dc2626',
                            borderRadius: '20px',
                            backgroundColor: 'white',
                            color: '#dc2626',
                            paddingTop: '4px',
                            paddingBottom: '4px',
                            paddingLeft: '8px',
                            paddingRight: '8px'
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
                          <Trash2 size={10} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            💡 <strong>Auto-populate:</strong> When orders are loaded, the system will automatically set the ship-to customer ID based on the ship-to city/state/country match.
          </p>
        </div>
      </div>

      {/* Add Territory Ship-To Modal */}
      {isMounted && showAddModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowAddModal(false)}>
          <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '600px', maxWidth: '90vw', backgroundColor: 'white', border: '1px solid #00A3E1' }} onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-300" style={{ padding: '20px 32px' }}>
              <h2 className="font-semibold text-[#333F48]" style={{ fontSize: '14px' }}>Add Territory Ship-To Account</h2>
              <p className="text-xs text-[#6b7a85] mt-1">Customer: {customerName || customerId}</p>
            </div>

            <div className="space-y-4" style={{ padding: '32px' }}>
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                    Ship-To Customer ID *
                  </label>
                  <input
                    type="text"
                    value={formData.shipto_ps_customer_id}
                    onChange={(e) => setFormData({ ...formData, shipto_ps_customer_id: e.target.value })}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                    style={{ fontSize: '13px' }}
                    placeholder="e.g., 99999"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                    Country
                  </label>
                  <select
                    value={formData.country_code}
                    onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                    style={{ fontSize: '13px' }}
                  >
                    <option value="USA">USA</option>
                    <option value="CAN">Canada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                    style={{ fontSize: '13px' }}
                    placeholder="e.g., Phoenix"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                    style={{ fontSize: '13px' }}
                    placeholder="e.g., AZ"
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                  style={{ fontSize: '13px', minHeight: '60px' }}
                  placeholder="Optional description of this territory mapping"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-800">
                  💡 Orders shipping to this city/state/country combination will automatically use this ship-to customer ID.
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
                {isSaving ? 'Adding...' : 'Add Ship-To Account'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Territory Ship-To Modal */}
      {isMounted && showEditModal && selectedTerritoryShipTo && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowEditModal(false)}>
          <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '600px', maxWidth: '90vw', backgroundColor: 'white', border: '1px solid #00A3E1' }} onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-300" style={{ padding: '20px 32px' }}>
              <h2 className="font-semibold text-[#333F48]" style={{ fontSize: '14px' }}>Edit Territory Ship-To Account</h2>
              <p className="text-xs text-[#6b7a85] mt-1">Customer: {customerName || customerId}</p>
            </div>

            <div className="space-y-4" style={{ padding: '32px' }}>
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                    Ship-To Customer ID *
                  </label>
                  <input
                    type="text"
                    value={formData.shipto_ps_customer_id}
                    onChange={(e) => setFormData({ ...formData, shipto_ps_customer_id: e.target.value })}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                    Country
                  </label>
                  <select
                    value={formData.country_code}
                    onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                    style={{ fontSize: '13px' }}
                  >
                    <option value="USA">USA</option>
                    <option value="CAN">Canada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                    style={{ fontSize: '13px' }}
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-[#6b7a85] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]"
                  style={{ fontSize: '13px', minHeight: '60px' }}
                />
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
      {isMounted && showDeleteModal && selectedTerritoryShipTo && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowDeleteModal(false)}>
          <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '500px', maxWidth: '90vw', backgroundColor: 'white', border: '1px solid #dc2626' }} onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-300" style={{ padding: '20px 32px' }}>
              <h2 className="font-semibold text-red-600" style={{ fontSize: '14px' }}>Delete Territory Ship-To?</h2>
            </div>

            <div className="space-y-4" style={{ padding: '32px' }}>
              <p className="text-sm text-[#333F48]">
                Are you sure you want to delete this territory ship-to account?
              </p>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <div className="text-xs text-[#333F48] space-y-1">
                  <div><strong>Ship-To ID:</strong> {selectedTerritoryShipTo.shipto_ps_customer_id}</div>
                  <div><strong>Territory:</strong> {selectedTerritoryShipTo.city}, {selectedTerritoryShipTo.state}, {selectedTerritoryShipTo.country_code}</div>
                  {selectedTerritoryShipTo.description && (
                    <div><strong>Description:</strong> {selectedTerritoryShipTo.description}</div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-800">
                  <strong>⚠️ WARNING:</strong> Future orders shipping to this territory will not auto-populate the ship-to customer ID after deletion.
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
                {isSaving ? 'Deleting...' : 'Delete Territory Ship-To'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}