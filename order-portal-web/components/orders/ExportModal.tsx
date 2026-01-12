'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { generateOrderXML, validateOrderForExport } from '@/lib/xml/orderXMLBuilder'
import { Tables } from '@/lib/types/database'

type Order = Tables<'orders'> & {
  customers: Tables<'customers'>
  order_lines: Tables<'order_lines'>[]
}

export function ExportModal({
  order,
  userId,
  onClose,
}: {
  order: Order
  userId: string
  onClose: () => void
}) {
  const [isExporting, setIsExporting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const validation = validateOrderForExport(order)

  const handleDownload = async () => {
    if (!validation.valid) {
      alert('Order validation failed:\n' + validation.errors.join('\n'))
      return
    }

    setIsExporting(true)

    try {
      // Generate XML
      const xml = generateOrderXML(order)

      // Create blob and download
      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ORDER_${order.cust_order_number}_${new Date().toISOString().split('T')[0]}.xml`
      a.click()
      URL.revokeObjectURL(url)

      // Update order status to Exported (04)
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status_code: '04',
          exported_at: new Date().toISOString(),
          exported_by: userId,
        })
        .eq('id', order.id)

      if (updateError) throw updateError

      // Create status history entry
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status_code: '04',
        changed_by: userId,
        notes: 'Order exported to XML',
      })

      // Log to audit log
      await supabase.from('audit_log').insert({
        order_id: order.id,
        user_id: userId,
        action_type: 'status_change',
        old_value: order.status_code,
        new_value: '04',
        reason: 'Order exported to XML',
      })

      router.refresh()
      onClose()
    } catch (error: any) {
      alert('Error exporting order: ' + error.message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-lg border border-border bg-card shadow-lg flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">
            Export Order to XML
          </h2>
          <div className="space-y-2 text-sm text-foreground">
            <div>
              <span className="font-medium">Order Number:</span> {order.cust_order_number}
            </div>
            <div>
              <span className="font-medium">Customer:</span>{' '}
              {order.customers?.customer_name || order.customername || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Line Items:</span> {order.order_lines?.length || 0}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {!validation.valid && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Validation Errors:
              </h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-foreground mb-2">XML Preview:</h3>
            <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-96">
              {validation.valid ? generateOrderXML(order) : 'Fix validation errors to preview XML'}
            </pre>
          </div>
        </div>
        <div className="p-6 border-t border-border flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={!validation.valid || isExporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Download XML'}
          </button>
        </div>
      </div>
    </div>
  )
}




