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
        <div className="flex items-start gap-4">
          <UserCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#00A3E1' }} />
          <div>
            <h3 className="font-semibold text-[#333F48] mb-1">What is this for?</h3>
            <p className="text-sm text-[#6b7a85]">
              Assign an Inside Sales Representative to this customer. The ISR will be notified
              about order issues and can manage this customer's orders. This is optional.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-[#333F48] mb-6">
          Search for ISR (Optional)
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6b7a85]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-[#00A3E1] focus:ring-2 focus:ring-[#00A3E1]/20 outline-none"
          />
        </div>
      </div>

      {/* CSR List */}
      <div className="mb-6">
        {loadingCsrs ? (
          <div className="text-center py-12 text-[#6b7a85]">
            <div className="animate-spin h-8 w-8 border-4 border-[#00A3E1] border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading ISRs...
          </div>
        ) : filteredCsrs.length === 0 ? (
          <div className="text-center py-12 text-[#6b7a85]">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No ISRs found</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-sm text-[#00A3E1] hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {/* None Option */}
            <button
              onClick={() => setSelectedCsrId(null)}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                selectedCsrId === null
                  ? 'border-[#00A3E1] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-gray-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#333F48]">
                      No ISR Assigned
                    </h4>
                    <p className="text-sm text-[#6b7a85]">
                      Skip this step for now
                    </p>
                  </div>
                </div>
                {selectedCsrId === null && (
                  <div className="w-6 h-6 bg-[#00A3E1] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </div>
            </button>

            {filteredCsrs.map((csr) => (
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#00A3E1]/10 rounded-full flex items-center justify-center">
                      <span className="text-[#00A3E1] font-semibold text-lg">
                        {csr.first_name.charAt(0)}{csr.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#333F48]">
                        {csr.first_name} {csr.last_name}
                      </h4>
                      <p className="text-sm text-[#6b7a85]">
                        {csr.email}
                      </p>
                    </div>
                  </div>
                  {selectedCsrId === csr.email && (
                    <div className="w-6 h-6 bg-[#00A3E1] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm">✓</span>
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
          If no ISR is assigned, order notifications will go to the default admin contacts.
        </p>
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
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
