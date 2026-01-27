'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { Plus, Trash2, GripVertical, ArrowRight } from 'lucide-react'

export function WizardStep3a({ session, onNext, isLoading }: WizardStepProps) {
  const [childAccounts, setChildAccounts] = useState(
    session.child_accounts || [
      { ps_account_id: '', routing_description: '', display_order: 1 },
      { ps_account_id: '', routing_description: '', display_order: 2 }
    ]
  )
  const [errors, setErrors] = useState<{ [key: number]: string }>({})

  const handleAddAccount = () => {
    setChildAccounts([
      ...childAccounts,
      {
        ps_account_id: '',
        routing_description: '',
        display_order: childAccounts.length + 1
      }
    ])
  }

  const handleRemoveAccount = (index: number) => {
    if (childAccounts.length <= 2) return // Minimum 2 accounts
    const newAccounts = childAccounts.filter((_, i) => i !== index)
    // Re-order
    newAccounts.forEach((acc, idx) => {
      acc.display_order = idx + 1
    })
    setChildAccounts(newAccounts)
    // Clear error for this index
    const newErrors = { ...errors }
    delete newErrors[index]
    setErrors(newErrors)
  }

  const handleAccountChange = (index: number, field: 'ps_account_id' | 'routing_description', value: string) => {
    const newAccounts = [...childAccounts]
    newAccounts[index] = {
      ...newAccounts[index],
      [field]: value
    }
    setChildAccounts(newAccounts)

    // Clear error for this index
    if (errors[index]) {
      const newErrors = { ...errors }
      delete newErrors[index]
      setErrors(newErrors)
    }
  }

  const validateAndContinue = async () => {
    const newErrors: { [key: number]: string } = {}

    // Check each account has both fields filled
    childAccounts.forEach((account, index) => {
      if (!account.ps_account_id.trim()) {
        newErrors[index] = 'PS Account ID is required'
      } else if (!account.routing_description.trim()) {
        newErrors[index] = 'Routing description is required'
      }
    })

    // Check for duplicate PS Account IDs
    const accountIds = childAccounts.map(a => a.ps_account_id.trim().toUpperCase())
    const duplicates = accountIds.filter((id, idx) => id && accountIds.indexOf(id) !== idx)
    if (duplicates.length > 0) {
      childAccounts.forEach((account, index) => {
        if (duplicates.includes(account.ps_account_id.trim().toUpperCase())) {
          newErrors[index] = 'Duplicate PS Account ID'
        }
      })
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    await onNext(
      { ps_customer_id: 'MULTI' },
      childAccounts
    )
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
          Multi-Account Configuration
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      {/* PS Customer ID - Read Only */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-300 rounded-lg">
        <div className="text-sm font-medium text-[#333F48]">
          PeopleSoft Customer ID:  <span className="text-lg font-mono font-semibold" style={{ color: '#00A3E1' }}>MULTI</span>
        </div>
        <p className="text-xs text-[#6b7a85] mt-1">
          This is automatically set for multi-account customers
        </p>
      </div>

      {/* Child Accounts */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="block text-sm font-medium text-[#333F48] mb-1">
              Child Accounts <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-[#6b7a85]">
              Add all PeopleSoft account numbers associated to the previously entered customer email addresses.
            </p>
          </div>
          <button
            onClick={handleAddAccount}
            className="py-1.5 text-xs font-medium transition-colors flex items-center gap-2"
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
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        </div>

        <div className="space-y-4">
          {childAccounts.map((account, index) => (
            <div
              key={index}
              className={`p-4 border-2 rounded-lg ${
                errors[index] ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-2 pt-3">
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  <div className="w-8 h-8 bg-[#00A3E1] rounded-full flex items-center justify-center text-white font-semibold">
                    {index + 1}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {/* PS Account ID */}
                  <div>
                    <label className="block text-xs font-medium text-[#333F48] mb-2">
                      PeopleSoft Account ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={account.ps_account_id}
                      onChange={(e) => handleAccountChange(index, 'ps_account_id', e.target.value)}
                      placeholder="e.g., 245634"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#00A3E1]/20 outline-none ${
                        errors[index] ? 'border-red-500' : 'border-gray-300 focus:border-[#00A3E1]'
                      }`}
                    />
                  </div>

                  {/* AI Mapping Instructions */}
                  <div style={{ marginTop: '20px' }}>
                    <label className="block text-xs font-medium text-[#333F48] mb-2">
                      AI Mapping Instructions <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={account.routing_description}
                      onChange={(e) => handleAccountChange(index, 'routing_description', e.target.value)}
                      placeholder="e.g., Use for all orders shipping to California, Nevada, Oregon, and Washington"
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#00A3E1]/20 outline-none resize-none ${
                        errors[index] ? 'border-red-500' : 'border-gray-300 focus:border-[#00A3E1]'
                      }`}
                    />
                    <p className="text-xs text-[#6b7a85] mt-1">
                      Describe when to use this account (region, territory, project type, etc.)
                    </p>
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveAccount(index)}
                  disabled={childAccounts.length <= 2}
                  className={`mt-8 p-2 rounded-lg transition-colors ${
                    childAccounts.length <= 2
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-red-500 hover:bg-red-50'
                  }`}
                  title={childAccounts.length <= 2 ? 'Minimum 2 accounts required' : 'Remove account'}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {errors[index] && (
                <p className="mt-2 text-sm text-red-500 ml-14">{errors[index]}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-[#6b7a85]">
          💡 <strong>Tip:</strong> You'll configure the AI routing logic later in the wizard. For now,
          just add all possible account numbers and describe when each should be used.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={validateAndContinue}
          disabled={isLoading}
          className="py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{
            border: '1px solid #00A3E1',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#00A3E1',
            paddingLeft: '16px',
            paddingRight: '16px',
            marginTop: '3pt'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#00A3E1'
              e.currentTarget.style.color = 'white'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#00A3E1'
          }}
        >
          {isLoading ? 'Saving...' : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
