'use client'

import { useState, useEffect } from 'react'
import { WizardStepProps, Customer } from '@/lib/types/wizard'
import { Copy, Sparkles, Search, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function WizardStep0({ session, onNext, isLoading }: WizardStepProps) {
  const [choice, setChoice] = useState<'scratch' | 'copy' | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [loadingCustomers, setLoadingCustomers] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (choice === 'copy') {
      fetchCustomers()
    }
  }, [choice])

  const fetchCustomers = async () => {
    setLoadingCustomers(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('customer_name')

    if (!error && data) {
      setCustomers(data)
    }
    setLoadingCustomers(false)
  }

  const filteredCustomers = customers.filter(c =>
    c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ps_customer_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedCustomer = customers.find(c => c.ps_customer_id === selectedCustomerId)

  const handleContinue = async () => {
    if (choice === 'scratch') {
      // Start from scratch - just move to next step
      await onNext({})
    } else if (choice === 'copy' && selectedCustomer) {
      // Copy customer data
      const isMultiAccount = selectedCustomer.ps_customer_id === 'MULTI'

      // Fetch child accounts if multi-account
      let childAccounts: any[] = []
      if (isMultiAccount) {
        const { data } = await supabase
          .from('customer_child_accounts')
          .select('*')
          .eq('customer_ps_id', 'MULTI')
          .order('display_order')

        if (data) {
          childAccounts = data.map(ca => ({
            ps_account_id: ca.child_ps_account_id,
            routing_description: ca.routing_description,
            display_order: ca.display_order
          }))
        }
      }

      // Pre-populate wizard with customer data
      await onNext({
        customer_name: '', // Blank - must be unique
        ps_customer_id: isMultiAccount ? 'MULTI' : '', // Blank if single
        is_multi_account: isMultiAccount,
        sender_email: '', // Blank - must be unique
        sharepoint_folder_id: '', // Blank - must be unique
        csr_id: selectedCustomer.csr_id || '',
        default_carrier: selectedCustomer.default_carrier || '',
        default_ship_via: selectedCustomer.default_ship_via || '',
        default_shipto_name: selectedCustomer.default_shipto_name || '',
        is_active: true,
        copied_from_customer_id: selectedCustomer.ps_customer_id,
        copied_from_customer_name: selectedCustomer.customer_name
      }, childAccounts)
    }
  }

  return (
    <div>
      {!choice && (
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
              How would you like to set up this customer?
            </h2>
            <p className="text-[#6b7a85]">
              Choose the option that works best for you
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Start from Scratch */}
            <button
              onClick={async () => {
                setChoice('scratch')
                await onNext({})
              }}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#00A3E1] hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-[#00A3E1] transition-colors">
                  <Sparkles className="h-6 w-6 text-[#00A3E1] group-hover:text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[#333F48]">
                  Start from Scratch
                </h3>
              </div>
              <p className="text-sm text-[#6b7a85]">
                Create a completely new customer with fresh settings
              </p>
            </button>

            {/* Copy from Existing */}
            <button
              onClick={() => setChoice('copy')}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#00A3E1] hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-[#00A3E1] transition-colors">
                  <Copy className="h-6 w-6 text-[#00A3E1] group-hover:text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[#333F48]">
                  Copy from Existing
                </h3>
              </div>
              <p className="text-sm text-[#6b7a85]">
                Start with settings from another customer and modify
              </p>
            </button>
          </div>
        </div>
      )}

      {choice === 'copy' && (
        <>
          <button
            onClick={() => setChoice(null)}
            className="mb-6 text-sm text-[#6b7a85] hover:text-[#333F48]"
          >
            ← Change selection
          </button>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#333F48] mb-4">
              Select Customer to Copy From
            </h2>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6b7a85]" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-[#00A3E1] focus:ring-2 focus:ring-[#00A3E1]/20 outline-none"
              />
            </div>

            {/* Customer List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loadingCustomers ? (
                <div className="text-center py-8 text-[#6b7a85]">
                  Loading customers...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-[#6b7a85]">
                  No customers found
                </div>
              ) : (
                filteredCustomers.map(customer => (
                  <button
                    key={customer.ps_customer_id}
                    onClick={() => setSelectedCustomerId(customer.ps_customer_id)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      selectedCustomerId === customer.ps_customer_id
                        ? 'border-[#00A3E1] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#333F48] mb-1">
                          {customer.customer_name}
                        </h4>
                        <p className="text-sm text-[#6b7a85] mb-2">
                          PS ID: {customer.ps_customer_id}
                          {customer.ps_customer_id === 'MULTI' && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              Multi-Account
                            </span>
                          )}
                        </p>
                        <div className="flex gap-4 text-xs text-[#6b7a85]">
                          {customer.default_carrier && (
                            <span>Carrier: {customer.default_carrier}</span>
                          )}
                          {customer.order_header_prompt && customer.order_line_prompt && (
                            <span className="text-green-600">✓ Has AI Prompts</span>
                          )}
                        </div>
                      </div>
                      {selectedCustomerId === customer.ps_customer_id && (
                        <div className="w-6 h-6 bg-[#00A3E1] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* What Will Be Copied */}
          {selectedCustomer && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-[#333F48] mb-3">What will be copied:</h3>
              <ul className="space-y-1 text-sm text-[#6b7a85]">
                <li>✓ Multi-account status {selectedCustomer.ps_customer_id === 'MULTI' && '(+ child accounts)'}</li>
                <li>✓ Default carrier and ship via settings</li>
                <li>✓ Default ship-to name</li>
                {selectedCustomer.order_header_prompt && <li>✓ Order Header AI Prompt</li>}
                {selectedCustomer.order_line_prompt && <li>✓ Order Line AI Prompt</li>}
                {selectedCustomer.MultiAccount_Prompt && <li>✓ Multi-Account Routing Prompt</li>}
              </ul>
              <h3 className="font-semibold text-[#333F48] mt-4 mb-2">You'll need to provide:</h3>
              <ul className="space-y-1 text-sm text-[#6b7a85]">
                <li>✗ Customer name (must be unique)</li>
                {selectedCustomer.ps_customer_id !== 'MULTI' && <li>✗ PeopleSoft Customer ID</li>}
                <li>✗ Sender email addresses</li>
                <li>✗ SharePoint Folder ID</li>
              </ul>
            </div>
          )}
        </>
      )}

      {choice && (
        <div className="flex justify-end mt-6">
          <button
            onClick={handleContinue}
            disabled={isLoading || (choice === 'copy' && !selectedCustomerId)}
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
              if (!isLoading && !(choice === 'copy' && !selectedCustomerId)) {
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
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
