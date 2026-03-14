import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrderDetail } from '@/components/orders/OrderDetail'
import { assignPSOrderNumber } from '@/lib/utils/assignPSOrderNumber'

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    redirect('/orders')
  }

  // Fetch related data
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('ps_customer_id', order.ps_customer_id)
    .single()

  const { data: status } = await supabase
    .from('order_statuses')
    .select('*')
    .eq('status_code', order.status_code)
    .single()

  const { data: orderLines } = await supabase
    .from('order_lines')
    .select('*')
    .eq('cust_order_number', order.cust_order_number)
    .order('cust_line_number')

  // Auto-populate ship-to customer ID for multi-territory customers
  let updatedOrder = order
  if (customer?.is_multi_territory && !order.ps_shipto_customer_id && order.cust_shipto_city && order.cust_shipto_state) {
    const { data: territoryMatch } = await supabase
      .from('customer_territory_shipto')
      .select('shipto_ps_customer_id')
      .eq('parent_ps_customer_id', order.ps_customer_id)
      .eq('is_active', true)
      .ilike('city', order.cust_shipto_city)
      .ilike('state', order.cust_shipto_state)
      .eq('country_code', order.cust_shipto_country || 'USA')
      .maybeSingle()

    if (territoryMatch?.shipto_ps_customer_id) {
      // Update the order with the matched ship-to customer ID
      const { data: orderUpdateResult } = await supabase
        .from('orders')
        .update({ ps_shipto_customer_id: territoryMatch.shipto_ps_customer_id })
        .eq('id', orderId)
        .select()
        .single()

      if (orderUpdateResult) {
        updatedOrder = orderUpdateResult

        // Log the auto-population
        await supabase.from('audit_log').insert({
          order_id: orderId,
          user_id: user.id,
          action_type: 'ship_to_customer_id_auto_populated',
          field_name: 'ps_shipto_customer_id',
          new_value: territoryMatch.shipto_ps_customer_id,
          reason: `Auto-populated based on ship-to address: ${order.cust_shipto_city}, ${order.cust_shipto_state}`,
        })
      }
    }
  }

  const enrichedOrder = {
    ...updatedOrder,
    customers: customer!,
    order_statuses: status!,
    order_lines: orderLines || [],
  }

  // Auto-assign PS Order Number if order is NEW and doesn't have one yet
  if (enrichedOrder.status_code === '01' && !enrichedOrder.ps_order_number) {
    const { psOrderNumber, error: assignError } = await assignPSOrderNumber(
      supabase,
      orderId
    )

    if (!assignError && psOrderNumber) {
      // Log the PS order number assignment
      await supabase.from('audit_log').insert({
        order_id: orderId,
        user_id: user.id,
        action_type: 'ps_order_number_assigned',
        new_value: psOrderNumber,
        reason: 'Auto-assigned when NEW order opened',
      })

      // Update the enriched order with the new number
      enrichedOrder.ps_order_number = psOrderNumber
    }
  }

  // Auto-update status to "Under Review" if status is "Pending" (01)
  if (enrichedOrder.status_code === '01') {
    await supabase
      .from('orders')
      .update({ status_code: '02' })
      .eq('id', orderId)

    // Log status change
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      status_code: '02',
      changed_by: user.id,
      notes: 'Auto-updated when order opened',
    })

    await supabase.from('audit_log').insert({
      order_id: orderId,
      user_id: user.id,
      action_type: 'status_change',
      old_value: '01',
      new_value: '02',
      reason: 'Auto-updated when order opened',
    })

    // Refresh the order data
    const { data: updatedOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (updatedOrder) {
      enrichedOrder.status_code = '02'
      const { data: updatedStatus } = await supabase
        .from('order_statuses')
        .select('*')
        .eq('status_code', '02')
        .single()
      if (updatedStatus) {
        enrichedOrder.order_statuses = updatedStatus
      }
    }
  }

  return <OrderDetail order={enrichedOrder} userId={user.id} />
}

