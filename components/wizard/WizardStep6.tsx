'use client'

import { useState, useEffect } from 'react'
import { WizardStepProps, CSR } from '@/lib/types/wizard'
import { createClient } from '@/lib/supabase/client'
import { Search, UserCircle, AlertCircle, ArrowRight } from 'lucide-react'

export function WizardStep6({ session, onNext, isLoading }: WizardStepProps) {
  const [csrs, setCsrs] = useState<CSR[]>([])
  const [loadingCsrs, setLoadingCsrs] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCsrId, setSelectedCsrId] = useState<string | null>(
    session.customer_data?.csr_id || null
  )

  const supabase = createClient()

  useEffect(() => {
    fetchCsrs()
  }, [])

  const fetchCsrs = async () => {
    setLoadingCsrs(true)
    const { data, error } = await supabase
      .from('csrs')
      .select('*')
      .order('last_name')

    if (!error && data) {
      setCsrs(data)
    }
    setLoadingCsrs(false)
  }

  const filteredCsrs = csrs.filter(csr => {
    const searchLower = searchTerm.toLowerCase()
    return (
      csr.first_name.toLowerCase().includes(searchLower) ||
      csr.last_name.toLowerCase().includes(searchLower) ||
      csr.email.toLowerCase().includes(searchLower)
    )
  })

  const handleContinue = async () => {
    await onNext({ csr_id: selectedCsrId || '' })
  }

  const handleSkip = async () => {
    await onNext({ csr_id: '' })
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
          Assign Inside Sales Rep (ISR)
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#333F48] mb-2 flex items-center gap-3">
          <UserCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#00A3E1' }} />
          What is this for?
        </h3>
        <p className="text-sm text-[#6b7a85]" style={{ marginLeft: '32px' }}>
          Assign an Inside Sales Representative to this customer. The ISR will be notified
          about new orders needing review and order import issues.
        </p>
      </div>

      {/* CSR List */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#333F48] mb-6">
          Select ISR <span className="text-red-500">*</span>
        </label>
        {loadingCsrs ? (
          <div className="text-center py-12 text-[#6b7a85]">
            <div className="animate-spin h-8 w-8 border-4 border-[#00A3E1] border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading ISRs...
          </div>
        ) : csrs.length === 0 ? (
          <div className="text-center py-12 text-[#6b7a85]">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No ISRs found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {csrs.map((csr) => (
              <button
                key={csr.email}
                onClick={() => setSelectedCsrId(csr.email)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedCsrId === csr.email
                    ? 'border-[#00A3E1] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-[#333F48]" style={{ marginBottom: '2px' }}>
                      {csr.first_name} {csr.last_name}
                    </h4>
                    <p className="text-sm text-[#6b7a85]" style={{ margin: 0 }}>
                      {csr.email}
                    </p>
                  </div>
                  {selectedCsrId === csr.email && (
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#00A3E1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-[#6b7a85]">
          💡 <strong>Tip:</strong> You can change the assigned ISR later from the customer settings page.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={isLoading || !selectedCsrId}
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
            if (!isLoading && selectedCsrId) {
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
