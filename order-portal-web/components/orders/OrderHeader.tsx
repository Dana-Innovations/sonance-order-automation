'use client'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { format } from 'date-fns'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/types/database'
import { useRouter } from 'next/navigation'

// US States list
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'VI', name: 'Virgin Islands' },
  { code: 'GU', name: 'Guam' },
  { code: 'AS', name: 'American Samoa' },
  { code: 'MP', name: 'Northern Mariana Islands' },
]

// Helper to check if country is USA
const isUSA = (country: string | null | undefined): boolean => {
  if (!country) return false
  const normalized = country.trim().toUpperCase()
  return normalized === 'USA' || normalized === 'US' || normalized === 'UNITED STATES' || normalized === 'UNITED STATES OF AMERICA'
}

type Order = Tables<'orders'> & {
  customers: Tables<'customers'>
  order_statuses: Tables<'order_statuses'>
}

export function OrderHeader({
  order,
  userId,
}: {
  order: Order
  userId: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  // Initialize with empty strings
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    line3: '',
    city: '',
    state: '',
    postal: '',
    country: '',
  })
  const [carrier, setCarrier] = useState('')
  const [shipVia, setShipVia] = useState('')

  // When entering edit mode, pre-populate fields that have values, leave blank fields empty
  const handleStartEdit = () => {
    setAddress({
      line1: order.cust_shipto_address_line1 || '',
      line2: order.cust_shipto_address_line2 || '',
      line3: order.cust_shipto_address_line3 || '',
      city: order.cust_shipto_city || '',
      state: order.cust_shipto_state || '',
      postal: order.cust_shipto_postal_code || '',
      country: order.cust_shipto_country || '',
    })
    setCarrier(order.cust_carrier || '')
    setShipVia(order.cust_ship_via || '')
    setIsEditing(true)
  }
  const supabase = createClient()
  const router = useRouter()

  const handleSave = async () => {
    // Save the values as entered (trimmed)
    const updatedData = {
      cust_shipto_address_line1: address.line1.trim() || null,
      cust_shipto_address_line2: address.line2.trim() || null,
      cust_shipto_address_line3: address.line3.trim() || null,
      cust_shipto_city: address.city.trim() || null,
      cust_shipto_state: address.state.trim() || null,
      cust_shipto_postal_code: address.postal.trim() || null,
      cust_shipto_country: address.country.trim() || null,
      cust_carrier: carrier.trim() || null,
      cust_ship_via: shipVia.trim() || null,
    }

    const { error } = await supabase
      .from('orders')
      .update(updatedData)
      .eq('id', order.id)

    if (error) {
      alert('Error saving changes: ' + error.message)
      return
    }

    // Log changes to audit log
    await supabase.from('audit_log').insert({
      order_id: order.id,
      user_id: userId,
      action_type: 'field_edit',
      field_name: 'ship_to_address',
      old_value: JSON.stringify({
        line1: order.cust_shipto_address_line1,
        line2: order.cust_shipto_address_line2,
        line3: order.cust_shipto_address_line3,
        city: order.cust_shipto_city,
        state: order.cust_shipto_state,
        postal: order.cust_shipto_postal_code,
        country: order.cust_shipto_country,
        carrier: order.cust_carrier,
        ship_via: order.cust_ship_via,
      }),
      new_value: JSON.stringify({
        line1: updatedData.cust_shipto_address_line1,
        line2: updatedData.cust_shipto_address_line2,
        line3: updatedData.cust_shipto_address_line3,
        city: updatedData.cust_shipto_city,
        state: updatedData.cust_shipto_state,
        postal: updatedData.cust_shipto_postal_code,
        country: updatedData.cust_shipto_country,
        carrier: updatedData.cust_carrier,
        ship_via: updatedData.cust_ship_via,
      }),
    })

    setIsEditing(false)
    router.refresh()
  }

  const isCancelled = order.status_code === '06'

  return (
    <div className="rounded-sm border border-[#D9D9D6] bg-white p-5 space-y-4">
      {/* Header Row: Order Info */}
      <div className="flex items-center justify-between flex-wrap text-sm" style={{ gap: '1rem' }}>
        {/* Left side: Order details */}
        <div className="flex items-center flex-wrap" style={{ gap: '1.5rem' }}>
          <div>
            <span style={{ fontWeight: 700, color: '#333F48' }}>Customer:</span>{' '}
            <span style={{ color: '#333F48' }}>
              {order.customers?.customer_name || order.customername || 'N/A'}
            </span>
          </div>
          <div>
            <span style={{ fontWeight: 700, color: '#333F48' }}>Cust. Order #:</span>{' '}
            <span style={{ color: '#333F48' }}>{order.cust_order_number}</span>
          </div>
          <div>
            <span style={{ fontWeight: 700, color: '#333F48' }}>Order Date:</span>{' '}
            <span style={{ color: '#333F48' }}>
              {order.cust_order_date
                ? format(new Date(order.cust_order_date), 'MMM d, yyyy')
                : 'N/A'}
            </span>
          </div>
          {order.ps_order_number && (
            <div>
              <span style={{ fontWeight: 700, color: '#333F48' }}>PS Order #:</span>{' '}
              <span style={{ color: '#333F48' }}>{order.ps_order_number}</span>
            </div>
          )}
        </div>

        {/* Right side: Order Status */}
        <div className="flex items-center" style={{ gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, color: '#333F48' }}>Order Status:</span>
          <StatusBadge
            statusCode={order.status_code}
            statusName={order.order_statuses?.status_name || ''}
          />
        </div>
      </div>

      {isCancelled && (
        <div className="rounded-sm bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-semibold text-red-800">
            Order Cancelled
            {order.cancelled_at && (
              <span className="ml-2 text-red-600 font-normal">
                on {format(new Date(order.cancelled_at), 'MMM d, yyyy')}
              </span>
            )}
          </p>
          {order.cancelled_reason && (
            <p className="mt-2 text-sm text-red-700">{order.cancelled_reason}</p>
          )}
        </div>
      )}

      {/* Ship-to Address and Carrier & Ship Method */}
      <div className="pt-4 border-t border-[#D9D9D6]">
        <div className="flex flex-wrap gap-6">
          {/* Ship-to Address Section */}
          <div className="flex-shrink-0">
            <h3 className="font-semibold uppercase tracking-widest text-[#333F48] mb-1" style={{ fontSize: '12px' }}>
              Ship-to Address
            </h3>
            <div className="text-[#333F48]" style={{ fontSize: '12px' }}>
              <table style={{ borderCollapse: 'collapse' }}>
                {isEditing && (
                  <thead>
                    <tr>
                      <th style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem' }}></th>
                      <th style={{ textAlign: 'left', paddingRight: '1.5rem', color: '#6b7a85', fontWeight: 500, fontSize: '11px' }}>Current</th>
                      <th style={{ textAlign: 'left', color: '#00A3E1', fontWeight: 500, fontSize: '11px' }}>New Value</th>
                    </tr>
                  </thead>
                )}
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Addr Line 1:</td>
                    <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_address_line1 || '—'}</td>
                    {isEditing && (
                      <td>
                        <input
                          type="text"
                          value={address.line1}
                          onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                          placeholder="Address Line 1"
                          className="w-full rounded-sm border border-[#D9D9D6] bg-white px-2 py-1 text-xs text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                          style={{ minWidth: '180px' }}
                        />
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Addr Line 2:</td>
                    <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_address_line2 || '—'}</td>
                    {isEditing && (
                      <td>
                        <input
                          type="text"
                          value={address.line2}
                          onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                          placeholder="Address Line 2"
                          className="w-full rounded-sm border border-[#D9D9D6] bg-white px-2 py-1 text-xs text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                          style={{ minWidth: '180px' }}
                        />
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Addr Line 3:</td>
                    <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_address_line3 || '—'}</td>
                    {isEditing && (
                      <td>
                        <input
                          type="text"
                          value={address.line3}
                          onChange={(e) => setAddress({ ...address, line3: e.target.value })}
                          placeholder="Address Line 3"
                          className="w-full rounded-sm border border-[#D9D9D6] bg-white px-2 py-1 text-xs text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                          style={{ minWidth: '180px' }}
                        />
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>City:</td>
                    <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_city || '—'}</td>
                    {isEditing && (
                      <td>
                        <input
                          type="text"
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                          placeholder="City"
                          className="w-full rounded-sm border border-[#D9D9D6] bg-white px-2 py-1 text-xs text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                          style={{ minWidth: '180px' }}
                        />
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>State:</td>
                    <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_state || '—'}</td>
                    {isEditing && (
                      <td>
                        {isUSA(address.country) || isUSA(order.cust_shipto_country) ? (
                          <select
                            value={address.state}
                            onChange={(e) => setAddress({ ...address, state: e.target.value })}
                            className="w-full rounded-sm border border-[#D9D9D6] bg-white px-2 py-1 text-xs text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                            style={{ minWidth: '180px' }}
                          >
                            <option value="">Select State</option>
                            {US_STATES.map((state) => (
                              <option key={state.code} value={state.code}>
                                {state.code} - {state.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={address.state}
                            onChange={(e) => setAddress({ ...address, state: e.target.value })}
                            placeholder="State/Province"
                            className="w-full rounded-sm border border-[#D9D9D6] bg-white px-2 py-1 text-xs text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                            style={{ minWidth: '180px' }}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Postal:</td>
                    <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_postal_code || '—'}</td>
                    {isEditing && (
                      <td>
                        <input
                          type="text"
                          value={address.postal}
                          onChange={(e) => setAddress({ ...address, postal: e.target.value })}
                          placeholder="Postal Code"
                          className="w-full rounded-sm border border-[#D9D9D6] bg-white px-2 py-1 text-xs text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                          style={{ minWidth: '180px' }}
                        />
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Country:</td>
                    <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_country || '—'}</td>
                    {isEditing && (
                      <td>
                        <input
                          type="text"
                          value={address.country}
                          onChange={(e) => setAddress({ ...address, country: e.target.value })}
                          placeholder="Country"
                          className="w-full rounded-sm border border-[#D9D9D6] bg-white px-2 py-1 text-xs text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                          style={{ minWidth: '180px' }}
                        />
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Carrier & Ship Method Section - to the right of New Value */}
          <div className="flex-shrink-0" style={{ marginLeft: isEditing ? '2rem' : '3rem' }}>
            <h3 className="font-semibold uppercase tracking-widest text-[#333F48] mb-1" style={{ fontSize: '12px' }}>
              Carrier & Ship Method
            </h3>
            <div className="text-[#333F48]" style={{ fontSize: '12px' }}>
              <table style={{ borderCollapse: 'collapse' }}>
                {isEditing && (
                  <thead>
                    <tr>
                      <th style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem' }}></th>
                      <th style={{ textAlign: 'left', paddingRight: '1.5rem', color: '#6b7a85', fontWeight: 500, fontSize: '11px' }}>Current</th>
                      <th style={{ textAlign: 'left', color: '#00A3E1', fontWeight: 500, fontSize: '11px' }}>New Value</th>
                    </tr>
                  </thead>
                )}
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Carrier:</td>
                    <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_carrier || '—'}</td>
                    {isEditing && (
                      <td>
                        <input
                          type="text"
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          placeholder="Carrier"
                          className="w-full rounded-sm border border-[#D9D9D6] bg-white px-2 py-1 text-xs text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                          style={{ minWidth: '150px' }}
                        />
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Ship Via:</td>
                    <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_ship_via || '—'}</td>
                    {isEditing && (
                      <td>
                        <input
                          type="text"
                          value={shipVia}
                          onChange={(e) => setShipVia(e.target.value)}
                          placeholder="Ship Via Code"
                          className="w-full rounded-sm border border-[#D9D9D6] bg-white px-2 py-1 text-xs text-[#333F48] focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                          style={{ minWidth: '150px' }}
                        />
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Edit/Save buttons */}
        <div className="mt-3">
          {!isCancelled && !isEditing && (
            <button
              onClick={handleStartEdit}
              className="text-[#00A3E1] hover:text-[#008ac4] font-medium transition-colors"
              style={{ fontSize: '12px', marginLeft: '3rem' }}
            >
              Edit
            </button>
          )}
          {isEditing && (
            <div className="flex gap-2" style={{ marginLeft: '3rem' }}>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-[#00A3E1] text-white rounded-sm text-xs font-medium hover:bg-[#008ac4] transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  // Reset to original values
                  setAddress({
                    line1: order.cust_shipto_address_line1 || '',
                    line2: order.cust_shipto_address_line2 || '',
                    line3: order.cust_shipto_address_line3 || '',
                    city: order.cust_shipto_city || '',
                    state: order.cust_shipto_state || '',
                    postal: order.cust_shipto_postal_code || '',
                    country: order.cust_shipto_country || '',
                  })
                  setCarrier(order.cust_carrier || '')
                  setShipVia(order.cust_ship_via || '')
                }}
                className="px-3 py-1.5 bg-[#D9D9D6] text-[#333F48] rounded-sm text-xs font-medium hover:bg-[#c0c0bd] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

