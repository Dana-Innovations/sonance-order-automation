import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/types/database'

type Order = Tables<'orders'> & {
  customer_name: string
  status_name: string
  price_issues_count: number
  invalid_items_count: number
}

export function useOrders({
  userEmail,
  statusFilter,
  customerSearch,
  dateFrom,
  dateTo,
  page = 1,
  pageSize = 50,
}: {
  userEmail: string
  statusFilter: string[]
  customerSearch: string
  dateFrom: string
  dateTo: string
  page?: number
  pageSize?: number
}) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['orders', userEmail, statusFilter, customerSearch, dateFrom, dateTo],
    queryFn: async () => {
      // First, get assigned customers for this CSR using email
      const { data: assignments } = await supabase
        .from('csr_assignments')
        .select('ps_customer_id')
        .eq('user_email', userEmail)

      if (!assignments || assignments.length === 0) {
        return []
      }

      const customerIds = assignments.map((a) => a.ps_customer_id)

      // Build query - using manual joins since foreign keys might not be set up
      let query = supabase
        .from('orders')
        .select('*')
        .in('ps_customer_id', customerIds)

      // Apply filters
      if (statusFilter.length > 0) {
        query = query.in('status_code', statusFilter)
      }

      if (customerSearch) {
        query = query.ilike('customername', `%${customerSearch}%`)
      }

      if (dateFrom) {
        query = query.gte('cust_order_date', dateFrom)
      }

      if (dateTo) {
        query = query.lte('cust_order_date', dateTo)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Fetch related data
      const orders = data || []
      const enrichedOrders: Order[] = []

      for (const order of orders) {
        // Fetch customer name
        const { data: customer } = await supabase
          .from('customers')
          .select('customer_name')
          .eq('ps_customer_id', order.ps_customer_id)
          .single()

        // Fetch status name
        const { data: status } = await supabase
          .from('order_statuses')
          .select('status_name')
          .eq('status_code', order.status_code)
          .single()

        // Fetch order lines
        const { data: lines } = await supabase
          .from('order_lines')
          .select('id, cust_product_sku, cust_unit_price')
          .eq('cust_order_number', order.cust_order_number)

        // Calculate price issues and invalid items (simplified for now)
        const price_issues_count = 0 // Will be calculated in detail view
        const invalid_items_count = 0 // Will be calculated in detail view

        enrichedOrders.push({
          ...order,
          customer_name: customer?.customer_name || order.customername || '',
          status_name: status?.status_name || '',
          price_issues_count,
          invalid_items_count,
        } as Order)
      }

      return enrichedOrders
    },
  })
}

