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
  customerIdFilter = '',
  dateFrom,
  dateTo,
  page = 1,
  pageSize = 20,
}: {
  userEmail: string
  statusFilter: string[]
  csrFilter: string
  customerSearch: string
  customerIdFilter?: string
  dateFrom: string
  dateTo: string
  page?: number
  pageSize?: number
}) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['orders', userEmail, statusFilter, csrFilter, customerSearch, customerIdFilter, dateFrom, dateTo],
    queryFn: async () => {
      // Get customers assigned to this CSR (using csr_id on customers table)
      const { data: customers } = await supabase
        .from('customers')
        .select('customer_id, ps_customer_id')
        .eq('csr_id', userEmail)

      if (!customers || customers.length === 0) {
        return []
      }

      const customerIds = customers.map((c) => c.ps_customer_id)
      const customerUuids = customers.map((c) => c.customer_id)

      // For multi-account customers, also get child account IDs
      const { data: childAccounts } = await supabase
        .from('customer_child_accounts')
        .select('parent_customer_id, child_ps_account_id')
        .in('parent_customer_id', customerUuids)

      // Combine parent and child account IDs
      const allAccountIds = [
        ...customerIds,
        ...(childAccounts?.map((ca) => ca.child_ps_account_id) || [])
      ]

      // When a specific customer is selected from the dropdown, narrow to that
      // customer's parent account + its child accounts only.
      let accountIdsToQuery = allAccountIds
      if (customerIdFilter) {
        const selectedCustomer = customers.find(c => c.ps_customer_id === customerIdFilter)
        const selectedChildIds = selectedCustomer
          ? (childAccounts?.filter(ca => ca.parent_customer_id === selectedCustomer.customer_id)
              .map(ca => ca.child_ps_account_id) || [])
          : []
        const targetIds = [customerIdFilter, ...selectedChildIds]
        // Only include IDs that are actually in the authorized set
        accountIdsToQuery = targetIds.filter(id => allAccountIds.includes(id))
      }

      // Build query - using manual joins since foreign keys might not be set up
      let query = supabase
        .from('orders')
        .select('*')
        .in('ps_customer_id', accountIdsToQuery)

      // Apply filters
      if (statusFilter.length > 0) {
        query = query.in('status_code', statusFilter)
      }

      // Filter by CSR - only show orders assigned to the selected CSR
      if (csrFilter && csrFilter.length > 0) {
        query = query.eq('csr_id', csrFilter)
      }

      // Free-text search on customername only when no specific customer is selected
      if (!customerIdFilter && customerSearch) {
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

      // Fetch all issue counts in one efficient query
      const orderIds = orders.map(order => order.id)
      const { data: issueCounts } = await supabase
        .from('order_issue_counts')
        .select('order_id, invalid_items_count, price_issues_count')
        .in('order_id', orderIds)

      // Create a map for quick lookups
      const issueCountMap = new Map(
        issueCounts?.map(ic => [ic.order_id, ic]) || []
      )

      for (const order of orders) {
        // Fetch customer name - check if it's a parent or child account
        let customer_name = order.customername || ''

        // First try as parent customer
        const { data: parentCustomer } = await supabase
          .from('customers')
          .select('customer_name')
          .eq('ps_customer_id', order.ps_customer_id)
          .maybeSingle()

        if (parentCustomer) {
          customer_name = parentCustomer.customer_name
        } else {
          // If not found, check if it's a child account
          const { data: childAccount } = await supabase
            .from('customer_child_accounts')
            .select('parent_customer_id')
            .eq('child_ps_account_id', order.ps_customer_id)
            .maybeSingle()

          if (childAccount) {
            // Get parent customer name
            const { data: parentCustomer } = await supabase
              .from('customers')
              .select('customer_name')
              .eq('customer_id', childAccount.parent_customer_id)
              .maybeSingle()

            if (parentCustomer) {
              customer_name = parentCustomer.customer_name
            }
          }
        }

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
          .select('cust_line_total')
          .eq('cust_order_number', order.cust_order_number)

        // Calculate total order amount from line items
        const total_amount = lines?.reduce((sum, line) => sum + (line.cust_line_total || 0), 0) || 0

        // Get issue counts from the view
        const issueCounts = issueCountMap.get(order.id) || {
          invalid_items_count: 0,
          price_issues_count: 0
        }

        enrichedOrders.push({
          ...order,
          customer_name: customer_name,
          status_name: status?.status_name || '',
          price_issues_count: issueCounts.price_issues_count,
          invalid_items_count: issueCounts.invalid_items_count,
          total_amount,
          csr_name,
        } as Order)
      }

      return enrichedOrders
    },
  })
}

