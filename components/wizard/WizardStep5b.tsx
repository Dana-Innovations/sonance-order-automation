'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { Mail, HelpCircle, ArrowRight } from 'lucide-react'

export function WizardStep5b({ session, onNext, isLoading }: WizardStepProps) {
  const [folderId, setFolderId] = useState(
    session.customer_data?.Folder_ID_Proc || ''
  )
  const [showHelp, setShowHelp] = useState(false)

  const handleContinue = async () => {
    await onNext({ Folder_ID_Proc: folderId.trim() || null })
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
          Email Processed Folder
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-4">
          <Mail className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#00A3E1' }} />
          <div>
            <h3 className="font-semibold text-[#333F48] mb-1">What is this?</h3>
            <p className="text-sm text-[#6b7a85]">
              The Email Processed Folder ID identifies the Microsoft Exchange folder where processed
              customer emails will be moved after the automation system handles them. This keeps the
              inbox organised by separating processed orders from new ones.
            </p>
          </div>
        </div>
      </div>

      {/* Folder ID Input */}
      <div className="mb-6">
        <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
          <label className="block text-sm font-medium text-[#333F48]">
            Exchange Processed Folder ID <span className="text-[#6b7a85] font-normal">(optional)</span>
          </label>
          <button
            onClick={() => setShowHelp(!showHelp)}
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
            <HelpCircle className="h-4 w-4" />
            {showHelp ? 'Hide' : 'Show'} help
          </button>
        </div>

        <textarea
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          placeholder="e.g., AQMkADAwATM0MDAAMS1..."
          className="w-full px-4 border border-gray-300 focus:border-[#00A3E1] focus:ring-2 focus:ring-[#00A3E1]/20 outline-none font-mono"
          style={{ paddingTop: '13px', paddingBottom: '13px', fontSize: '16px', borderRadius: '12px', resize: 'none', height: '98px' }}
          autoFocus
        />

        <p className="mt-2 text-xs text-[#6b7a85]">
          This is a base64-encoded string that uniquely identifies the Exchange mailbox folder.
          It can be retrieved using PowerShell or the Exchange Admin Center. This field can be
          configured later via Settings if not available now.
        </p>
      </div>

      {/* Help Section */}
      {showHelp && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
          <h3 className="font-semibold text-[#333F48] mb-3 flex items-center gap-2">
            <HelpCircle className="h-5 w-5" style={{ color: '#00A3E1' }} />
            How to find the Exchange Processed Folder ID
          </h3>

          <div className="space-y-4 text-sm text-[#6b7a85]">
            <div>
              <h4 className="font-semibold text-[#333F48] mb-2">Method 1: PowerShell (recommended)</h4>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Open Exchange Management Shell or connect via PowerShell</li>
                <li>Run the following command, replacing the mailbox address:</li>
                <li>
                  <code className="block bg-white px-2 py-1.5 rounded text-xs mt-1 border border-gray-200 break-all">
                    Get-MailboxFolder -Identity "orders@sonance.com:\Processed" | Select FolderId
                  </code>
                </li>
                <li>Copy the <strong>FolderId</strong> value from the output</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-[#333F48] mb-2">Method 2: Exchange Admin Center (EAC)</h4>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Log in to the Exchange Admin Center</li>
                <li>Navigate to <strong>Recipients → Mailboxes</strong></li>
                <li>Select the orders mailbox and open its properties</li>
                <li>Use the <strong>Mailbox usage</strong> section to locate the target folder</li>
                <li>The folder ID is the EWS identifier string for that folder</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-[#333F48] mb-2">Method 3: EWS Editor tool</h4>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Download and open <strong>EWSEditor</strong> or <strong>MFCMAPI</strong></li>
                <li>Connect to the Exchange mailbox</li>
                <li>Browse to the "Processed" folder</li>
                <li>Copy the <strong>Folder ID</strong> shown in the folder properties</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
              <p className="text-sm text-[#6b7a85]">
                <strong>Note:</strong> Exchange folder IDs are long base64-encoded strings, often
                100+ characters. They look like:{' '}
                <code className="bg-white px-1 py-0.5 rounded text-xs">AQMkADAwATM0MDAAMS1...</code>
                <br />
                If the "Processed" folder does not yet exist in the mailbox, create it first, then retrieve its ID.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
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
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
