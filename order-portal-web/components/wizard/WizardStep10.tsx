'use client'

import { WizardStepProps } from '@/lib/types/wizard'
import { ArrowRight, Building2, Mail, FolderOpen, UserCircle, Truck, MapPin, CheckCircle, Edit, ArrowLeft, Save } from 'lucide-react'

export function WizardStep10({ session, onNext, isLoading, onJumpToStep, onBack, onSaveDraft }: WizardStepProps) {
  const handleContinue = async () => {
    await onNext({})
  }

  const handleEditStep = async (stepNumber: number) => {
    if (onJumpToStep) {
      await onJumpToStep(stepNumber)
    }
  }

  const customerData = session.customer_data

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '24px' }}>
        {/* Left Column - Completion Message */}
        <div>
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-[#333F48] mb-3 flex items-center gap-2">
          <span className="text-2xl">🎉</span>
          Customer Information Complete!
        </h3>
        <p className="text-sm text-[#6b7a85] mb-4">
          You've completed the customer information section. Next, you'll upload sample orders
          and answer voice-recorded questions to help build intelligent AI prompts for order processing.
        </p>
        <div className="bg-white rounded-lg p-4">
          <h4 className="font-semibold text-[#333F48] mb-2 text-sm">What's next:</h4>
          <ul className="text-sm text-[#6b7a85] space-y-1">
            <li>• Upload sample order PDFs</li>
            <li>• Answer voice-recorded questions about order headers</li>
            <li>• Answer voice-recorded questions about product line items</li>
            {session.customer_data?.is_multi_account && (
              <li>• Answer questions about multi-account routing</li>
            )}
            <li>• Review and edit your answers</li>
            <li>• Generate AI prompts</li>
          </ul>
          </div>
        </div>
      </div>

      {/* Right Column - Customer Information Summary */}
      <div className="bg-white border-2 border-gray-200 rounded-lg" style={{ maxWidth: '400px', padding: '24px' }}>
        <h3 className="text-sm font-semibold text-[#333F48] mb-4 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" style={{ color: '#00A3E1' }} />
          Customer Summary
        </h3>

        <div className="space-y-4">
          {/* Customer Name */}
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: '#00A3E1', marginRight: '12px' }} />
              <span className="text-xs text-[#6b7a85]" style={{ marginRight: '8px' }}>Name:</span>
              <span className="text-xs text-[#333F48] font-medium truncate">{customerData?.customer_name || '—'}</span>
            </div>
            <button
              onClick={() => handleEditStep(1)}
              className="transition-colors"
              title="Edit"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px solid #00A3E1',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = '#00A3E1'
              }}
            >
              <Edit className="h-3 w-3" style={{ color: '#00A3E1' }} />
            </button>
          </div>

          {/* PS Customer ID / Multi-Account */}
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: '#00A3E1', marginRight: '12px' }} />
              <span className="text-xs text-[#6b7a85]" style={{ marginRight: '8px' }}>PS ID:</span>
              <span className="text-xs text-[#333F48] font-medium">
                {customerData?.is_multi_account ? 'MULTI' : (customerData?.ps_customer_id || '—')}
              </span>
            </div>
            <button
              onClick={() => handleEditStep(customerData?.is_multi_account ? 4 : 4)}
              className="transition-colors"
              title="Edit"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px solid #00A3E1',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = '#00A3E1'
              }}
            >
              <Edit className="h-3 w-3" style={{ color: '#00A3E1' }} />
            </button>
          </div>

          {/* Sender Emails */}
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <Mail className="h-4 w-4 flex-shrink-0" style={{ color: '#00A3E1', marginRight: '12px' }} />
              <span className="text-xs text-[#6b7a85]" style={{ marginRight: '8px' }}>Email:</span>
              <span className="text-xs text-[#333F48] font-medium truncate">
                {customerData?.sender_email?.split(';')[0].trim() || '—'}
                {customerData?.sender_email && customerData.sender_email.split(';').length > 1 &&
                  ` (+${customerData.sender_email.split(';').length - 1})`}
              </span>
            </div>
            <button
              onClick={() => handleEditStep(2)}
              className="transition-colors"
              title="Edit"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px solid #00A3E1',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = '#00A3E1'
              }}
            >
              <Edit className="h-3 w-3" style={{ color: '#00A3E1' }} />
            </button>
          </div>

          {/* SharePoint Folder ID */}
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <FolderOpen className="h-4 w-4 flex-shrink-0" style={{ color: '#00A3E1', marginRight: '12px' }} />
              <span className="text-xs text-[#6b7a85]" style={{ marginRight: '8px' }}>Folder:</span>
              <span className="text-xs text-[#333F48] font-medium font-mono truncate">
                {customerData?.sharepoint_folder_id ? customerData.sharepoint_folder_id.substring(0, 12) + '...' : '—'}
              </span>
            </div>
            <button
              onClick={() => handleEditStep(5)}
              className="transition-colors"
              title="Edit"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px solid #00A3E1',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = '#00A3E1'
              }}
            >
              <Edit className="h-3 w-3" style={{ color: '#00A3E1' }} />
            </button>
          </div>

          {/* Assigned ISR */}
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <UserCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#00A3E1', marginRight: '12px' }} />
              <span className="text-xs text-[#6b7a85]" style={{ marginRight: '8px' }}>ISR:</span>
              <span className="text-xs text-[#333F48] font-medium truncate">{customerData?.csr_id || '—'}</span>
            </div>
            <button
              onClick={() => handleEditStep(6)}
              className="transition-colors"
              title="Edit"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px solid #00A3E1',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = '#00A3E1'
              }}
            >
              <Edit className="h-3 w-3" style={{ color: '#00A3E1' }} />
            </button>
          </div>

          {/* Default Carrier & Ship Via */}
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <Truck className="h-4 w-4 flex-shrink-0" style={{ color: '#00A3E1', marginRight: '12px' }} />
              <span className="text-xs text-[#6b7a85]" style={{ marginRight: '8px' }}>Carrier:</span>
              <span className="text-xs text-[#333F48] font-medium truncate">
                {customerData?.default_carrier && customerData?.default_ship_via
                  ? `${customerData.default_carrier} - ${customerData.default_ship_via}`
                  : <span className="italic">Not set</span>}
              </span>
            </div>
            <button
              onClick={() => handleEditStep(7)}
              className="transition-colors"
              title="Edit"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px solid #00A3E1',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = '#00A3E1'
              }}
            >
              <Edit className="h-3 w-3" style={{ color: '#00A3E1' }} />
            </button>
          </div>

          {/* Default Ship-To Name */}
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: '#00A3E1', marginRight: '12px' }} />
              <span className="text-xs text-[#6b7a85]" style={{ marginRight: '8px' }}>Ship-To:</span>
              <span className="text-xs text-[#333F48] font-medium truncate">
                {customerData?.default_shipto_name || <span className="italic">Not set</span>}
              </span>
            </div>
            <button
              onClick={() => handleEditStep(8)}
              className="transition-colors"
              title="Edit"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px solid #00A3E1',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = '#00A3E1'
              }}
            >
              <Edit className="h-3 w-3" style={{ color: '#00A3E1' }} />
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Navigation Footer with Three Buttons */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{
            border: '1px solid #00A3E1',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#00A3E1',
            paddingLeft: '16px',
            paddingRight: '16px'
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
          <ArrowLeft className="h-4 w-4" />
          Back
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
            paddingRight: '16px'
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
          {isLoading ? 'Loading...' : (
            <>
              Continue to Sample Order Upload
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <button
          onClick={onSaveDraft}
          disabled={isLoading}
          className="py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{
            border: '1px solid #00A3E1',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#00A3E1',
            paddingLeft: '16px',
            paddingRight: '16px'
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
          <Save className="h-4 w-4" />
          Save Draft
        </button>
      </div>
    </div>
  )
}
