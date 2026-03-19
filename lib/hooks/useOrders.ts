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

  // TEMPORARY: When NEXT_PUBLIC_SHOW_ALL_ORDERS=true, bypass CSR filter so everyone sees all orders
  const showAllOrders = process.env.NEXT_PUBLIC_SHOW_ALL_ORDERS?.trim() === 'true'

  return useQuery({
    queryKey: ['orders', userEmail, statusFilter, csrFilter, customerSearch, customerIdFilter, dateFrom, dateTo, page, pageSize, showAllOrders],
    queryFn: async () => {
      // Determine which account IDs this user can see
      let accountIdsToQuery: string[] | null = null

      if (!showAllOrders) {
        const { data: customers } = await supabase
          .from('customers')
          .select('customer_id, ps_customer_id')
          .eq('csr_id', userEmail)

        if (!customers || customers.length === 0) {
          return { orders: [], totalCount: 0 }
        }

        const customerIds = customers.map((c) => c.ps_customer_id)
        const customerUuids = customers.map((c) => c.customer_id)

        const { data: childAccounts } = await supabase
          .from('customer_child_accounts')
          .select('parent_customer_id, child_ps_account_id')
          .in('parent_customer_id', customerUuids)

        const allAccountIds = [
          ...customerIds,
          ...(childAccounts?.map((ca) => ca.child_ps_account_id) || [])
        ]

        if (customerIdFilter) {
          const selectedCustomer = customers.find(c => c.ps_customer_id === customerIdFilter)
          const selectedChildIds = selectedCustomer
            ? (childAccounts?.filter(ca => ca.parent_customer_id === selectedCustomer.customer_id)
                .map(ca => ca.child_ps_account_id) || [])
            : []
          const targetIds = [customerIdFilter, ...selectedChildIds]
          accountIdsToQuery = targetIds.filter(id => allAccountIds.includes(id))
        } else {
          accountIdsToQuery = allAccountIds
        }
      } else if (customerIdFilter) {
        const { data: selectedCustomer } = await supabase
          .from('customers')
          .select('customer_id, ps_customer_id')
          .eq('ps_customer_id', customerIdFilter)
          .maybeSingle()

        if (selectedCustomer) {
          const { data: childAccounts } = await supabase
            .from('customer_child_accounts')
            .select('child_ps_account_id')
            .eq('parent_customer_id', selectedCustomer.customer_id)

          accountIdsToQuery = [customerIdFilter, ...(childAccounts?.map(ca => ca.child_ps_account_id) || [])]
        } else {
          accountIdsToQuery = [customerIdFilter]
        }
      }

      // Query the view with server-side pagination
      let query = supabase
        .from('v_orders_list')
        .select('*', { count: 'exact' })

      if (accountIdsToQuery !== null) {
        query = query.in('ps_customer_id', accountIdsToQuery)
      }

      if (statusFilter.length > 0) {
        query = query.in('status_code', statusFilter)
      }

      if (csrFilter && csrFilter.length > 0) {
        query = query.eq('csr_id', csrFilter)
      }

      if (!customerIdFilter && customerSearch) {
        query = query.ilike('customername', `%${customerSearch}%`)
      }

      if (dateFrom) {
        query = query.gte('cust_order_date', dateFrom)
      }

      if (dateTo) {
        query = query.lte('cust_order_date', dateTo)
      }

      // Server-side pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      // Map view columns to expected Order type
      const orders: Order[] = (data || []).map((row: any) => ({
        ...row,
        customer_name: row.resolved_customer_name || row.customername || '',
        status_name: row.status_name || '',
        csr_name: row.csr_name || '',
        total_amount: row.total_amount || 0,
        invalid_items_count: row.invalid_items_count || 0,
        price_issues_count: row.price_issues_count || 0,
      }))

      return { orders, totalCount: count || 0 }
    },
  })
}
