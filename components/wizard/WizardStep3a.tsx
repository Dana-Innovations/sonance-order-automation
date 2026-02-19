'use client'

import { useState, useEffect } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, GripVertical, ArrowRight, AlertTriangle } from 'lucide-react'

export function WizardStep3a({ session, onNext, isLoading }: WizardStepProps) {
  const [childAccounts, setChildAccounts] = useState(() => {
    const accounts = session.child_accounts || []
    // Ensure minimum of 2 accounts
    if (accounts.length < 2) {
      return [
        { ps_account_id: '', routing_description: '', display_order: 1 },
        { ps_account_id: '', routing_description: '', display_order: 2 }
      ]
    }
    return accounts
  })
  const [errors, setErrors] = useState<{ [key: number]: string }>({})
  const [checking, setChecking] = useState<{ [key: number]: boolean }>({})

  const supabase = createClient()

  const checkAccountAvailability = async (psAccountId: string, index: number) => {
    if (!psAccountId.trim()) {
      return
    }

    const trimmedId = psAccountId.trim().toUpperCase()
    setChecking({ ...checking, [index]: true })

    try {
      // Check if it exists as a parent customer
      const { data: parentCustomer, error: parentError } = await supabase
        .from('customers')
        .select('customer_name, ps_customer_id')
        .eq('ps_customer_id', trimmedId)
        .maybeSingle()

      if (parentError) {
        console.error('Error checking parent customer:', parentError)
        setChecking({ ...checking, [index]: false })
        return
      }

      if (parentCustomer) {
        const newErrors = { ...errors }
        newErrors[index] = `This account ID is already in use by ${parentCustomer.customer_name}`
        setErrors(newErrors)
        setChecking({ ...checking, [index]: false })
        return
      }

      // Check if it exists as a child account
      const { data: childAccount, error: childError } = await supabase
        .from('customer_child_accounts')
        .select('child_ps_account_id')
        .eq('child_ps_account_id', trimmedId)
        .maybeSingle()

      if (childError) {
        console.error('Error checking child account:', childError)
        setChecking({ ...checking, [index]: false })
        return
      }

      if (childAccount) {
        const parentName = 'another customer'
        const newErrors = { ...errors }
        newErrors[index] = `This account ID is already a child account of ${parentName}`
        setErrors(newErrors)
        setChecking({ ...checking, [index]: false })
        return
      }

      // If we get here, the account is available - clear any errors
      const newErrors = { ...errors }
      delete newErrors[index]
      setErrors(newErrors)
      setChecking({ ...checking, [index]: false })
    } catch (error) {
      console.error('Error checking account availability:', error)
      setChecking({ ...checking, [index]: false })
    }
  }

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
    // Clear error and checking state for this index
    const newErrors = { ...errors }
    delete newErrors[index]
    setErrors(newErrors)

    const newChecking = { ...checking }
    delete newChecking[index]
    setChecking(newChecking)
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

    // If ps_account_id changed, check availability with debounce
    if (field === 'ps_account_id' && value.trim()) {
      const timer = setTimeout(() => checkAccountAvailability(value, index), 500)
      return () => clearTimeout(timer)
    }
  }

  const validateAndContinue = async () => {
    const newErrors: { [key: number]: string } = {}

    // Check minimum 2 accounts
    if (childAccounts.length < 2) {
      alert('Multi-account customers require at least 2 PS Account IDs. Please add another account.')
      return
    }

    // Check each account has both fields filled
    childAccounts.forEach((account, index) => {
      if (!account.ps_account_id.trim()) {
        newErrors[index] = 'PS Account ID is required'
      } else if (!account.routing_description.trim()) {
        newErrors[index] = 'Routing description is required'
      }
    })

    // Check for duplicate PS Account IDs within the form
    const accountIds = childAccounts.map(a => a.ps_account_id.trim().toUpperCase())
    const duplicates = accountIds.filter((id, idx) => id && accountIds.indexOf(id) !== idx)
    if (duplicates.length > 0) {
      childAccounts.forEach((account, index) => {
        if (duplicates.includes(account.ps_account_id.trim().toUpperCase())) {
          newErrors[index] = 'Duplicate PS Account ID'
        }
      })
    }

    // If there are format/duplicate errors, stop here
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Check availability for each account
    for (let index = 0; index < childAccounts.length; index++) {
      const account = childAccounts[index]
      const trimmedId = account.ps_account_id.trim().toUpperCase()

      // Check if it exists as a parent customer
      const { data: parentCustomer } = await supabase
        .from('customers')
        .select('customer_name, ps_customer_id')
        .eq('ps_customer_id', trimmedId)
        .maybeSingle()

      if (parentCustomer) {
        newErrors[index] = `This account ID is already in use by ${parentCustomer.customer_name}`
        continue
      }

      // Check if it exists as a child account
      const { data: childAccount } = await supabase
        .from('customer_child_accounts')
        .select('child_ps_account_id')
        .eq('child_ps_account_id', trimmedId)
        .maybeSingle()

      if (childAccount) {
        const parentName = 'another customer'
        newErrors[index] = `This account ID is already a child account of ${parentName}`
      }
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
    <div style={{ maxWidth: '625px', margin: '0 auto' }}>
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
              Add all PeopleSoft account numbers associated to this customer. Minimum of 2 accounts required.
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
                <div className="flex items-center pt-3">
                  <div style={{
                    width: '29px',
                    height: '29px',
                    borderRadius: '50%',
                    backgroundColor: '#00A3E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '14px',
                    marginRight: '16px'
                  }}>
                    {index + 1}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {/* PS Account ID */}
                  <div>
                    <label className="block text-xs font-medium text-[#333F48] mb-2">
                      PeopleSoft Account ID <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={account.ps_account_id}
                        onChange={(e) => handleAccountChange(index, 'ps_account_id', e.target.value)}
                        placeholder="e.g., 245634"
                        className={`border focus:ring-2 focus:ring-[#00A3E1]/20 outline-none ${
                          errors[index] ? 'border-red-500' : 'border-gray-300 focus:border-[#00A3E1]'
                        }`}
                        style={{ paddingTop: '10px', paddingBottom: '10px', paddingLeft: '16px', paddingRight: '16px', width: '150px', fontSize: '16px', borderRadius: '12px' }}
                      />
                      {errors[index] && (
                        <div className="flex-shrink-0 flex items-center" style={{ marginLeft: '12px', height: '19px' }}>
                          <AlertTriangle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Mapping Instructions */}
                  <div style={{ marginTop: '10px' }}>
                    <label className="block text-xs font-medium text-[#333F48] mb-2">
                      AI Mapping Instructions <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={account.routing_description}
                      onChange={(e) => handleAccountChange(index, 'routing_description', e.target.value)}
                      placeholder="e.g., Use for all orders shipping to California, Nevada, Oregon, and Washington"
                      rows={4}
                      className={`w-full border focus:ring-2 focus:ring-[#00A3E1]/20 outline-none resize-none ${
                        errors[index] ? 'border-red-500' : 'border-gray-300 focus:border-[#00A3E1]'
                      }`}
                      style={{ paddingTop: '13px', paddingBottom: '13px', paddingLeft: '16px', paddingRight: '16px', fontSize: '16px', borderRadius: '12px' }}
                    />
                    <p className="text-xs text-[#6b7a85]" style={{ marginTop: '2px' }}>
                      Describe when to use this account.
                    </p>
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveAccount(index)}
                  disabled={childAccounts.length <= 2}
                  className="mt-8 transition-colors flex items-center justify-center flex-shrink-0"
                  style={{
                    border: childAccounts.length <= 2 ? '1px solid #d1d5db' : '1px solid #00A3E1',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    color: childAccounts.length <= 2 ? '#d1d5db' : '#00A3E1',
                    width: '32px',
                    height: '32px',
                    padding: '0',
                    cursor: childAccounts.length <= 2 ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (childAccounts.length > 2) {
                      e.currentTarget.style.backgroundColor = '#00A3E1'
                      e.currentTarget.style.color = 'white'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (childAccounts.length > 2) {
                      e.currentTarget.style.backgroundColor = 'white'
                      e.currentTarget.style.color = '#00A3E1'
                    }
                  }}
                  title={childAccounts.length <= 2 ? 'Minimum 2 accounts required' : 'Remove account'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {errors[index] && (
                <p className="mt-2 text-sm ml-14" style={{ color: '#dc2626', fontWeight: '600' }}>{errors[index]}</p>
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
