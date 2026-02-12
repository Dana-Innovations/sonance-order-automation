'use client'

import { useState, useEffect } from 'react'
import { WizardStepProps, Carrier } from '@/lib/types/wizard'
import { createClient } from '@/lib/supabase/client'
import { Truck, AlertCircle, ArrowRight } from 'lucide-react'

export function WizardStep7({ session, onNext, isLoading }: WizardStepProps) {
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [loadingCarriers, setLoadingCarriers] = useState(true)
  const [selectedCarrierKey, setSelectedCarrierKey] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchCarriers()
  }, [])

  useEffect(() => {
    // Set initial selection if customer already has defaults
    if (session.customer_data?.default_carrier && session.customer_data?.default_ship_via) {
      const key = `${session.customer_data.default_carrier}|${session.customer_data.default_ship_via}`
      setSelectedCarrierKey(key)
    }
  }, [session.customer_data])

  const fetchCarriers = async () => {
    setLoadingCarriers(true)
    const { data, error } = await supabase
      .from('carriers')
      .select('*')
      .eq('is_active', true)
      .order('carrier_id, ship_via_code')

    if (!error && data) {
      setCarriers(data)
    }
    setLoadingCarriers(false)
  }

  const handleContinue = async () => {
    if (!selectedCarrierKey) {
      await onNext({ default_carrier: '', default_ship_via: '' })
      return
    }

    const [carrierId, shipViaCode] = selectedCarrierKey.split('|')
    await onNext({
      default_carrier: carrierId,
      default_ship_via: shipViaCode
    })
  }

  const handleSkip = async () => {
    await onNext({ default_carrier: '', default_ship_via: '' })
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
          Default Carrier & Ship Via Method
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#333F48] mb-2 flex items-center gap-3">
          <Truck className="h-5 w-5 flex-shrink-0" style={{ color: '#00A3E1' }} />
          What is this for?
        </h3>
        <p className="text-sm text-[#6b7a85]" style={{ marginLeft: '32px' }}>
          Set a default carrier and ship via method for this customer's orders. If the order PDF doesn't specify
          a carrier, this default will be used. This is optional but recommended.
        </p>
      </div>

      {/* Carrier & Ship Via List */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#333F48] mb-6">
          Select Carrier & Ship Via (Optional)
        </label>
        {loadingCarriers ? (
          <div className="text-center py-12 text-[#6b7a85]">
            <div className="animate-spin h-8 w-8 border-4 border-[#00A3E1] border-t-transparent rounded-full mx-auto mb-3"></div>
            Loading carriers...
          </div>
        ) : carriers.length === 0 ? (
          <div className="text-center py-12 text-[#6b7a85]">
            <AlertCircle className="h-12 w-12 mx-auto mb-3" style={{ color: '#00A3E1' }} />
            <p>No carriers found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {/* None Option */}
            <button
              onClick={() => setSelectedCarrierKey(null)}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                selectedCarrierKey === null
                  ? 'border-[#00A3E1] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-[#333F48]" style={{ marginBottom: '2px' }}>
                    No Default Carrier
                  </h4>
                  <p className="text-sm text-[#6b7a85]" style={{ margin: 0 }}>
                    Carrier must be specified on each order
                  </p>
                </div>
                {selectedCarrierKey === null && (
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

            {carriers.map((carrier) => {
              const carrierKey = `${carrier.carrier_id}|${carrier.ship_via_code}`
              return (
                <button
                  key={carrierKey}
                  onClick={() => setSelectedCarrierKey(carrierKey)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    selectedCarrierKey === carrierKey
                      ? 'border-[#00A3E1] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-[#333F48]" style={{ marginBottom: '2px' }}>
                        {carrier.carrier_descr} - {carrier.ship_via_desc}
                      </h4>
                      <p className="text-sm text-[#6b7a85]" style={{ margin: 0 }}>
                        Carrier: {carrier.carrier_id} | Ship Via: {carrier.ship_via_code}
                      </p>
                    </div>
                    {selectedCarrierKey === carrierKey && (
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
              )
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#333F48] text-sm" style={{ marginBottom: '4px' }}>Tip:</h3>
        <ul className="text-sm text-[#6b7a85] space-y-1" style={{ paddingLeft: '20px', marginTop: 0 }}>
          <li>Each option shows a valid carrier and ship via combination</li>
          <li>Setting a default will speed up order processing if this customer always uses the same carrier and shipping method</li>
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
