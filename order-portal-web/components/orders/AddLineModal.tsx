'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Tables } from '@/lib/types/database'
import { ProductLookupModal } from './ProductLookupModal'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

type Order = Tables<'orders'> & {
  customers: Tables<'customers'> | null
  order_lines: Tables<'order_lines'>[]
}

type WorkflowState = 'calculating' | 'inserting' | 'selecting' | 'editing' | 'saving' | 'success' | 'error'

interface AddLineModalProps {
  order: Order
  userId: string
  onClose: () => void
}

export function AddLineModal({ order, userId, onClose }: AddLineModalProps) {
  const [state, setState] = useState<WorkflowState>('calculating')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [insertedLineId, setInsertedLineId] = useState<string | null>(null)
  const [nextLineNumber, setNextLineNumber] = useState<number>(1)
  const [selectedProduct, setSelectedProduct] = useState<{
    product_id: string
    uom: string
    dfi_price: number
    description: string
  } | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [showProductLookup, setShowProductLookup] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  // Step 1: Calculate next line number on mount
  useEffect(() => {
    const calculateNextLineNumber = async () => {
      try {
        const { data: lines, error } = await supabase
          .from('order_lines')
          .select('cust_line_number')
          .eq('cust_order_number', order.cust_order_number)
          .order('cust_line_number', { ascending: false })
          .limit(1)

        if (error) throw error

        const maxLineNumber = lines?.[0]?.cust_line_number || 0
        const nextNumber = maxLineNumber + 1
        setNextLineNumber(nextNumber)

        // Move to inserting state
        setState('inserting')
      } catch (error: any) {
        console.error('Error calculating next line number:', error)
        setErrorMessage(error.message || 'Failed to calculate line number')
        setState('error')
      }
    }

    calculateNextLineNumber()
  }, [order.cust_order_number, supabase])

  // Step 2: Insert line with default values
  useEffect(() => {
    if (state !== 'inserting') return

    const insertLine = async () => {
      try {
        const { data: newLine, error } = await supabase
          .from('order_lines')
          .insert({
            cust_order_number: order.cust_order_number,
            cust_line_number: nextLineNumber,
            cust_product_sku: 'ADDED_ITEM',
            cust_line_desc: 'Manual Item Add',
            cust_quantity: 1,
            cust_unit_price: 0,
            cust_line_total: 0,
            cust_uom: 'EA',
            cust_currency_code: order.currency_code,
            ps_customer_id: order.ps_customer_id,
            line_status: 'active',
            sonance_quantity: 1,
            sonance_uom: 'EA',
          })
          .select()
          .single()

        if (error) throw error
        if (!newLine) throw new Error('Failed to insert line')

        setInsertedLineId(newLine.id)

        // Move to product selection state and show modal
        setState('selecting')
        setShowProductLookup(true)
      } catch (error: any) {
        console.error('Error inserting line:', error)
        setErrorMessage(error.message || 'Failed to insert line')
        setState('error')
      }
    }

    insertLine()
  }, [state, order, nextLineNumber, supabase])

  // Handle product selection
  const handleProductSelect = async (product: {
    product_id: string
    uom: string
    dfi_price: number
    description: string
  }) => {
    setSelectedProduct(product)
    setShowProductLookup(false)

    if (!insertedLineId) return

    try {
      // Update the line with product information
      const { error } = await supabase
        .from('order_lines')
        .update({
          sonance_prod_sku: product.product_id,
          sonance_uom: product.uom,
          sonance_unit_price: product.dfi_price,
          cust_unit_price: product.dfi_price,
          cust_line_total: quantity * product.dfi_price,
          validated_sku: product.product_id,
          validation_source: 'manual_lookup',
          is_validated: true,
          cust_line_desc: product.description || 'Manual Item Add',
        })
        .eq('id', insertedLineId)

      if (error) throw error

      // Move to editing state (user can adjust quantity)
      setState('editing')
    } catch (error: any) {
      console.error('Error updating line with product:', error)
      setErrorMessage(error.message || 'Failed to update line')
      setState('error')
    }
  }

  // Handle quantity change
  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity)
  }

  // Handle save
  const handleSave = async () => {
    if (!insertedLineId || !selectedProduct) return

    setState('saving')

    try {
      // Update final quantity and line total
      const { error: updateError } = await supabase
        .from('order_lines')
        .update({
          cust_quantity: quantity,
          sonance_quantity: quantity,
          cust_line_total: quantity * selectedProduct.dfi_price,
        })
        .eq('id', insertedLineId)

      if (updateError) throw updateError

      // Create audit log entry
      const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
          order_id: order.id,
          order_line_id: insertedLineId,
          user_id: userId,
          action_type: 'line_added',
          field_name: 'line_status',
          old_value: null,
          new_value: 'active',
          reason: `Manual line item added by user - Line ${nextLineNumber}: ${selectedProduct.product_id}`,
        })

      if (auditError) throw auditError

      setState('success')

      // Close modal after brief success display
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 1000)
    } catch (error: any) {
      console.error('Error saving line:', error)
      setErrorMessage(error.message || 'Failed to save line')
      setState('error')
    }
  }

  // Handle cancel (delete the incomplete line)
  const handleCancel = async () => {
    if (insertedLineId) {
      try {
        await supabase
          .from('order_lines')
          .delete()
          .eq('id', insertedLineId)
      } catch (error) {
        console.error('Error deleting incomplete line:', error)
      }
    }
    onClose()
  }

  // Handle ProductLookupModal close (also cancels)
  const handleProductLookupClose = () => {
    setShowProductLookup(false)
    handleCancel()
  }

  return (
    <>
      {/* Main Modal */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div className="rounded-lg shadow-lg flex flex-col" style={{ width: '500px', maxWidth: '90vw', maxHeight: '80vh', backgroundColor: 'white', border: '1px solid #00A3E1', position: 'relative', top: '-5vh' }}>
          {/* Header */}
          <div className="border-b border-gray-300" style={{ backgroundColor: 'white', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '32px', paddingRight: '32px' }}>
            <h2 className="font-semibold" style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>
              Add Line Item
            </h2>
            <p style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
              Order #{order.cust_order_number} • Line {nextLineNumber}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto flex items-center justify-center" style={{ paddingTop: '32px', paddingBottom: '32px', paddingLeft: '32px', paddingRight: '32px', minHeight: '200px' }}>
            {(state === 'calculating' || state === 'inserting') && (
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 text-[#00A3E1] animate-spin mb-4" />
                <p className="font-medium text-[#333F48]" style={{ fontSize: '13px' }}>
                  {state === 'calculating' ? 'Calculating line number...' : 'Creating line item...'}
                </p>
              </div>
            )}

            {state === 'editing' && selectedProduct && (
              <div className="w-full space-y-4">
                <div>
                  <h3 className="font-medium text-[#333F48] mb-2" style={{ fontSize: '13px' }}>
                    Product Selected
                  </h3>
                  <div className="bg-gray-50 rounded-md p-3 space-y-1" style={{ fontSize: '11px' }}>
                    <div><span className="font-medium">SKU:</span> {selectedProduct.product_id}</div>
                    <div><span className="font-medium">Description:</span> {selectedProduct.description}</div>
                    <div><span className="font-medium">UOM:</span> {selectedProduct.uom}</div>
                    <div><span className="font-medium">Unit Price:</span> ${selectedProduct.dfi_price.toFixed(2)}</div>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[#333F48] mb-2" style={{ fontSize: '13px' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    style={{ fontSize: '13px' }}
                    autoFocus
                  />
                </div>

                <div className="bg-blue-50 rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[#333F48]" style={{ fontSize: '13px' }}>Line Total:</span>
                    <span className="font-semibold text-[#00A3E1]" style={{ fontSize: '15px' }}>
                      ${(quantity * selectedProduct.dfi_price).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {state === 'saving' && (
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 text-[#00A3E1] animate-spin mb-4" />
                <p className="font-medium text-[#333F48]" style={{ fontSize: '13px' }}>
                  Saving line item...
                </p>
              </div>
            )}

            {state === 'success' && (
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="font-semibold text-[#333F48]" style={{ fontSize: '15px' }}>
                  Line Added Successfully!
                </h3>
              </div>
            )}

            {state === 'error' && (
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <h3 className="font-semibold text-[#333F48] mb-2" style={{ fontSize: '15px' }}>
                  Error
                </h3>
                <p className="text-red-600 text-center" style={{ fontSize: '13px' }}>
                  {errorMessage}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-300 flex justify-center gap-3" style={{ backgroundColor: 'white', paddingTop: '20px', paddingBottom: '20px' }}>
            {state === 'editing' && (
              <>
                <button
                  onClick={handleCancel}
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
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="font-medium transition-colors"
                  style={{
                    border: '1px solid #00A3E1',
                    borderRadius: '20px',
                    backgroundColor: '#00A3E1',
                    color: 'white',
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    fontSize: '9px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#008bc4'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#00A3E1'
                  }}
                >
                  Save Line
                </button>
              </>
            )}

            {state === 'error' && (
              <button
                onClick={handleCancel}
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
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Lookup Modal */}
      {showProductLookup && (
        <ProductLookupModal
          orderId={order.id}
          psCustomerId={order.ps_customer_id || ''}
          currencyCode={order.currency_code || 'USD'}
          lineNumber={nextLineNumber}
          onSelect={handleProductSelect}
          onClose={handleProductLookupClose}
        />
      )}
    </>
  )
}
