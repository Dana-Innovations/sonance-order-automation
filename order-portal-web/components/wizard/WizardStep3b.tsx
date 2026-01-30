'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react'

export function WizardStep3b({ session, onNext, isLoading }: WizardStepProps) {
  const [psCustomerId, setPsCustomerId] = useState(
    session.customer_data?.ps_customer_id || ''
  )
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)

  const supabase = createClient()

  const checkAvailability = async (value: string) => {
    if (!value.trim()) {
      setIsAvailable(null)
      setError('')
      return
    }

    setChecking(true)
    const trimmedValue = value.trim().toUpperCase()

    // Check if it exists as a parent customer
    const { data: parentCustomer, error: parentError } = await supabase
      .from('customers')
      .select('ps_customer_id, customer_name')
      .eq('ps_customer_id', trimmedValue)
      .maybeSingle()

    if (parentError) {
      console.error('Error checking parent customer:', parentError)
      setChecking(false)
      setIsAvailable(null)
      return
    }

    if (parentCustomer) {
      setError(`This Customer ID is already in use by ${parentCustomer.customer_name}`)
      setChecking(false)
      setIsAvailable(false)
      return
    }

    // Check if it exists as a child account
    const { data: childAccount, error: childError } = await supabase
      .from('customer_child_accounts')
      .select('child_ps_account_id, customer_ps_id, customers!customer_child_accounts_customer_ps_id_fkey(customer_name)')
      .eq('child_ps_account_id', trimmedValue)
      .maybeSingle()

    if (childError) {
      console.error('Error checking child account:', childError)
      setChecking(false)
      setIsAvailable(null)
      return
    }

    if (childAccount) {
      const parentName = (childAccount.customers as any)?.customer_name || 'another customer'
      setError(`This Customer ID is already a child account of ${parentName}`)
      setChecking(false)
      setIsAvailable(false)
      return
    }

    // Available
    setError('')
    setChecking(false)
    setIsAvailable(true)
  }

  const handleChange = (value: string) => {
    setPsCustomerId(value)
    setError('')
    setIsAvailable(null)

    // Debounce the availability check
    if (value.trim()) {
      const timer = setTimeout(() => checkAvailability(value), 500)
      return () => clearTimeout(timer)
    }
  }

  const handleContinue = async () => {
    const trimmedValue = psCustomerId.trim()

    if (!trimmedValue) {
      setError('PeopleSoft Customer ID is required')
      return
    }

    // Check if it contains only alphanumeric, hyphens, and underscores
    if (!/^[A-Za-z0-9_-]+$/.test(trimmedValue)) {
      setError('Only letters, numbers, hyphens, and underscores are allowed')
      return
    }

    // Reserved value check
    if (trimmedValue.toUpperCase() === 'MULTI') {
      setError('This value is reserved for multi-account customers')
      return
    }

    // Check availability one more time before continuing
    const upperValue = trimmedValue.toUpperCase()

    // Check if it exists as a parent customer
    const { data: parentCustomer } = await supabase
      .from('customers')
      .select('ps_customer_id, customer_name')
      .eq('ps_customer_id', upperValue)
      .maybeSingle()

    if (parentCustomer) {
      setError(`This Customer ID is already in use by ${parentCustomer.customer_name}`)
      setIsAvailable(false)
      return
    }

    // Check if it exists as a child account
    const { data: childAccount } = await supabase
      .from('customer_child_accounts')
      .select('child_ps_account_id, customer_ps_id, customers!customer_child_accounts_customer_ps_id_fkey(customer_name)')
      .eq('child_ps_account_id', upperValue)
      .maybeSingle()

    if (childAccount) {
      const parentName = (childAccount.customers as any)?.customer_name || 'another customer'
      setError(`This Customer ID is already a child account of ${parentName}`)
      setIsAvailable(false)
      return
    }

    await onNext({ ps_customer_id: upperValue })
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
          PeopleSoft Customer ID
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-[#333F48] mb-6">
          PeopleSoft Customer ID <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center">
          <div className="relative" style={{ width: '250px' }}>
            <input
              type="text"
              value={psCustomerId}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="e.g., 238482"
              className={`px-4 border focus:ring-2 focus:ring-[#00A3E1]/20 outline-none ${
                error
                  ? 'border-red-500'
                  : isAvailable === true
                  ? 'border-green-500'
                  : isAvailable === false
                  ? 'border-orange-500'
                  : 'border-gray-300 focus:border-[#00A3E1]'
              }`}
              style={{ paddingTop: '13px', paddingBottom: '13px', width: '90%', fontSize: '16px', borderRadius: '12px' }}
              autoFocus
            />

            {/* Availability Indicator */}
            {checking && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-[#00A3E1] border-t-transparent rounded-full"></div>
              </div>
            )}
            {!checking && isAvailable === true && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            )}
            {!checking && isAvailable === false && !error && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
            )}
          </div>

          {/* Error Badge */}
          {error && (
            <div className="flex-shrink-0 flex items-center" style={{ marginLeft: '12px', height: '19px' }}>
              <AlertTriangle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-sm" style={{ color: '#dc2626', fontWeight: '600' }}>{error}</p>
        )}

        {/* Availability Messages */}
        {!error && !checking && isAvailable === true && (
          <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            This ID is available
          </p>
        )}

        {/* Help Text */}
        <p className="mt-2 text-xs text-[#6b7a85]">
          Enter the exact PeopleSoft Customer ID as it appears in PeopleSoft Customer Setup.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#333F48] flex items-center" style={{ marginBottom: '0px' }}>
          <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#00A3E1', marginRight: '12px' }} />
          Important
        </h3>
        <p className="text-sm text-[#6b7a85]" style={{ marginLeft: '32px' }}>
          Make sure this ID matches <strong>exactly</strong> what's in PeopleSoft.
          Mismatches will cause order upload errors and delays.
        </p>
      </div>

      {/* Examples */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#333F48] text-sm" style={{ marginBottom: '4px' }}>Valid formats:</h3>
        <ul className="text-sm text-[#6b7a85] space-y-1" style={{ paddingLeft: '20px', marginTop: 0 }}>
          <li><code className="bg-white px-2 py-0.5 rounded">9190049</code> - Numeric Only</li>
          <li><code className="bg-white px-2 py-0.5 rounded">I204534</code> - Numeric with Alpha prefix</li>
        </ul>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={isLoading || !psCustomerId.trim() || isAvailable === false}
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
            if (!isLoading && psCustomerId.trim() && isAvailable !== false) {
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
