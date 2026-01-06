'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Filter, X } from 'lucide-react'

export function OrderFilters({
  statusFilter,
  onStatusFilterChange,
  customerSearch,
  onCustomerSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}: {
  statusFilter: string[]
  onStatusFilterChange: (filters: string[]) => void
  customerSearch: string
  onCustomerSearchChange: (search: string) => void
  dateFrom: string
  onDateFromChange: (date: string) => void
  dateTo: string
  onDateToChange: (date: string) => void
}) {
  const supabase = createClient()

  const { data: statuses } = useQuery({
    queryKey: ['order_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_statuses')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data || []
    },
  })

  const handleStatusToggle = (statusCode: string) => {
    if (statusFilter.includes(statusCode)) {
      onStatusFilterChange(statusFilter.filter((s) => s !== statusCode))
    } else {
      onStatusFilterChange([...statusFilter, statusCode])
    }
  }

  const clearFilters = () => {
    onStatusFilterChange([])
    onCustomerSearchChange('')
    onDateFromChange('')
    onDateToChange('')
  }

  const activeFilterCount =
    statusFilter.length + (customerSearch ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)

  return (
    <div className="rounded-sm border border-[#D9D9D6] bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#333F48]" />
          <h2 className="text-xs font-medium uppercase tracking-widest text-[#333F48]">
            Filters
          </h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-[#00A3E1] hover:text-[#008bc4] transition-colors"
          >
            <X className="h-3 w-3" />
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-[#333F48] mb-3">
            Status
          </label>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-2">
            {statuses?.map((status) => (
              <label
                key={status.status_code}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={statusFilter.includes(status.status_code)}
                  onChange={() => handleStatusToggle(status.status_code)}
                  className="h-4 w-4 rounded-sm border-[#D9D9D6] text-[#00A3E1] focus:ring-[#00A3E1] focus:ring-offset-0 cursor-pointer"
                  style={{ accentColor: '#00A3E1' }}
                />
                <span className="text-sm text-[#333F48] group-hover:text-[#00A3E1] transition-colors">
                  {status.status_name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Customer Search */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-[#333F48] mb-3">
            Customer Search
          </label>
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => onCustomerSearchChange(e.target.value)}
            placeholder="Search by customer name..."
            className="w-full h-10 rounded-sm border border-[#D9D9D6] bg-white px-3 text-sm text-[#333F48] placeholder:text-[#8f999f] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20 transition-colors"
          />
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-[#333F48] mb-3">
            Date Range
          </label>
          <div className="space-y-2">
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="w-full h-10 rounded-sm border border-[#D9D9D6] bg-white px-3 text-sm text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20 transition-colors"
                placeholder="From"
              />
            </div>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="w-full h-10 rounded-sm border border-[#D9D9D6] bg-white px-3 text-sm text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20 transition-colors"
                placeholder="To"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
