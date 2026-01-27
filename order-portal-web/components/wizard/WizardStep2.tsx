'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { AlertCircle, ArrowRight } from 'lucide-react'

export function WizardStep2({ session, onNext, isLoading }: WizardStepProps) {
  const [isMultiAccount, setIsMultiAccount] = useState<boolean | null>(
    session.customer_data?.is_multi_account ?? null
  )

  const handleContinue = async () => {
    if (isMultiAccount === null) return

    await onNext({
      is_multi_account: isMultiAccount,
      ps_customer_id: isMultiAccount ? 'MULTI' : '' // Auto-set to MULTI if yes
    })
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
          Multi-Account Customer?
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
        <div className="flex items-center">
          <AlertCircle className="h-6 w-6 flex-shrink-0" style={{ color: '#00A3E1', marginRight: '16px' }} />
          <h3 className="font-semibold text-[#333F48]">
            Is this customer associated with multiple PeopleSoft account numbers?
          </h3>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {/* Yes - Multi-Account */}
        <button
          onClick={() => setIsMultiAccount(true)}
          className={`w-full p-6 border-2 rounded-lg text-left transition-all ${
            isMultiAccount === true
              ? 'border-[#00A3E1] bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
              isMultiAccount === true
                ? 'border-[#00A3E1] bg-[#00A3E1]'
                : 'border-gray-300'
            }`}>
              {isMultiAccount === true && (
                <div className="w-3 h-3 bg-white rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-[#333F48] mb-1">
                Yes - Multi-territory/multi-account customer
              </h4>
              <p className="text-sm text-[#6b7a85]">
                Orders route to different PeopleSoft accounts based on specific criteria.
                You'll configure routing logic later in the wizard.
              </p>
            </div>
          </div>
        </button>

        {/* No - Single Account */}
        <button
          onClick={() => setIsMultiAccount(false)}
          className={`w-full p-6 border-2 rounded-lg text-left transition-all ${
            isMultiAccount === false
              ? 'border-[#00A3E1] bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
              isMultiAccount === false
                ? 'border-[#00A3E1] bg-[#00A3E1]'
                : 'border-gray-300'
            }`}>
              {isMultiAccount === false && (
                <div className="w-3 h-3 bg-white rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-[#333F48] mb-1">
                No - Single account customer
              </h4>
              <p className="text-sm text-[#6b7a85]">
                All orders from this customer use one PeopleSoft account number.
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-[#6b7a85]">
          💡 <strong>Tip:</strong> Most customers are single account. Only select "Yes" if you're certain
          this customer has multiple territories or account numbers.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={isLoading || isMultiAccount === null}
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
            if (!isLoading && isMultiAccount !== null) {
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
