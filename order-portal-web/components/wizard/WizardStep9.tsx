'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { MapPin, ArrowRight } from 'lucide-react'

export function WizardStep9({ session, onNext, isLoading }: WizardStepProps) {
  const [shiptoName, setShiptoName] = useState(
    session.customer_data?.default_shipto_name || ''
  )

  const handleContinue = async () => {
    await onNext({ default_shipto_name: shiptoName.trim() })
  }

  const handleSkip = async () => {
    await onNext({ default_shipto_name: '' })
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
          Default Ship-To Name
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-4">
          <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#00A3E1' }} />
          <div>
            <h3 className="font-semibold text-[#333F48] mb-1">What is this for?</h3>
            <p className="text-sm text-[#6b7a85]">
              Set a default ship-to name or location for this customer's orders. This could be
              a warehouse name, location identifier, or company name. If the order PDF doesn't
              specify a ship-to name, this default will be used. This is optional.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-[#333F48] mb-6">
          Default Ship-To Name (Optional)
        </label>
        <input
          type="text"
          value={shiptoName}
          onChange={(e) => setShiptoName(e.target.value)}
          placeholder="e.g., Main Warehouse, HQ Location, or Customer Name"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#00A3E1] focus:ring-2 focus:ring-[#00A3E1]/20 outline-none"
          autoFocus
        />
        <p className="mt-2 text-xs text-[#6b7a85]">
          This will be used as the default destination name when not specified in the order.
        </p>
      </div>

      {/* Examples */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#333F48] text-sm" style={{ marginBottom: '4px' }}>Common examples:</h3>
        <ul className="text-sm text-[#6b7a85] space-y-1" style={{ paddingLeft: '20px', marginTop: 0 }}>
          <li><strong>Warehouse names:</strong> "Main Warehouse", "Distribution Center West"</li>
          <li><strong>Location identifiers:</strong> "Building A", "Site 123"</li>
          <li><strong>Company names:</strong> "Acme Corporation", "Smith Audio"</li>
          <li><strong>Department names:</strong> "Receiving Department", "Shipping Dock"</li>
        </ul>
      </div>

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-[#6b7a85]">
          💡 <strong>Note:</strong> This is different from the ship-to address. This is just
          the name or identifier for the shipping destination. The actual address will be
          extracted from the order PDF or specified separately.
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-[#333F48] mb-3 flex items-center gap-2">
          <span className="text-2xl">🎉</span>
          Customer Information Complete!
        </h3>
        <p className="text-sm text-[#6b7a85] mb-4">
          You've completed the customer information section. Next, we'll guide you through
          voice-recorded questions to help build intelligent AI prompts for order processing.
        </p>
        <div className="bg-white rounded-lg p-4">
          <h4 className="font-semibold text-[#333F48] mb-2 text-sm">What's next:</h4>
          <ul className="text-sm text-[#6b7a85] space-y-1">
            <li>✓ Upload sample order PDF</li>
            <li>✓ Answer voice-recorded questions about order headers</li>
            <li>✓ Answer voice-recorded questions about product line items</li>
            {session.customer_data?.is_multi_account && (
              <li>✓ Answer questions about multi-account routing</li>
            )}
            <li>✓ Review and save your AI prompts</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={handleSkip}
          disabled={isLoading}
          className="px-6 py-3 text-[#6b7a85] hover:text-[#333F48] font-semibold transition-colors"
        >
          Skip for now
        </button>
        <button
          onClick={handleContinue}
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
              Continue to Voice Questions
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
