'use client'

import { useOrders } from '@/lib/hooks/useOrders'
import { OrderTable } from './OrderTable'
import { OrderFilters } from './OrderFilters'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

export function OrderList({ userEmail }: { userEmail: string }) {
  // Default to showing only actionable orders: NEW, REVIEWED NO CHANGES, REVIEWED WITH CHANGES
  const [statusFilter, setStatusFilter] = useState<string[]>(['01', '02', '03'])
  const [csrFilter, setCsrFilter] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 50

  const { data: orders, isLoading, error } = useOrders({
    userEmail,
    statusFilter,
    csrFilter,
    customerSearch,
    dateFrom,
    dateTo,
    page,
    pageSize,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#00A3E1]" />
        <p className="text-sm text-[#6b7a85] uppercase tracking-wider">Loading orders...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-sm border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">Error loading orders: {error.message}</p>
      </div>
    )
  }

  const totalPages = orders ? Math.ceil(orders.length / pageSize) : 0
  const paginatedOrders = orders
    ? orders.slice((page - 1) * pageSize, page * pageSize)
    : []

  return (
    <div className="space-y-5">
      <OrderFilters
        statusFilter={statusFilter}
        onStatusFilterChange={(filters) => {
          setStatusFilter(filters)
          setPage(1) // Reset to first page when filters change
        }}
        csrFilter={csrFilter}
        onCsrFilterChange={(csr) => {
          setCsrFilter(csr)
          setPage(1)
        }}
        customerSearch={customerSearch}
        onCustomerSearchChange={(search) => {
          setCustomerSearch(search)
          setPage(1)
        }}
        dateFrom={dateFrom}
        onDateFromChange={(date) => {
          setDateFrom(date)
          setPage(1)
        }}
        dateTo={dateTo}
        onDateToChange={(date) => {
          setDateTo(date)
          setPage(1)
        }}
      />
      <OrderTable orders={paginatedOrders} />
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs uppercase tracking-wider text-[#6b7a85]">
            Page <span className="font-medium text-[#333F48]">{page}</span> of{' '}
            <span className="font-medium text-[#333F48]">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-sm border border-[#D9D9D6] bg-white text-xs font-medium uppercase tracking-wider text-[#333F48] transition-all hover:border-[#00A3E1] hover:text-[#00A3E1] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[#D9D9D6] disabled:hover:text-[#333F48]"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-sm border border-[#D9D9D6] bg-white text-xs font-medium uppercase tracking-wider text-[#333F48] transition-all hover:border-[#00A3E1] hover:text-[#00A3E1] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[#D9D9D6] disabled:hover:text-[#333F48]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
