'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Filter, Search, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function OrderFilters({
  statusFilter,
  onStatusFilterChange,
  csrFilter,
  onCsrFilterChange,
  customerSearch,
  onCustomerSearchChange,
  onCustomerIdFilterChange,
  onOrderLookup,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}: {
  statusFilter: string[]
  onStatusFilterChange: (filters: string[]) => void
  csrFilter: string
  onCsrFilterChange: (csr: string) => void
  customerSearch: string
  onCustomerSearchChange: (search: string) => void
  onCustomerIdFilterChange: (id: string) => void
  onOrderLookup: () => void
  dateFrom: string
  onDateFromChange: (date: string) => void
  dateTo: string
  onDateToChange: (date: string) => void
}) {
  const supabase = createClient()
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)
  const [customerInputValue, setCustomerInputValue] = useState(customerSearch || 'All Customers')
  const [isSearching, setIsSearching] = useState(false) // Track if user is actively typing to search
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // ISR filter state
  const [isCsrDropdownOpen, setIsCsrDropdownOpen] = useState(false)
  const [csrInputValue, setCsrInputValue] = useState('All ISRs')
  const csrDropdownRef = useRef<HTMLDivElement>(null)

  const ALL_CUSTOMERS_VALUE = 'All Customers'
  const ALL_CSRS_VALUE = 'All ISRs'

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false)
      }
      if (csrDropdownRef.current && !csrDropdownRef.current.contains(event.target as Node)) {
        setIsCsrDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync input value with external customerSearch prop
  useEffect(() => {
    setCustomerInputValue(customerSearch || ALL_CUSTOMERS_VALUE)
  }, [customerSearch])

  // Sync ISR input value with external csrFilter prop - look up ISR name
  useEffect(() => {
    if (!csrFilter) {
      setCsrInputValue(ALL_CSRS_VALUE)
    }
    // Don't overwrite if we already have a name set (from selection)
  }, [csrFilter])

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

  const { data: customers } = useQuery({
    queryKey: ['customers_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('ps_customer_id, customer_name')
        .order('customer_name')
      if (error) throw error
      return data || []
    },
  })

  // Fetch ISRs for filter dropdown
  const { data: csrs } = useQuery({
    queryKey: ['csrs_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csrs')
        .select('email, first_name, last_name')
        .eq('is_active', true)
        .order('last_name')
      if (error) throw error
      return data || []
    },
  })

  // Filter customers based on input (only filter when actively searching)
  const filteredCustomers = customers?.filter((customer) => {
    // Only filter when user is actively typing a search
    if (!isSearching) {
      return true
    }
    const searchLower = customerInputValue.toLowerCase()
    return (
      customer.customer_name?.toLowerCase().includes(searchLower) ||
      customer.ps_customer_id?.toLowerCase().includes(searchLower)
    )
  }) || []

  const handleCustomerSelect = (customer: { ps_customer_id: string; customer_name: string | null } | null) => {
    if (customer === null) {
      // "All Customers" selected
      setCustomerInputValue(ALL_CUSTOMERS_VALUE)
      onCustomerSearchChange('')
      onCustomerIdFilterChange('')
    } else {
      const displayValue = customer.customer_name || customer.ps_customer_id
      setCustomerInputValue(displayValue)
      onCustomerSearchChange(displayValue)
      onCustomerIdFilterChange(customer.ps_customer_id)
    }
    setIsSearching(false) // Reset search mode when selection is made
    setIsCustomerDropdownOpen(false)
  }

  const handleCustomerInputChange = (value: string) => {
    setCustomerInputValue(value)
    setIsSearching(true) // User is actively typing to search
    onCustomerIdFilterChange('') // Clear ID filter when typing free text
    // If user clears the input or types "All Customers", don't filter
    if (value === '' || value === ALL_CUSTOMERS_VALUE) {
      onCustomerSearchChange('')
    } else {
      onCustomerSearchChange(value)
    }
    setIsCustomerDropdownOpen(true)
  }
  
  const handleDropdownToggle = () => {
    setIsSearching(false) // Opening dropdown via chevron shows all customers
    setIsCustomerDropdownOpen(!isCustomerDropdownOpen)
  }

  // ISR filter handlers
  const handleCsrSelect = (csr: { email: string; first_name: string; last_name: string } | null) => {
    if (csr === null) {
      // "All ISRs" selected
      setCsrInputValue(ALL_CSRS_VALUE)
      onCsrFilterChange('')
    } else {
      const displayValue = `${csr.first_name} ${csr.last_name}`
      setCsrInputValue(displayValue)
      onCsrFilterChange(csr.email)
    }
    setIsCsrDropdownOpen(false)
  }

  const handleCsrDropdownToggle = () => {
    setIsCsrDropdownOpen(!isCsrDropdownOpen)
  }

  const handleStatusToggle = (statusCode: string) => {
    if (statusFilter.includes(statusCode)) {
      onStatusFilterChange(statusFilter.filter((s) => s !== statusCode))
    } else {
      onStatusFilterChange([...statusFilter, statusCode])
    }
  }

  const clearFilters = () => {
    onStatusFilterChange([])
    onCsrFilterChange('')
    setCsrInputValue(ALL_CSRS_VALUE)
    onCustomerSearchChange('')
    onCustomerIdFilterChange('')
    setCustomerInputValue(ALL_CUSTOMERS_VALUE)
    onDateFromChange('')
    onDateToChange('')
  }

  const activeFilterCount =
    statusFilter.length + (csrFilter ? 1 : 0) + (customerSearch ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)

  return (
    <div className="rounded-md shadow-sm border border-gray-200 bg-white p-6" style={{ paddingLeft: '30px', paddingBottom: '27px' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '3px' }}>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#333F48]" />
          <h2 className="text-xs font-medium uppercase tracking-widest text-[#333F48]">
            Filters
          </h2>
          {activeFilterCount > 0 && (
            <span className="text-xs text-[#6b7a85]">({activeFilterCount} active)</span>
          )}
        </div>
      </div>

      {/* Filter Layout - Status on left, other filters on right */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '24px' }}>
        {/* Status Filter - Left Side */}
        <div style={{ borderRight: '1px solid #D9D9D6', paddingRight: '48px' }}>
          <label
            className="block text-sm uppercase tracking-widest text-[#333F48]"
            style={{ fontWeight: 700, marginBottom: '24px' }}
          >
            Status
          </label>
          <div className="max-h-96 overflow-y-auto pr-2">
            {statuses?.map((status) => {
              const isChecked = statusFilter.includes(status.status_code)
              return (
                <div
                  key={status.status_code}
                  className="flex items-center cursor-pointer group"
                  style={{ marginBottom: '8px', gap: '12px' }}
                  onClick={() => handleStatusToggle(status.status_code)}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      minWidth: '18px',
                      minHeight: '18px',
                      borderRadius: '3px',
                      border: `2px solid ${isChecked ? '#00A3E1' : '#6b7a85'}`,
                      backgroundColor: isChecked ? '#00A3E1' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isChecked && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10 3L4.5 8.5L2 6"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-[#333F48] group-hover:text-[#00A3E1] transition-colors whitespace-nowrap">
                    {status.status_name}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Buttons below status list */}
          <div className="flex items-center" style={{ gap: '24px', marginTop: '24px' }}>
            <button
              onClick={() => {
                // Select all status codes
                const allStatusCodes = statuses?.map(s => s.status_code) || []
                onStatusFilterChange(allStatusCodes)
              }}
              className="py-1.5 text-xs font-medium transition-colors uppercase"
              style={{
                border: '1px solid #00A3E1',
                borderRadius: '20px',
                backgroundColor: 'white',
                color: '#00A3E1',
                paddingLeft: '16px',
                paddingRight: '16px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = '#00A3E1'
              }}
            >
              Select All
            </button>
            <button
              onClick={() => onStatusFilterChange([])}
              className="py-1.5 text-xs font-medium transition-colors uppercase"
              style={{
                border: '1px solid #00A3E1',
                borderRadius: '20px',
                backgroundColor: 'white',
                color: '#00A3E1',
                paddingLeft: '16px',
                paddingRight: '16px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00A3E1'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = '#00A3E1'
              }}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Right Side - ISR, Customer Search and Date Filters */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '24px' }}>
          {/* Assigned ISR Filter */}
          <div ref={csrDropdownRef} className="relative" style={{ width: '30%' }}>
            <label className="block text-xs uppercase tracking-widest text-[#333F48] mb-3" style={{ fontWeight: 700 }}>
              Assigned ISR
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={csrInputValue}
                readOnly
                placeholder="Select ISR..."
                className="flex-1 border border-[#D9D9D6] bg-white px-3 text-[#333F48] placeholder:text-[#8f999f] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20 transition-colors cursor-pointer"
                style={{ height: '38px', borderRadius: '6px', fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}
                onClick={handleCsrDropdownToggle}
              />
              <button
                type="button"
                onClick={handleCsrDropdownToggle}
                className="px-2 border border-[#D9D9D6] bg-white hover:bg-[#F5F5F5] transition-colors"
                style={{ height: '38px', borderRadius: '6px' }}
              >
                <ChevronDown 
                  className={`h-5 w-5 text-[#8f999f] transition-transform ${isCsrDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
            
            {/* ISR Dropdown */}
            {isCsrDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border border-[#D9D9D6] bg-white shadow-lg" style={{ borderRadius: '6px', fontFamily: 'Montserrat, sans-serif' }}>
                {/* All ISRs option */}
                <button
                  type="button"
                  onClick={() => handleCsrSelect(null)}
                  className="w-full px-3 py-2 text-left hover:bg-[#F5F5F5] transition-colors border-b border-[#D9D9D6]"
                >
                  <span className="text-[#00A3E1] font-medium" style={{ fontSize: '14px' }}>
                    All ISRs
                  </span>
                </button>
                {csrs?.map((csr) => (
                  <button
                    key={csr.email}
                    type="button"
                    onClick={() => handleCsrSelect(csr)}
                    className="w-full px-3 py-2 text-left hover:bg-[#F5F5F5] transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="text-[#333F48]" style={{ fontSize: '14px' }}>
                      {csr.first_name} {csr.last_name}
                    </span>
                    <span className="text-[#8f999f]" style={{ fontSize: '12px' }}>
                      {csr.email}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Customer Search with Dropdown */}
          <div ref={dropdownRef} className="relative" style={{ width: '30%' }}>
            <label className="block text-xs uppercase tracking-widest text-[#333F48] mb-3" style={{ fontWeight: 700 }}>
              Customer Search
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customerInputValue}
                onChange={(e) => handleCustomerInputChange(e.target.value)}
                onFocus={() => {
                  setIsSearching(false) // Show all customers when focusing
                  setIsCustomerDropdownOpen(true)
                }}
                placeholder="Search by customer name or PS Account..."
                className="flex-1 border border-[#D9D9D6] bg-white px-3 text-[#333F48] placeholder:text-[#8f999f] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20 transition-colors"
                style={{ height: '38px', borderRadius: '6px', fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}
              />
              <button
                type="button"
                onClick={handleDropdownToggle}
                className="px-2 border border-[#D9D9D6] bg-white hover:bg-[#F5F5F5] transition-colors"
                style={{ height: '38px', borderRadius: '6px' }}
              >
                <ChevronDown 
                  className={`h-5 w-5 text-[#8f999f] transition-transform ${isCustomerDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <Search className="h-5 w-5 text-[#00A3E1]" />
            </div>
            
            {/* Dropdown */}
            {isCustomerDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border border-[#D9D9D6] bg-white shadow-lg" style={{ borderRadius: '6px', fontFamily: 'Montserrat, sans-serif' }}>
                {/* All Customers option - always shown at top */}
                <button
                  type="button"
                  onClick={() => handleCustomerSelect(null)}
                  className="w-full px-3 py-2 text-left hover:bg-[#F5F5F5] transition-colors border-b border-[#D9D9D6]"
                >
                  <span className="text-[#00A3E1] font-medium" style={{ fontSize: '14px' }}>
                    All Customers
                  </span>
                </button>
                {filteredCustomers.slice(0, 50).map((customer) => (
                  <button
                    key={customer.ps_customer_id}
                    type="button"
                    onClick={() => handleCustomerSelect(customer)}
                    className="w-full px-3 py-2 text-left hover:bg-[#F5F5F5] transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="text-[#333F48] truncate" style={{ fontSize: '14px' }}>
                      {customer.customer_name || 'Unnamed Customer'}
                    </span>
                    <span className="text-[#8f999f] shrink-0" style={{ fontSize: '12px' }}>
                      {customer.ps_customer_id}
                    </span>
                  </button>
                ))}
                {filteredCustomers.length > 50 && (
                  <div className="px-3 py-2 text-[#8f999f] text-center border-t border-[#D9D9D6]" style={{ fontSize: '12px' }}>
                    Showing first 50 results. Type more to narrow down.
                  </div>
                )}
              </div>
            )}
            
          </div>

          {/* Date Filters Row */}
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Date From */}
            <div style={{ width: '21%' }}>
                <label className="block text-xs uppercase tracking-widest text-[#333F48] mb-3" style={{ fontWeight: 700 }}>
                  Order Date From
                </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="w-full border border-[#D9D9D6] bg-white px-3 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20 transition-colors"
                style={{ height: '38px', borderRadius: '6px', fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}
              />
            </div>

            {/* Date To */}
            <div style={{ width: '21%' }}>
                <label className="block text-xs uppercase tracking-widest text-[#333F48] mb-3" style={{ fontWeight: 700 }}>
                  Order Date To
                </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="w-full border border-[#D9D9D6] bg-white px-3 text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-2 focus:ring-[#00A3E1]/20 transition-colors"
                style={{ height: '38px', borderRadius: '6px', fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Order Number Lookup */}
          <div style={{ width: '30%' }}>
            <label className="block text-xs uppercase tracking-widest text-[#333F48] mb-3" style={{ fontWeight: 700 }}>
              Order # (Customer or Peoplesoft)
            </label>
            <button
              type="button"
              onClick={onOrderLookup}
              className="flex items-center gap-2 transition-colors"
              style={{
                height: '38px',
                paddingLeft: '14px',
                paddingRight: '18px',
                border: '1px solid #00A3E1',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#00A3E1',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.03em',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#00A3E1'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = '#00A3E1' }}
            >
              <Search className="h-4 w-4 shrink-0" />
              Find by Order #
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
