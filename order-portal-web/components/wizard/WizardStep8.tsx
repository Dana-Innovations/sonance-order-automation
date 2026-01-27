'use client'

import { useState, useEffect } from 'react'
import { WizardStepProps, ShipVia } from '@/lib/types/wizard'
import { createClient } from '@/lib/supabase/client'
import { Search, Package, AlertCircle, ArrowRight } from 'lucide-react'

export function WizardStep8({ session, onNext, isLoading }: WizardStepProps) {
  const [shipVias, setShipVias] = useState<ShipVia[]>([])
  const [loadingShipVias, setLoadingShipVias] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedShipViaCode, setSelectedShipViaCode] = useState<string | null>(
    session.customer_data?.default_ship_via || null
  )

  const supabase = createClient()

  useEffect(() => {
    fetchShipVias()
  }, [])

  const fetchShipVias = async () => {
    setLoadingShipVias(true)
    const { data, error } = await supabase
      .from('ship_vias')
      .select('*')
      .order('ship_via_desc')

    if (!error && data) {
      setShipVias(data)
    }
    setLoadingShipVias(false)
  }

  const filteredShipVias = shipVias.filter(shipVia => {
    const searchLower = searchTerm.toLowerCase()
    return (
      shipVia.ship_via_code.toLowerCase().includes(searchLower) ||
      shipVia.ship_via_desc.toLowerCase().includes(searchLower)
    )
  })

  const handleContinue = async () => {
    await onNext({ default_ship_via: selectedShipViaCode || '' })
  }

  const handleSkip = async () => {
    await onNext({ default_ship_via: '' })
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
          Default Ship Via
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-4">
          <Package className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#00A3E1' }} />
          <div>
            <h3 className="font-semibold text-[#333F48] mb-1">What is this for?</h3>
            <p className="text-sm text-[#6b7a85]">
              Set a default shipping method (Ship Via) for this customer's orders. Common options include
              Ground, 2-Day Air, Next Day Air, etc. If the order PDF doesn't specify a method, this default
              will be used. This is optional but recommended.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-[#333F48] mb-6">
          Search Ship Via Methods (Optional)
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6b7a85]" />
          <input
            type="text"
            placeholder="Search by method name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-[#00A3E1] focus:ring-2 focus:ring-[#00A3E1]/20 outline-none"
          />
        </div>
      </div>

      {/* Ship Via List */}
      <div className="mb-6">
        {loadingShipVias ? (
          <div className="text-center py-12 text-[#6b7a85]">
            <div className="animate-spin h-8 w-8 border-4 border-[#00A3E1] border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading ship via methods...
          </div>
        ) : filteredShipVias.length === 0 ? (
          <div className="text-center py-12 text-[#6b7a85]">
            <AlertCircle className="h-12 w-12 mx-auto mb-3" style={{ color: '#00A3E1' }} />
            <p>No ship via methods found</p>
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
              onClick={() => setSelectedShipViaCode(null)}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                selectedShipViaCode === null
                  ? 'border-[#00A3E1] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#333F48]">
                      No Default Ship Via
                    </h4>
                    <p className="text-sm text-[#6b7a85]">
                      Ship via must be specified on each order
                    </p>
                  </div>
                </div>
                {selectedShipViaCode === null && (
                  <div className="w-6 h-6 bg-[#00A3E1] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </div>
            </button>

            {filteredShipVias.map((shipVia) => (
              <button
                key={shipVia.ship_via_code}
                onClick={() => setSelectedShipViaCode(shipVia.ship_via_code)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedShipViaCode === shipVia.ship_via_code
                    ? 'border-[#00A3E1] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#00A3E1]/10 rounded-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-[#00A3E1]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#333F48]">
                        {shipVia.ship_via_desc}
                      </h4>
                      <p className="text-sm text-[#6b7a85]">
                        Code: {shipVia.ship_via_code}
                      </p>
                    </div>
                  </div>
                  {selectedShipViaCode === shipVia.ship_via_code && (
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
          <li>Common shipping methods include Ground (most economical), 2-Day Air, Next Day Air, and Freight</li>
          <li>Choose what this customer typically uses</li>
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
