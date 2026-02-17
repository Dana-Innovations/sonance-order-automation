'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
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

interface ProductValidationResult {
  lineId: string
  lineNumber: number
  sku: string
  uom: string
  isValid: boolean
  hasProduct: boolean
  hasMatchingUom: boolean
}

interface PriceMismatch {
  lineNumber: number
  productSku: string
  custPrice: number
  sonancePrice: number
  variance: number
}

function validateOrderForPost(order: Order, productValidation?: ProductValidationResult[]): ValidationResult {
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
  if (!order.shipto_name) {
    errors.push('Ship-to Name is required')
  }

  if (!order.cust_shipto_address_line1) {
    errors.push('Ship-to Address Line 1 is required')
  }

  if (!order.cust_shipto_city) {
    errors.push('Ship-to City is required')
  }

  if (!order.cust_shipto_state) {
    errors.push('Ship-to State is required')
  }

  if (!order.cust_shipto_postal_code) {
    errors.push('Ship-to Postal Code is required')
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

  // Validate products against customer_pricing_sync
  if (productValidation) {
    productValidation.forEach((pv) => {
      if (!pv.isValid) {
        if (!pv.hasProduct) {
          errors.push(`Line ${pv.lineNumber}: Product "${pv.sku}" is not valid for this customer (not found in customer pricing)`)
        } else if (!pv.hasMatchingUom) {
          errors.push(`Line ${pv.lineNumber}: UOM "${pv.uom}" does not match customer pricing for product "${pv.sku}"`)
        }
      }
    })
  }

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

  // Validate products against customer_pricing_sync
  // Include line SKUs and UOMs in cache key so it recalculates when lines change
  const lineSkuUomKey = order.order_lines
    ?.map(l => `${l.id}:${l.sonance_prod_sku || l.cust_product_sku}:${l.sonance_uom}:${l.line_status}`)
    .join(',') || ''

  const { data: productValidation, isLoading: isValidating } = useQuery({
    queryKey: ['order-product-validation', order.id, order.ps_customer_id, lineSkuUomKey],
    queryFn: async (): Promise<ProductValidationResult[]> => {
      const activeLines = order.order_lines?.filter(line => line.line_status !== 'cancelled') || []
      const results: ProductValidationResult[] = []

      for (const line of activeLines) {
        // Use validated_sku first, then fall back to sonance_prod_sku
        const productSku = line.validated_sku || line.sonance_prod_sku || line.cust_product_sku
        const uom = line.sonance_uom || 'EA'

        if (!productSku) {
          results.push({
            lineId: line.id,
            lineNumber: line.cust_line_number,
            sku: '',
            uom: uom,
            isValid: false,
            hasProduct: false,
            hasMatchingUom: false,
          })
          continue
        }

        // Check if product exists in customer_pricing_sync for this customer
        const { data: pricing } = await supabase
          .from('customer_pricing_sync')
          .select('product_id, unit_of_measure')
          .eq('cust_id', order.ps_customer_id || '')
          .eq('product_id', productSku)

        if (!pricing || pricing.length === 0) {
          // Product not found for this customer
          results.push({
            lineId: line.id,
            lineNumber: line.cust_line_number,
            sku: productSku,
            uom: uom,
            isValid: false,
            hasProduct: false,
            hasMatchingUom: false,
          })
          continue
        }

        // Check if any of the pricing records have matching UOM
        const hasMatchingUom = pricing.some(p => p.unit_of_measure === uom)

        results.push({
          lineId: line.id,
          lineNumber: line.cust_line_number,
          sku: productSku,
          uom: uom,
          isValid: hasMatchingUom,
          hasProduct: true,
          hasMatchingUom: hasMatchingUom,
        })
      }

      return results
    },
    enabled: !!order.ps_customer_id,
  })

  // Calculate price mismatches for warning display
  // Include line prices in cache key so it recalculates when lines change
  const lineDataKey = order.order_lines
    ?.map(l => `${l.id}:${l.cust_unit_price}:${l.sonance_unit_price}:${l.line_status}`)
    .join(',') || ''

  const { data: priceMismatches } = useQuery({
    queryKey: ['order-price-mismatches', order.id, order.ps_customer_id, lineDataKey],
    queryFn: async (): Promise<PriceMismatch[]> => {
      const activeLines = order.order_lines?.filter(line => line.line_status !== 'cancelled') || []
      const mismatches: PriceMismatch[] = []

      for (const line of activeLines) {
        const productSku = line.validated_sku || line.sonance_prod_sku || line.cust_product_sku
        const custPrice = line.cust_unit_price
        const sonancePrice = line.sonance_unit_price

        // Skip if no product SKU or prices are missing
        if (!productSku || custPrice == null || sonancePrice == null) continue

        // Compare customer PO price vs the actual Sonance price that will be sent to PeopleSoft
        const variance = ((sonancePrice - custPrice) / custPrice) * 100

        // Only add if there's a price difference (more than 1 cent)
        if (Math.abs(variance) >= 0.01) {
          mismatches.push({
            lineNumber: line.cust_line_number,
            productSku: productSku,
            custPrice: custPrice,
            sonancePrice: sonancePrice,
            variance: variance
          })
        }
      }

      return mismatches
    },
    enabled: !!order.ps_customer_id,
  })

  const validation = validateOrderForPost(order, productValidation)

  const handlePostOrder = async () => {
    if (!validation.valid || !confirmed) return

    setIsProcessing(true)
    setStep('processing')

    try {
      // Step 1: Generate XML
      const xml = generateOrderXML(order)
      setXmlContent(xml)

      // Step 2: Save product mappings for ML learning
      // Exclude cancelled lines and manually added lines
      const activeLines = order.order_lines?.filter(line =>
        line.line_status !== 'cancelled' &&
        line.validation_source !== 'manual_add'
      ) || []
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
            p_cust_order_number: order.cust_order_number,
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
                  cust_order_number: order.cust_order_number,
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
                  cust_order_number: order.cust_order_number,
                })
            }
          }
          
          mappingsCount++
        }
      }
      setMappingsSaved(mappingsCount)

      // Step 3: Update order status to Upload in Process (04)
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status_code: '04',
          exported_at: new Date().toISOString(),
          exported_by: userId,
        })
        .eq('id', order.id)

      if (updateError) throw updateError

      // Step 4: Create status history entry
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status_code: '04',
        changed_by: userId,
        notes: `Order posted and exported to XML. ${mappingsCount} product mappings saved. Waiting for PeopleSoft order number.`,
      })

      // Step 5: Log to audit log
      await supabase.from('audit_log').insert({
        order_id: order.id,
        user_id: userId,
        action_type: 'order_posted',
        old_value: order.status_code,
        new_value: '04',
        reason: `Order posted to PeopleSoft (Upload in Process). ${mappingsCount} product mappings saved for ML learning. Status will update to Upload Successful once PS order number is received.`,
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '525px', maxWidth: '90vw', maxHeight: '80vh', backgroundColor: 'white', border: '1px solid #00A3E1', position: 'relative', top: '-5vh' }}>
        {/* Header */}
        <div className="border-b border-gray-300" style={{ backgroundColor: 'white', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '32px', paddingRight: '32px' }}>
          <h2 className="font-semibold" style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>
            Post Order to PeopleSoft
          </h2>
          <p style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
            Order #{order.cust_order_number} • {order.customers?.customer_name || order.customername}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ paddingTop: '8px', paddingBottom: '32px', paddingLeft: '32px', paddingRight: '32px' }}>
          {step === 'validate' && (
            <>
              {/* Validation Checklist */}
              <div className="space-y-3 mb-6">
                <h3 className="font-medium text-[#333F48] uppercase tracking-wider" style={{ fontSize: '13px' }}>
                  Validation Checklist
                </h3>
                
                <div className="space-y-2">
                  <ValidationItem
                    passed={!!order.shipto_name}
                    label="Ship-to Name provided"
                  />
                  <ValidationItem
                    passed={!!order.cust_shipto_address_line1}
                    label="Ship-to Address Line 1 provided"
                  />
                  <ValidationItem
                    passed={!!order.cust_shipto_city}
                    label="Ship-to City provided"
                  />
                  <ValidationItem
                    passed={!!order.cust_shipto_state}
                    label="Ship-to State provided"
                  />
                  <ValidationItem
                    passed={!!order.cust_shipto_postal_code}
                    label="Ship-to Postal Code provided"
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
                  <ValidationItem
                    passed={!isValidating && productValidation?.every(pv => pv.isValid) || false}
                    label="All products valid for customer with matching UOM"
                    isLoading={isValidating}
                  />
                </div>
              </div>

              {/* Errors */}
              {validation.errors.length > 0 && (
                <div className="mb-4 rounded-md p-4" style={{ backgroundColor: '#fee', border: '2px solid #dc2626' }}>
                  <h3 className="font-bold mb-3 flex items-center gap-2" style={{ fontSize: '14px', color: '#dc2626' }}>
                    <XCircle className="h-5 w-5" style={{ color: '#dc2626' }} />
                    Validation Errors - Cannot Post Order
                  </h3>
                  <ul className="list-disc list-inside space-y-2" style={{ fontSize: '13px', color: '#b91c1c', fontWeight: '500', paddingLeft: '8px' }}>
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-4">
                  <h3 className="font-medium text-amber-800 mb-2 flex items-center gap-2" style={{ fontSize: '13px' }}>
                    <AlertTriangle className="h-4 w-4" />
                    Notices
                  </h3>
                  <ul className="list-disc list-inside text-amber-700 space-y-1" style={{ fontSize: '13px' }}>
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Price Mismatches */}
              {priceMismatches && priceMismatches.length > 0 && (
                <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-4">
                  <h3 className="font-medium text-amber-800 mb-2 flex items-center gap-2" style={{ fontSize: '13px' }}>
                    <AlertTriangle className="h-4 w-4" />
                    Price Mismatches ({priceMismatches.length} line{priceMismatches.length > 1 ? 's' : ''})
                  </h3>
                  <p className="text-amber-700 mb-2" style={{ fontSize: '12px' }}>
                    The following items have different prices than your customer pricing table.
                  </p>
                  <ul className="list-disc list-inside text-amber-700 space-y-1" style={{ fontSize: '12px' }}>
                    {priceMismatches.map((mismatch, index) => (
                      <li key={index}>
                        Line {mismatch.lineNumber} ({mismatch.productSku}):
                        {' '}PO ${mismatch.custPrice.toFixed(2)} vs
                        {' '}Pricing ${mismatch.sonancePrice.toFixed(2)}
                        {' '}({mismatch.variance > 0 ? '+' : ''}{mismatch.variance.toFixed(1)}%)
                      </li>
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
                    <span className="text-[#333F48]" style={{ fontSize: '13px' }}>
                      I confirm this order is ready to be posted to PeopleSoft.
                    </span>
                  </label>
                </div>
              )}
            </>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-[#00A3E1] animate-spin mb-4" />
              <p className="font-medium text-[#333F48]" style={{ fontSize: '17px' }}>Processing Order...</p>
              <p className="text-[#6b7a85] mt-2" style={{ fontSize: '13px' }}>
                Generating XML and saving product mappings
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="font-semibold text-[#333F48] mb-2" style={{ fontSize: '17px' }}>
                Order Posted Successfully!
              </h3>
              <p className="text-[#6b7a85] text-center mb-6" style={{ fontSize: '13px' }}>
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
              <h3 className="font-semibold text-[#333F48] mb-2" style={{ fontSize: '17px' }}>
                Error Posting Order
              </h3>
              <p className="text-red-600 text-center" style={{ fontSize: '13px' }}>
                {errorMessage}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 flex justify-center gap-3" style={{ backgroundColor: 'white', paddingTop: '20px', paddingBottom: '20px' }}>
          <button
            onClick={handleClose}
            className="font-medium transition-colors"
            style={{
              border: '1px solid #00A3E1',
              borderRadius: '20px',
              backgroundColor: 'white',
              color: '#00A3E1',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingTop: '6px',
              paddingBottom: '6px',
              fontSize: '9px',
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
            {step === 'success' ? 'Close' : 'Cancel'}
          </button>

          {step === 'validate' && (
            <button
              onClick={handlePostOrder}
              disabled={!validation.valid || !confirmed || isProcessing || isValidating}
              className="font-medium transition-colors"
              style={{
                border: '1px solid #00A3E1',
                borderRadius: '20px',
                backgroundColor: !validation.valid || !confirmed || isProcessing || isValidating ? '#ccc' : '#00A3E1',
                color: 'white',
                paddingLeft: '20px',
                paddingRight: '20px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '9px',
                cursor: !validation.valid || !confirmed || isProcessing || isValidating ? 'not-allowed' : 'pointer',
                opacity: !validation.valid || !confirmed || isProcessing || isValidating ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!(!validation.valid || !confirmed || isProcessing || isValidating)) {
                  e.currentTarget.style.backgroundColor = '#008bc4'
                }
              }}
              onMouseLeave={(e) => {
                if (!(!validation.valid || !confirmed || isProcessing || isValidating)) {
                  e.currentTarget.style.backgroundColor = '#00A3E1'
                }
              }}
            >
              Post Order
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ValidationItem({ passed, label, isLoading }: { passed: boolean; label: string; isLoading?: boolean }) {
  return (
    <div className="flex items-center" style={{ gap: '16px' }}>
      {isLoading ? (
        <Loader2 className="text-[#00A3E1] animate-spin" style={{ width: '17px', height: '17px' }} />
      ) : passed ? (
        <CheckCircle style={{ width: '17px', height: '17px', color: '#16a34a' }} />
      ) : (
        <XCircle style={{ width: '17px', height: '17px', color: '#dc2626' }} />
      )}
      <span style={{ fontSize: '13px', color: isLoading ? '#6b7a85' : passed ? '#333F48' : '#dc2626', fontWeight: passed ? '400' : '600' }}>
        {label}
      </span>
    </div>
  )
}
















