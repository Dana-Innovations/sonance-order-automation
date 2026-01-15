'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { generateOrderXML } from '@/lib/xml/orderXMLBuilder'
import { Tables } from '@/lib/types/database'
import { CheckCircle, XCircle, Loader2, Download, AlertTriangle } from 'lucide-react'

type Order = Tables<'orders'> & {
  customers: Tables<'customers'>
  order_lines: Tables<'order_lines'>[]
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

function validateOrderForPost(order: Order): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!order.cust_order_number) {
    errors.push('Order number is required')
  }

  if (!order.ps_customer_id) {
    errors.push('Customer ID is required')
  }

  // Ship-to address validation
  if (!order.cust_shipto_address_line1 || !order.cust_shipto_city || !order.cust_shipto_state) {
    errors.push('Complete ship-to address is required (Address Line 1, City, State)')
  }

  // Carrier and Ship Via validation
  if (!order.cust_carrier) {
    errors.push('Carrier is required')
  }

  if (!order.cust_ship_via) {
    errors.push('Ship Via is required')
  }

  // Order lines validation
  if (!order.order_lines || order.order_lines.length === 0) {
    errors.push('At least one order line is required')
  }

  // Validate each order line
  const activeLines = order.order_lines?.filter(line => line.line_status !== 'cancelled') || []
  
  if (activeLines.length === 0) {
    errors.push('At least one active (non-cancelled) order line is required')
  }

  activeLines.forEach((line) => {
    // Check for Sonance product SKU (either mapped or original)
    const sonanceSku = line.sonance_prod_sku || line.cust_product_sku
    if (!sonanceSku) {
      errors.push(`Line ${line.cust_line_number}: Sonance Product SKU is required`)
    }
    
    if (!line.cust_quantity || line.cust_quantity <= 0) {
      errors.push(`Line ${line.cust_line_number}: Valid quantity is required`)
    }
    
    if (line.cust_unit_price === null || line.cust_unit_price === undefined || line.cust_unit_price < 0) {
      errors.push(`Line ${line.cust_line_number}: Valid unit price is required`)
    }

    // Warnings for potential issues
    if (line.sonance_prod_sku && line.sonance_prod_sku !== line.cust_product_sku) {
      warnings.push(`Line ${line.cust_line_number}: Product was remapped from "${line.cust_product_sku}" to "${line.sonance_prod_sku}"`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function PostOrderModal({
  order,
  userId,
  onClose,
}: {
  order: Order
  userId: string
  onClose: () => void
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<'validate' | 'confirm' | 'processing' | 'success' | 'error'>('validate')
  const [confirmed, setConfirmed] = useState(false)
  const [xmlContent, setXmlContent] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [mappingsSaved, setMappingsSaved] = useState(0)
  const supabase = createClient()
  const router = useRouter()

  const validation = validateOrderForPost(order)

  const handlePostOrder = async () => {
    if (!validation.valid || !confirmed) return

    setIsProcessing(true)
    setStep('processing')

    try {
      // Step 1: Generate XML
      const xml = generateOrderXML(order)
      setXmlContent(xml)

      // Step 2: Save product mappings for ML learning
      const activeLines = order.order_lines?.filter(line => line.line_status !== 'cancelled') || []
      let mappingsCount = 0

      for (const line of activeLines) {
        // Only save mapping if there's a valid customer SKU
        if (line.cust_product_sku) {
          const sonanceSku = line.sonance_prod_sku || line.cust_product_sku
          
          // Upsert the mapping - if it exists, update times_used and last_used_at
          const { error: mappingError } = await supabase.rpc('upsert_product_mapping', {
            p_ps_customer_id: order.ps_customer_id,
            p_cust_product_sku: line.cust_product_sku,
            p_cust_product_desc: line.cust_line_desc || null,
            p_sonance_product_sku: sonanceSku,
            p_created_by_order_id: order.id,
          })

          // If RPC doesn't exist, fall back to regular upsert
          if (mappingError && mappingError.code === 'PGRST202') {
            // RPC not found, use regular upsert
            const { data: existingMapping } = await supabase
              .from('customer_product_mappings')
              .select('id, times_used')
              .eq('ps_customer_id', order.ps_customer_id)
              .eq('cust_product_sku', line.cust_product_sku)
              .single()

            if (existingMapping) {
              // Update existing mapping
              await supabase
                .from('customer_product_mappings')
                .update({
                  sonance_product_sku: sonanceSku,
                  cust_product_desc: line.cust_line_desc || null,
                  times_used: (existingMapping.times_used || 1) + 1,
                  last_used_at: new Date().toISOString(),
                  confidence_score: 1.00, // User confirmed
                })
                .eq('id', existingMapping.id)
            } else {
              // Insert new mapping
              await supabase
                .from('customer_product_mappings')
                .insert({
                  ps_customer_id: order.ps_customer_id,
                  cust_product_sku: line.cust_product_sku,
                  cust_product_desc: line.cust_line_desc || null,
                  sonance_product_sku: sonanceSku,
                  confidence_score: 1.00,
                  times_used: 1,
                  created_by_order_id: order.id,
                })
            }
          }
          
          mappingsCount++
        }
      }
      setMappingsSaved(mappingsCount)

      // Step 3: Update order status to Upload Successful (05)
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status_code: '05',
          exported_at: new Date().toISOString(),
          exported_by: userId,
        })
        .eq('id', order.id)

      if (updateError) throw updateError

      // Step 4: Create status history entry
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status_code: '05',
        changed_by: userId,
        notes: `Order posted and exported to XML. ${mappingsCount} product mappings saved.`,
      })

      // Step 5: Log to audit log
      await supabase.from('audit_log').insert({
        order_id: order.id,
        user_id: userId,
        action_type: 'order_posted',
        old_value: order.status_code,
        new_value: '05',
        reason: `Order posted to PeopleSoft. ${mappingsCount} product mappings saved for ML learning.`,
      })

      setStep('success')
    } catch (error: any) {
      console.error('Error posting order:', error)
      setErrorMessage(error.message || 'An unexpected error occurred')
      setStep('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadXML = () => {
    if (!xmlContent) return

    const blob = new Blob([xmlContent], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ORDER_${order.cust_order_number}_${new Date().toISOString().split('T')[0]}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClose = () => {
    if (step === 'success') {
      router.refresh()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-lg border border-gray-200 bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-[#333F48]">
            Post Order to PeopleSoft
          </h2>
          <p className="text-sm text-[#6b7a85] mt-1">
            Order #{order.cust_order_number} • {order.customers?.customer_name || order.customername}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'validate' && (
            <>
              {/* Validation Checklist */}
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-medium text-[#333F48] uppercase tracking-wider">
                  Validation Checklist
                </h3>
                
                <div className="space-y-2">
                  <ValidationItem
                    passed={!!order.cust_shipto_address_line1 && !!order.cust_shipto_city && !!order.cust_shipto_state}
                    label="Ship-to address complete"
                  />
                  <ValidationItem
                    passed={!!order.cust_carrier}
                    label="Carrier selected"
                  />
                  <ValidationItem
                    passed={!!order.cust_ship_via}
                    label="Ship Via selected"
                  />
                  <ValidationItem
                    passed={(order.order_lines?.filter(l => l.line_status !== 'cancelled').length || 0) > 0}
                    label="At least one active line item"
                  />
                  <ValidationItem
                    passed={order.order_lines?.filter(l => l.line_status !== 'cancelled').every(l => l.sonance_prod_sku || l.cust_product_sku) || false}
                    label="All line items have Sonance product SKU"
                  />
                </div>
              </div>

              {/* Errors */}
              {validation.errors.length > 0 && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
                  <h3 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Validation Errors
                  </h3>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-4">
                  <h3 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Notices
                  </h3>
                  <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confirmation */}
              {validation.valid && (
                <div className="mt-6 p-4 bg-gray-50 rounded-md">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1 rounded border-gray-300"
                    />
                    <span className="text-sm text-[#333F48]">
                      I confirm this order is ready to be posted to PeopleSoft. 
                      Product mappings will be saved for future order processing.
                    </span>
                  </label>
                </div>
              )}
            </>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-[#00A3E1] animate-spin mb-4" />
              <p className="text-lg font-medium text-[#333F48]">Processing Order...</p>
              <p className="text-sm text-[#6b7a85] mt-2">
                Generating XML and saving product mappings
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-[#333F48] mb-2">
                Order Posted Successfully!
              </h3>
              <p className="text-sm text-[#6b7a85] text-center mb-6">
                Order #{order.cust_order_number} has been posted to PeopleSoft.
                <br />
                {mappingsSaved} product mapping{mappingsSaved !== 1 ? 's' : ''} saved for ML learning.
              </p>
              
              {xmlContent && (
                <button
                  onClick={handleDownloadXML}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A3E1] text-white rounded-md text-sm font-medium hover:bg-[#008bc4] transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download XML File
                </button>
              )}
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-[#333F48] mb-2">
                Error Posting Order
              </h3>
              <p className="text-sm text-red-600 text-center">
                {errorMessage}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-100 text-[#333F48] rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {step === 'success' ? 'Close' : 'Cancel'}
          </button>
          
          {step === 'validate' && (
            <button
              onClick={handlePostOrder}
              disabled={!validation.valid || !confirmed || isProcessing}
              className="px-4 py-2 bg-[#00A3E1] text-white rounded-md text-sm font-medium hover:bg-[#008bc4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Post Order
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ValidationItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {passed ? (
        <CheckCircle className="h-5 w-5 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      )}
      <span className={`text-sm ${passed ? 'text-[#333F48]' : 'text-red-600'}`}>
        {label}
      </span>
    </div>
  )
}


