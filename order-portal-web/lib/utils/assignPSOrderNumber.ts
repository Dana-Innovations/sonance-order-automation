import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Assigns a PS Order Number to an order if it doesn't already have one.
 * Uses atomic database function to prevent duplicate order numbers.
 * Thread-safe for concurrent users.
 * Supports large order numbers (BIGINT - up to 9 quintillion)
 *
 * @param supabase - Supabase client instance
 * @param orderId - UUID of the order
 * @returns The assigned PS Order Number, or the existing number if already assigned
 */
export async function assignPSOrderNumber(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ psOrderNumber: number | null; error: Error | null }> {
  try {
    // First check if order already has a PS Order Number
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('ps_order_number')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      console.error('Error fetching order:', fetchError)
      return { psOrderNumber: null, error: fetchError }
    }

    // If order already has a PS Order Number, return it
    if (existingOrder.ps_order_number) {
      return { psOrderNumber: existingOrder.ps_order_number, error: null }
    }

    // Order doesn't have a PS Order Number yet, assign one
    // Call the atomic database function to get next number
    const { data: result, error: functionError } = await supabase.rpc('get_next_ps_order_number')

    if (functionError) {
      console.error('Error getting next PS order number:', functionError)
      return { psOrderNumber: null, error: functionError }
    }

    const nextNumber = result as number

    // Update the order with the new PS Order Number
    const { error: updateError } = await supabase
      .from('orders')
      .update({ ps_order_number: nextNumber })
      .eq('id', orderId)

    if (updateError) {
      console.error('Error updating order with PS order number:', updateError)
      return { psOrderNumber: null, error: updateError }
    }

    console.log(`✓ Assigned PS Order Number ${nextNumber} to order ${orderId}`)
    return { psOrderNumber: nextNumber, error: null }
  } catch (error) {
    console.error('Unexpected error in assignPSOrderNumber:', error)
    return { psOrderNumber: null, error: error as Error }
  }
}
