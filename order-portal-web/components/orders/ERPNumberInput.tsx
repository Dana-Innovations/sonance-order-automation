'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Tables } from '@/lib/types/database'

type Order = Tables<'orders'>

export function ERPNumberInput({
  order,
  userId,
}: {
  order: Order
  userId: string
}) {
  const [erpNumber, setErpNumber] = useState(order.ps_order_number || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const validateERPNumber = (value: string): boolean => {
    // Alphanumeric, 10-15 characters
    return /^[A-Za-z0-9]{10,15}$/.test(value)
  }

  const handleSave = async () => {
    if (!validateERPNumber(erpNumber)) {
      setError('ERP number must be alphanumeric and 10-15 characters')
      return
    }

    // Check for duplicates
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('ps_order_number', erpNumber)
      .neq('id', order.id)
      .single()

    if (existing) {
      setError('This ERP order number is already in use')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Update order
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          ps_order_number: erpNumber,
          status_code: '05', // ERP Processed
          erp_processed_at: new Date().toISOString(),
          erp_processed_by: userId,
        })
        .eq('id', order.id)

      if (updateError) throw updateError

      // Create status history entry
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status_code: '05',
        changed_by: userId,
        notes: `ERP order number: ${erpNumber}`,
      })

      // Log to audit log
      await supabase.from('audit_log').insert({
        order_id: order.id,
        user_id: userId,
        action_type: 'status_change',
        old_value: order.status_code,
        new_value: '05',
        reason: `ERP order number entered: ${erpNumber}`,
      })

      router.refresh()
    } catch (error: any) {
      setError('Error saving ERP number: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={erpNumber}
        onChange={(e) => {
          setErpNumber(e.target.value)
          setError(null)
        }}
        placeholder="Enter PeopleSoft Order Number"
        maxLength={15}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        onClick={handleSave}
        disabled={!validateERPNumber(erpNumber) || isSaving}
        className="py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          border: '1px solid #00A3E1',
          borderRadius: '20px',
          backgroundColor: 'white',
          color: '#00A3E1',
          paddingLeft: '16px',
          paddingRight: '16px'
        }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.backgroundColor = '#00A3E1'
            e.currentTarget.style.color = 'white'
          }
        }}
        onMouseLeave={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#00A3E1'
          }
        }}
      >
        {isSaving ? 'Saving...' : 'Save ERP Number'}
      </button>
      {error && (
        <span className="text-sm text-destructive">{error}</span>
      )}
    </div>
  )
}





