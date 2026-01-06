import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrderDetail } from '@/components/orders/OrderDetail'

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

  const enrichedOrder = {
    ...order,
    customers: customer,
    order_statuses: status,
    order_lines: orderLines || [],
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

