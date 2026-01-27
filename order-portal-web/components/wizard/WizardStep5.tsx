'use client'

import { useState } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle, FolderOpen, HelpCircle, ArrowRight } from 'lucide-react'

export function WizardStep5({ session, onNext, isLoading }: WizardStepProps) {
  const [folderId, setFolderId] = useState(
    session.customer_data?.sharepoint_folder_id || ''
  )
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const supabase = createClient()

  const checkAvailability = async (value: string) => {
    if (!value.trim()) {
      setIsAvailable(null)
      return
    }

    setChecking(true)

    const { data, error } = await supabase
      .from('customers')
      .select('sharepoint_folder_id')
      .eq('sharepoint_folder_id', value.trim())
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
    setFolderId(value)
    setError('')
    setIsAvailable(null)

    // Debounce the availability check
    if (value.trim()) {
      const timer = setTimeout(() => checkAvailability(value), 500)
      return () => clearTimeout(timer)
    }
  }

  const handleContinue = async () => {
    const trimmedValue = folderId.trim()

    if (!trimmedValue) {
      setError('SharePoint Folder ID is required')
      return
    }

    // Check availability one more time before continuing
    if (isAvailable === null || isAvailable === undefined) {
      await checkAvailability(trimmedValue)
      return
    }

    if (isAvailable === false) {
      setError('This SharePoint Folder ID is already in use')
      return
    }

    await onNext({ sharepoint_folder_id: trimmedValue })
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
          SharePoint Folder ID
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-4">
          <FolderOpen className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#00A3E1' }} />
          <div>
            <h3 className="font-semibold text-[#333F48] mb-1">What is this?</h3>
            <p className="text-sm text-[#6b7a85]">
              The SharePoint Folder ID identifies where this customer's order PDFs are stored.
              The automation system uses this to retrieve and process order documents.
            </p>
          </div>
        </div>
      </div>

      {/* Folder ID Input */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <label className="block text-sm font-medium text-[#333F48]">
            SharePoint Folder ID <span className="text-red-500">*</span>
          </label>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-sm text-[#00A3E1] hover:text-[#0082b8] flex items-center gap-1"
          >
            <HelpCircle className="h-4 w-4" />
            {showHelp ? 'Hide' : 'Show'} help
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={folderId}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="01ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#00A3E1]/20 outline-none font-mono text-sm ${
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
            This Folder ID is available
          </p>
        )}
        {!error && !checking && isAvailable === false && (
          <p className="mt-2 text-sm text-orange-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            This Folder ID is already in use. Please check and verify.
          </p>
        )}

        <p className="mt-2 text-xs text-[#6b7a85]">
          This is a long alphanumeric string that uniquely identifies the SharePoint folder.
        </p>
      </div>

      {/* Help Section */}
      {showHelp && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
          <h3 className="font-semibold text-[#333F48] mb-3 flex items-center gap-2">
            <HelpCircle className="h-5 w-5" style={{ color: '#00A3E1' }} />
            How to find the SharePoint Folder ID
          </h3>

          <div className="space-y-4 text-sm text-[#6b7a85]">
            <div>
              <h4 className="font-semibold text-[#333F48] mb-2">Method 1: From SharePoint URL</h4>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Navigate to the customer's folder in SharePoint</li>
                <li>Click the <strong>ⓘ Details</strong> icon in the top-right corner</li>
                <li>Look for the <strong>Folder ID</strong> field</li>
                <li>Copy the long alphanumeric string</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-[#333F48] mb-2">Method 2: From URL Parameters</h4>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Open the folder in SharePoint</li>
                <li>Look at the URL in your browser</li>
                <li>Find the parameter that looks like: <code className="bg-white px-1 py-0.5 rounded">id=%2F...</code></li>
                <li>The Folder ID is the encoded string after <code className="bg-white px-1 py-0.5 rounded">id=</code></li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
              <p className="text-sm text-[#6b7a85]">
                <strong>Note:</strong> The Folder ID is typically 32-40 characters long and consists of
                letters and numbers. It looks like: <code className="bg-white px-1 py-0.5 rounded text-xs">01ABCDEFG1234567890HIJKLMNOP</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#00A3E1' }} />
          <div>
            <h3 className="font-semibold text-[#333F48] mb-1">Important</h3>
            <p className="text-sm text-[#6b7a85]">
              Make sure this Folder ID is correct. The automation system will look for order PDFs
              in this folder. An incorrect ID will prevent orders from being processed.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={isLoading || !folderId.trim() || isAvailable === false}
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
            if (!isLoading && folderId.trim() && isAvailable !== false) {
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
