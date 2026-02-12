'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { CheckCircle, Loader, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function WizardStep16({ session, isLoading }: WizardStepProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSaveCustomer = async () => {
    setSaving(true)
    setError(null)

    try {
      // Call API to create customer record
      const response = await fetch('/api/wizard/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save customer')
      }

      const data = await response.json()
      setSaved(true)

      // Redirect to customer detail page after a short delay
      setTimeout(() => {
        router.push(`/settings/customers`)
      }, 2000)
    } catch (err) {
      console.error('Error saving customer:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const customerData = session.customer_data || {}
  const childAccounts = session.child_accounts || []

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2 flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-green-500" />
          Review & Complete Setup
        </h2>
        <p className="text-[#6b7a85]">
          Review your customer configuration before saving
        </p>
      </div>

      {/* Customer Information Summary */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-[#333F48] mb-4">Customer Information</h3>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-[#6b7a85]">Customer Name:</span>
            <span className="text-sm font-semibold text-[#333F48]">{customerData.customer_name}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm font-medium text-[#6b7a85]">Multi-Account:</span>
            <span className="text-sm font-semibold text-[#333F48]">
              {customerData.is_multi_account ? 'Yes' : 'No'}
            </span>
          </div>

          {customerData.is_multi_account ? (
            <div>
              <span className="text-sm font-medium text-[#6b7a85] block mb-2">Child Accounts:</span>
              <div className="ml-4 space-y-2">
                {childAccounts.map((account: any, index: number) => (
                  <div key={index} className="text-sm">
                    <span className="font-semibold text-[#333F48]">{account.ps_account_id}</span>
                    <span className="text-[#6b7a85]"> - {account.routing_description}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex justify-between">
              <span className="text-sm font-medium text-[#6b7a85]">PeopleSoft ID:</span>
              <span className="text-sm font-semibold text-[#333F48]">{customerData.ps_customer_id}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-sm font-medium text-[#6b7a85]">Sender Email:</span>
            <span className="text-sm font-semibold text-[#333F48]">{customerData.sender_email}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm font-medium text-[#6b7a85]">Default Carrier:</span>
            <span className="text-sm font-semibold text-[#333F48]">
              {customerData.default_carrier || 'None'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm font-medium text-[#6b7a85]">Default Ship Via:</span>
            <span className="text-sm font-semibold text-[#333F48]">
              {customerData.default_ship_via || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Prompts Summary */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-[#333F48] mb-4">AI Prompts Generated</h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-[#333F48]">Order Header Extraction Prompt</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-[#333F48]">Order Line Item Extraction Prompt</span>
          </div>
          {customerData.is_multi_account && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-[#333F48]">Multi-Account Routing Prompt</span>
            </div>
          )}
        </div>
      </div>

      {/* Sample PDFs */}
      {customerData.sample_pdfs && customerData.sample_pdfs.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#333F48] mb-4">Sample PDFs</h3>
          <div className="space-y-2">
            {customerData.sample_pdfs.map((pdf: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-[#333F48]">{pdf.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {saved && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-700 mb-2">Customer Created Successfully!</h3>
          <p className="text-sm text-green-600">Redirecting to customers list...</p>
        </div>
      )}

      {/* Save Button */}
      {!saved && (
        <div className="text-center">
          <button
            onClick={handleSaveCustomer}
            disabled={saving || isLoading}
            className="py-3 px-8 text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
            style={{
              border: '2px solid #00A3E1',
              borderRadius: '25px',
              backgroundColor: '#00A3E1',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              if (!saving && !isLoading) {
                e.currentTarget.style.backgroundColor = '#0088c7'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#00A3E1'
            }}
          >
            {saving ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Creating Customer...
              </>
            ) : (
              <>
                <Home className="h-5 w-5" />
                Save Customer & Complete Setup
              </>
            )}
          </button>

          <p className="text-xs text-[#6b7a85] mt-4">
            This will create the customer record and make it ready for order processing
          </p>
        </div>
      )}
    </div>
  )
}
