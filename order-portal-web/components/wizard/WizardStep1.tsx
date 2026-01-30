'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { ArrowRight } from 'lucide-react'

export function WizardStep1({ session, onNext, isLoading }: WizardStepProps) {
  const [customerName, setCustomerName] = useState(
    session.customer_data?.customer_name || ''
  )
  const [error, setError] = useState('')

  const handleContinue = async () => {
    if (!customerName.trim()) {
      setError('Customer name is required')
      return
    }

    setError('')
    await onNext({ customer_name: customerName.trim() })
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-4">
          Customer Name
        </h2>
        <p className="text-sm text-[#6b7a85] mb-2">
          Enter the full name of the customer you're setting up
        </p>
      </div>

      {session.customer_data?.copied_from_customer_name && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-[#6b7a85]">
            📋 Copying settings from: <strong>{session.customer_data.copied_from_customer_name}</strong>
          </p>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-[#333F48] mb-2">
          Customer Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => {
            setCustomerName(e.target.value)
            setError('')
          }}
          placeholder="Enter customer name (e.g., Acme Corporation)"
          className={`px-4 border focus:ring-2 focus:ring-[#00A3E1]/20 outline-none ${
            error ? 'border-red-500' : 'border-gray-300 focus:border-[#00A3E1]'
          }`}
          style={{ paddingTop: '13px', paddingBottom: '13px', width: '90%', fontSize: '16px', borderRadius: '12px' }}
          autoFocus
        />
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
        <p className="mt-2 text-xs text-[#6b7a85]">
          Example: "Acme Corporation" or "Smith Audio Systems"
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={isLoading || !customerName.trim()}
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
            if (!isLoading && customerName.trim()) {
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
