'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'

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
      return
    }

    setChecking(true)

    const { data, error } = await supabase
      .from('customers')
      .select('ps_customer_id')
      .eq('ps_customer_id', value.trim().toUpperCase())
      .maybeSingle()

    setChecking(false)

    if (error) {
      console.error('Error checking availability:', error)
      setIsAvailable(null)
      return
    }

    setIsAvailable(!data)
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
    if (isAvailable === null || isAvailable === undefined) {
      await checkAvailability(trimmedValue)
      return
    }

    if (isAvailable === false) {
      setError('This PeopleSoft Customer ID is already in use')
      return
    }

    await onNext({ ps_customer_id: trimmedValue.toUpperCase() })
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
        <div className="relative">
          <input
            type="text"
            value={psCustomerId}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="e.g., ACME-CORP or ACME123"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#00A3E1]/20 outline-none ${
              error
                ? 'border-red-500'
                : isAvailable === true
                ? 'border-green-500'
                : isAvailable === false
                ? 'border-orange-500'
                : 'border-gray-300 focus:border-[#00A3E1]'
            }`}
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
          {!checking && isAvailable === false && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}

        {/* Availability Messages */}
        {!error && !checking && isAvailable === true && (
          <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            This ID is available
          </p>
        )}
        {!error && !checking && isAvailable === false && (
          <p className="mt-2 text-sm text-orange-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            This ID is already in use. Please choose a different one.
          </p>
        )}

        {/* Help Text */}
        <p className="mt-2 text-xs text-[#6b7a85]">
          Enter the exact PeopleSoft Customer ID as it appears in your system.
          This will be used for order routing and must be unique.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#00A3E1' }} />
          <div>
            <h3 className="font-semibold text-[#333F48] mb-1">Important</h3>
            <p className="text-sm text-[#6b7a85]">
              Make sure this ID matches <strong>exactly</strong> what's in PeopleSoft.
              Mismatches will cause order routing errors.
            </p>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#333F48] text-sm" style={{ marginBottom: '4px' }}>Valid formats:</h3>
        <ul className="text-sm text-[#6b7a85] space-y-1" style={{ paddingLeft: '20px', marginTop: 0 }}>
          <li><code className="bg-white px-2 py-0.5 rounded">ACME-CORP</code> - Company name with hyphen</li>
          <li><code className="bg-white px-2 py-0.5 rounded">ACME123</code> - Company name with numbers</li>
          <li><code className="bg-white px-2 py-0.5 rounded">ACME_WEST</code> - Company name with underscore</li>
          <li><code className="bg-white px-2 py-0.5 rounded">12345</code> - Numeric ID</li>
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
