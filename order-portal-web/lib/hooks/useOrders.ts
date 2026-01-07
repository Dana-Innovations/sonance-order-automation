import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/types/database'

type Order = Tables<'orders'> & {
  customer_name: string
  status_name: string
  price_issues_count: number
  invalid_items_count: number
  total_amount: number
  csr_name: string
}

export function useOrders({
  userEmail,
  statusFilter,
  csrFilter,
  customerSearch,
  dateFrom,
  dateTo,
  page = 1,
  pageSize = 50,
}: {
  userEmail: string
  statusFilter: string[]
  csrFilter: string
  customerSearch: string
  dateFrom: string
  dateTo: string
  page?: number
  pageSize?: number
}) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['orders', userEmail, statusFilter, csrFilter, customerSearch, dateFrom, dateTo],
    queryFn: async () => {
      // Get customers assigned to this CSR (using csr_id on customers table)
      const { data: customers } = await supabase
        .from('customers')
        .select('ps_customer_id')
        .eq('csr_id', userEmail)

      if (!customers || customers.length === 0) {
        return []
      }

      const customerIds = customers.map((c) => c.ps_customer_id)

      // Build query - using manual joins since foreign keys might not be set up
      let query = supabase
        .from('orders')
        .select('*')
        .in('ps_customer_id', customerIds)

      // Apply filters
      if (statusFilter.length > 0) {
        query = query.in('status_code', statusFilter)
      }

      // Filter by CSR - only show orders assigned to the selected CSR
      if (csrFilter && csrFilter.length > 0) {
        query = query.eq('csr_id', csrFilter)
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

      query = query.order('created_at', { ascending: false })
      
      const { data, error } = await query

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

        // Fetch CSR name if csr_id exists
        let csr_name = ''
        if (order.csr_id) {
          const { data: csr } = await supabase
            .from('csrs')
            .select('first_name, last_name')
            .eq('email', order.csr_id)
            .single()
          if (csr) {
            csr_name = `${csr.first_name} ${csr.last_name}`
          }
        }

        // Fetch order lines with line totals for calculating order total
        const { data: lines } = await supabase
          .from('order_lines')
          .select('id, cust_product_sku, cust_unit_price, cust_line_total')
          .eq('cust_order_number', order.cust_order_number)

        // Calculate price issues and invalid items (simplified for now)
        const price_issues_count = 0 // Will be calculated in detail view
        const invalid_items_count = 0 // Will be calculated in detail view

        // Calculate total order amount from line items
        const total_amount = lines?.reduce((sum, line) => sum + (line.cust_line_total || 0), 0) || 0

        enrichedOrders.push({
          ...order,
          customer_name: customer?.customer_name || order.customername || '',
          status_name: status?.status_name || '',
          price_issues_count,
          invalid_items_count,
          total_amount,
          csr_name,
        } as Order)
      }

      return enrichedOrders
    },
  })
}

