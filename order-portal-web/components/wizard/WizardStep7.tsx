'use client'

import { useState, useEffect } from 'react'
import { WizardStepProps, Carrier } from '@/lib/types/wizard'
import { createClient } from '@/lib/supabase/client'
import { Search, Truck, AlertCircle, ArrowRight } from 'lucide-react'

export function WizardStep7({ session, onNext, isLoading }: WizardStepProps) {
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [loadingCarriers, setLoadingCarriers] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(
    session.customer_data?.default_carrier || null
  )

  const supabase = createClient()

  useEffect(() => {
    fetchCarriers()
  }, [])

  const fetchCarriers = async () => {
    setLoadingCarriers(true)
    const { data, error } = await supabase
      .from('carriers')
      .select('*')
      .eq('is_active', true)
      .order('carrier_descr')

    if (!error && data) {
      setCarriers(data)
    }
    setLoadingCarriers(false)
  }

  const filteredCarriers = carriers.filter(carrier => {
    const searchLower = searchTerm.toLowerCase()
    return (
      carrier.carrier_id.toLowerCase().includes(searchLower) ||
      carrier.carrier_descr.toLowerCase().includes(searchLower)
    )
  })

  const handleContinue = async () => {
    await onNext({ default_carrier: selectedCarrierId || '' })
  }

  const handleSkip = async () => {
    await onNext({ default_carrier: '' })
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
          Default Carrier
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-4">
          <Truck className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#00A3E1' }} />
          <div>
            <h3 className="font-semibold text-[#333F48] mb-1">What is this for?</h3>
            <p className="text-sm text-[#6b7a85]">
              Set a default carrier for this customer's orders. If the order PDF doesn't specify
              a carrier, this default will be used. This is optional but recommended.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-[#333F48] mb-6">
          Search Carriers (Optional)
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6b7a85]" />
          <input
            type="text"
            placeholder="Search by carrier name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-[#00A3E1] focus:ring-2 focus:ring-[#00A3E1]/20 outline-none"
          />
        </div>
      </div>

      {/* Carrier List */}
      <div className="mb-6">
        {loadingCarriers ? (
          <div className="text-center py-12 text-[#6b7a85]">
            <div className="animate-spin h-8 w-8 border-4 border-[#00A3E1] border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading carriers...
          </div>
        ) : filteredCarriers.length === 0 ? (
          <div className="text-center py-12 text-[#6b7a85]">
            <AlertCircle className="h-12 w-12 mx-auto mb-3" style={{ color: '#00A3E1' }} />
            <p>No carriers found</p>
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
              onClick={() => setSelectedCarrierId(null)}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                selectedCarrierId === null
                  ? 'border-[#00A3E1] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <Truck className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#333F48]">
                      No Default Carrier
                    </h4>
                    <p className="text-sm text-[#6b7a85]">
                      Carrier must be specified on each order
                    </p>
                  </div>
                </div>
                {selectedCarrierId === null && (
                  <div className="w-6 h-6 bg-[#00A3E1] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </div>
            </button>

            {filteredCarriers.map((carrier) => (
              <button
                key={carrier.carrier_id}
                onClick={() => setSelectedCarrierId(carrier.carrier_id)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedCarrierId === carrier.carrier_id
                    ? 'border-[#00A3E1] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#00A3E1]/10 rounded-full flex items-center justify-center">
                      <Truck className="h-5 w-5 text-[#00A3E1]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#333F48]">
                        {carrier.carrier_descr}
                      </h4>
                      <p className="text-sm text-[#6b7a85]">
                        Code: {carrier.carrier_id}
                      </p>
                    </div>
                  </div>
                  {selectedCarrierId === carrier.carrier_id && (
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
        <h3 className="font-semibold text-[#333F48] text-sm" style={{ marginBottom: '4px' }}>Tip:</h3>
        <ul className="text-sm text-[#6b7a85] space-y-1" style={{ paddingLeft: '20px', marginTop: 0 }}>
          <li>Common carriers include UPS, FedEx, DHL, and USPS</li>
          <li>Setting a default will speed up order processing if this customer always uses the same carrier</li>
        </ul>
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
