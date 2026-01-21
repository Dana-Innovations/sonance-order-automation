'use client'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { format, parseISO } from 'date-fns'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/types/database'
import { useRouter } from 'next/navigation'
import { MapPin, Truck, FileText } from 'lucide-react'

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
  const [shipToName, setShipToName] = useState('')
  const [distinctCarriers, setDistinctCarriers] = useState<{ carrier_id: string; carrier_descr: string }[]>([])
  const [shipViaOptions, setShipViaOptions] = useState<{ ship_via_code: string; ship_via_desc: string }[]>([])
  const [notesExpanded, setNotesExpanded] = useState(false)
  const [headerExpanded, setHeaderExpanded] = useState(true)
  const [assignedCSR, setAssignedCSR] = useState<{ first_name: string; last_name: string } | null>(null)

  const supabase = createClient()
  const router = useRouter()

  // Fetch distinct carriers when component mounts
  useEffect(() => {
    const fetchCarriers = async () => {
      const { data } = await supabase
        .from('carriers')
        .select('carrier_id, carrier_descr')
        .order('carrier_id')

      if (data) {
        // Get distinct carriers (unique carrier_id values)
        const uniqueCarriers = data.reduce((acc, curr) => {
          if (!acc.find(c => c.carrier_id === curr.carrier_id)) {
            acc.push({ carrier_id: curr.carrier_id, carrier_descr: curr.carrier_descr })
          }
          return acc
        }, [] as { carrier_id: string; carrier_descr: string }[])
        setDistinctCarriers(uniqueCarriers)
      }
    }
    fetchCarriers()
  }, [])

  // Fetch assigned CSR details when component mounts
  useEffect(() => {
    const fetchAssignedCSR = async () => {
      if (!order.csr_id) {
        setAssignedCSR(null)
        return
      }

      const { data } = await supabase
        .from('csrs')
        .select('first_name, last_name')
        .eq('email', order.csr_id)
        .single()

      if (data) {
        setAssignedCSR(data)
      } else {
        setAssignedCSR(null)
      }
    }
    fetchAssignedCSR()
  }, [order.csr_id])

  // Fetch ship via options when carrier changes
  useEffect(() => {
    const fetchShipViaOptions = async () => {
      if (!carrier) {
        setShipViaOptions([])
        setShipVia('') // Clear ship via when no carrier selected
        return
      }
      
      const { data } = await supabase
        .from('carriers')
        .select('ship_via_code, ship_via_desc')
        .eq('carrier_id', carrier)
        .order('ship_via_code')
      
      if (data) {
        setShipViaOptions(data)
        // Clear ship via if current value is not valid for new carrier
        if (shipVia && !data.find(s => s.ship_via_code === shipVia)) {
          setShipVia('')
        }
      } else {
        setShipViaOptions([])
        setShipVia('')
      }
    }
    fetchShipViaOptions()
  }, [carrier])

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
    setShipToName(order.shipto_name || '')
    setIsEditing(true)
  }

  const handleSave = async () => {
    // Validation: If carrier is selected, ship via must also be selected
    if (carrier.trim() && !shipVia.trim()) {
      alert('Ship Via is required when a Carrier is selected. Please select a Ship Via code.')
      return
    }

    // Save the values as entered (trimmed)
    const updatedData = {
      shipto_name: shipToName.trim() || null,
      cust_shipto_address_line1: address.line1.trim() || null,
      cust_shipto_address_line2: address.line2.trim() || null,
      cust_shipto_address_line3: address.line3.trim() || null,
      cust_shipto_city: address.city.trim() || null,
      cust_shipto_state: address.state.trim() || null,
      cust_shipto_postal_code: address.postal.trim() || null,
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
        shipto_name: order.shipto_name,
        line1: order.cust_shipto_address_line1,
        line2: order.cust_shipto_address_line2,
        line3: order.cust_shipto_address_line3,
        city: order.cust_shipto_city,
        state: order.cust_shipto_state,
        postal: order.cust_shipto_postal_code,
        carrier: order.cust_carrier,
        ship_via: order.cust_ship_via,
      }),
      new_value: JSON.stringify({
        shipto_name: updatedData.shipto_name,
        line1: updatedData.cust_shipto_address_line1,
        line2: updatedData.cust_shipto_address_line2,
        line3: updatedData.cust_shipto_address_line3,
        city: updatedData.cust_shipto_city,
        state: updatedData.cust_shipto_state,
        postal: updatedData.cust_shipto_postal_code,
        carrier: updatedData.cust_carrier,
        ship_via: updatedData.cust_ship_via,
      }),
    })

    setIsEditing(false)
    router.refresh()
  }

  const isCancelled = order.status_code === '06'
  const isImportSuccessful = order.status_code === '05'
  const isUploadInProcess = order.status_code === '04'
  const canEdit = !isCancelled && !isImportSuccessful && !isUploadInProcess

  return (
    <div className="rounded-md shadow-sm border border-gray-200 bg-white p-5 space-y-4">
      {/* Header Info - Table layout for proper alignment */}
      <div className="text-[13px]" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left side: Order details as table */}
        <table style={{ borderCollapse: 'collapse', marginBottom: '6px' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 700, color: '#333F48', textAlign: 'right', paddingRight: '6px', paddingBottom: '6px', whiteSpace: 'nowrap' }}>Cust.</td>
              <td style={{ color: '#333F48', paddingRight: '24px', paddingBottom: '6px' }}>{order.customers?.customer_name || order.customername || 'N/A'}</td>
              <td style={{ fontWeight: 700, color: '#333F48', paddingRight: '6px', paddingBottom: '6px', whiteSpace: 'nowrap' }}>Cust Ord #</td>
              <td style={{ color: '#333F48', paddingRight: '24px', paddingBottom: '6px' }}>{order.cust_order_number}</td>
              <td style={{ fontWeight: 700, color: '#333F48', paddingRight: '6px', paddingBottom: '6px', whiteSpace: 'nowrap' }}>Order Date</td>
              <td style={{ color: '#333F48', paddingRight: '24px', paddingBottom: '6px' }}>{order.cust_order_date ? format(parseISO(order.cust_order_date), 'MMM d, yyyy') : 'N/A'}</td>
              <td style={{ fontWeight: 700, color: '#333F48', paddingRight: '6px', paddingBottom: '6px', whiteSpace: 'nowrap' }}>PS Order #</td>
              <td style={{
                color: isImportSuccessful ? '#15803d' : '#333F48',
                fontWeight: isImportSuccessful ? 700 : 400,
                paddingBottom: '6px'
              }}>
                {isImportSuccessful && order.ps_order_number ? (
                  <a
                    href={`https://sonanceerp.corp.sonance.com/psp/FS92SYS/EMPLOYEE/ERP/c/MAINTAIN_SALES_ORDERS.ORDENT_SEARCH.GBL?Page=ORDENT_SEARCH&Action=U&BUSINESS_UNIT=DANA1&ORDER_NO=${order.ps_order_number}&ICAction=ORDENT_SEARCH_BTN`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#15803d',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#166534'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#15803d'
                    }}
                  >
                    {order.ps_order_number}
                  </a>
                ) : (
                  order.ps_order_number || '—'
                )}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, color: '#333F48', textAlign: 'right', paddingRight: '6px', whiteSpace: 'nowrap' }}>Email</td>
              <td style={{ color: '#333F48', paddingRight: '24px' }}>{order.email_sender || '—'}</td>
              <td style={{ fontWeight: 700, color: '#333F48', paddingRight: '6px', whiteSpace: 'nowrap' }}>PS Acct ID</td>
              <td style={{ color: '#333F48', paddingRight: '24px' }}>{order.ps_customer_id || '—'}</td>
              <td style={{ fontWeight: 700, color: '#333F48', paddingRight: '6px', whiteSpace: 'nowrap' }}>Email Date</td>
              <td style={{ color: '#333F48', paddingRight: '24px' }}>{order.email_received_at ? format(parseISO(order.email_received_at), 'MMM d, yyyy') : '—'}</td>
              <td style={{ fontWeight: 700, color: '#333F48', paddingRight: '6px', whiteSpace: 'nowrap' }}>Assigned ISR</td>
              <td style={{ color: '#333F48' }}>
                {assignedCSR ? `${assignedCSR.first_name} ${assignedCSR.last_name}` : '—'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Right side: Order Status and Currency */}
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 700, color: '#333F48', textAlign: 'right', paddingRight: '6px', paddingBottom: '6px', whiteSpace: 'nowrap' }}>Status</td>
              <td style={{ paddingBottom: '6px' }}>
                <StatusBadge
                  statusCode={order.status_code}
                  statusName={order.order_statuses?.status_name || ''}
                />
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, color: '#333F48', textAlign: 'right', paddingRight: '6px', whiteSpace: 'nowrap' }}>Curr $</td>
              <td style={{ color: '#333F48' }}>{order.currency_code || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {isCancelled && (
        <div className="rounded-sm bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-semibold text-red-800">
            Order Cancelled
            {order.cancelled_at && (
              <span className="ml-2 text-red-600 font-normal">
                on {format(parseISO(order.cancelled_at), 'MMM d, yyyy')}
              </span>
            )}
          </p>
          {order.cancelled_reason && (
            <p className="mt-2 text-sm text-red-700">{order.cancelled_reason}</p>
          )}
        </div>
      )}

      {isImportSuccessful && (
        <div className="rounded-sm bg-green-50 border border-green-200 p-4">
          <p className="text-sm" style={{ color: '#15803d' }}>
            Order Successfully Imported to PeopleSoft - No edits allowed. Navigate to order{' '}
            {order.ps_order_number ? (
              <a
                href={`https://sonanceerp.corp.sonance.com/psp/FS92SYS/EMPLOYEE/ERP/c/MAINTAIN_SALES_ORDERS.ORDENT_SEARCH.GBL?Page=ORDENT_SEARCH&Action=U&BUSINESS_UNIT=DANA1&ORDER_NO=${order.ps_order_number}&ICAction=ORDENT_SEARCH_BTN`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#15803d',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#166534'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#15803d'
                }}
              >
                here
              </a>
            ) : (
              'here'
            )}
          </p>
        </div>
      )}

      {isUploadInProcess && (
        <div className="rounded-sm bg-orange-50 border border-orange-200 p-4">
          <p className="text-sm" style={{ fontWeight: 700, color: '#ea580c' }}>
            Order Upload to PeopleSoft in Process - No edits allowed
          </p>
        </div>
      )}

      {/* Ship-to Address and Carrier & Ship Method */}
      <div className="pt-4 border-t border-[#D9D9D6]">
        <button
          onClick={() => setHeaderExpanded(!headerExpanded)}
          className="flex items-center cursor-pointer hover:opacity-80 transition-opacity mb-2"
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <MapPin className="h-4 w-4 text-[#00A3E1]" style={{ marginRight: '10px' }} />
          <h3 className="font-bold uppercase tracking-widest text-[#333F48]" style={{ fontSize: '12px' }}>
            Ship-to Address & Carrier
          </h3>
          <span
            style={{
              fontSize: '16px',
              color: '#00A3E1',
              transition: 'transform 0.2s',
              transform: headerExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              display: 'inline-block',
              marginLeft: '12px'
            }}
          >
            ▶
          </span>
        </button>
        {headerExpanded && (
        <div className="flex flex-wrap gap-6" style={{ position: 'relative', paddingBottom: '40px' }}>
          {/* Ship-to Address Section */}
          <div className="flex-shrink-0">
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
                    <td style={{
                      fontWeight: 600,
                      textAlign: 'right',
                      paddingRight: '0.5rem',
                      whiteSpace: 'nowrap',
                      color: !order.shipto_name ? 'red' : '#333F48'
                    }}>Ship To Name</td>
                    <td style={{
                      paddingRight: isEditing ? '1.5rem' : 0,
                      color: !order.shipto_name ? 'red' : '#333F48'
                    }}>{order.shipto_name || '—'}</td>
                    {isEditing && (
                      <td>
                        <input
                          type="text"
                          value={shipToName}
                          onChange={(e) => setShipToName(e.target.value)}
                          placeholder="Ship To Name"
                          className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                          style={{ minWidth: '180px' }}
                        />
                      </td>
                    )}
                  </tr>
                  {(isEditing || order.cust_shipto_address_line1) && (
                    <tr>
                      <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Addr Line 1</td>
                      <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_address_line1 || '—'}</td>
                      {isEditing && (
                        <td>
                          <input
                            type="text"
                            value={address.line1}
                            onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                            placeholder="Address Line 1"
                            className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                            style={{ minWidth: '180px' }}
                          />
                        </td>
                      )}
                    </tr>
                  )}
                  {(isEditing || order.cust_shipto_address_line2) && (
                    <tr>
                      <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Addr Line 2</td>
                      <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_address_line2 || '—'}</td>
                      {isEditing && (
                        <td>
                          <input
                            type="text"
                            value={address.line2}
                            onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                            placeholder="Address Line 2"
                            className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                            style={{ minWidth: '180px' }}
                          />
                        </td>
                      )}
                    </tr>
                  )}
                  {(isEditing || order.cust_shipto_address_line3) && (
                    <tr>
                      <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Addr Line 3</td>
                      <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_address_line3 || '—'}</td>
                      {isEditing && (
                        <td>
                          <input
                            type="text"
                            value={address.line3}
                            onChange={(e) => setAddress({ ...address, line3: e.target.value })}
                            placeholder="Address Line 3"
                            className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                            style={{ minWidth: '180px' }}
                          />
                        </td>
                      )}
                    </tr>
                  )}
                  {(isEditing || order.cust_shipto_city) && (
                    <tr>
                      <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>City</td>
                      <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_city || '—'}</td>
                      {isEditing && (
                        <td>
                          <input
                            type="text"
                            value={address.city}
                            onChange={(e) => setAddress({ ...address, city: e.target.value })}
                            placeholder="City"
                            className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                            style={{ minWidth: '180px' }}
                          />
                        </td>
                      )}
                    </tr>
                  )}
                  {(isEditing || order.cust_shipto_state) && (
                    <tr>
                      <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>State</td>
                      <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_state || '—'}</td>
                      {isEditing && (
                        <td>
                          {isUSA(address.country) || isUSA(order.cust_shipto_country) ? (
                            <select
                              value={address.state}
                              onChange={(e) => setAddress({ ...address, state: e.target.value })}
                              className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
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
                              className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                              style={{ minWidth: '180px' }}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  )}
                  {(isEditing || order.cust_shipto_postal_code) && (
                    <tr>
                      <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Postal</td>
                      <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_postal_code || '—'}</td>
                      {isEditing && (
                        <td>
                          <input
                            type="text"
                            value={address.postal}
                            onChange={(e) => setAddress({ ...address, postal: e.target.value })}
                            placeholder="Postal Code"
                            className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                            style={{ minWidth: '180px' }}
                          />
                        </td>
                      )}
                    </tr>
                  )}
                  {(isEditing || order.cust_shipto_country) && (
                    <tr>
                      <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Country</td>
                      <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.cust_shipto_country || '—'}</td>
                      {isEditing && <td></td>}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Carrier & Ship Method Section - to the right of New Value */}
          <div className="flex-shrink-0" style={{ marginLeft: isEditing ? '2rem' : '3rem' }}>
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
                    <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Cust Ship Meth</td>
                    <td style={{ paddingRight: isEditing ? '1.5rem' : 0 }}>{order.custshipmethod || '—'}</td>
                    {isEditing && <td></td>}
                  </tr>
                  <tr>
                    <td style={{
                      fontWeight: 600,
                      textAlign: 'right',
                      paddingRight: '0.5rem',
                      whiteSpace: 'nowrap',
                      color: !order.cust_carrier ? 'red' : '#333F48'
                    }}>Carrier</td>
                    <td style={{
                      paddingRight: isEditing ? '1.5rem' : 0,
                      color: !order.cust_carrier ? 'red' : '#333F48'
                    }}>{order.cust_carrier || '—'}</td>
                    {isEditing && (
                      <td>
                        <select
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                          style={{ minWidth: '150px' }}
                        >
                          <option value="">Select Carrier</option>
                          {distinctCarriers.map((c) => (
                            <option key={c.carrier_id} value={c.carrier_id}>
                              {c.carrier_id} - {c.carrier_descr}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td style={{
                      fontWeight: 600,
                      textAlign: 'right',
                      paddingRight: '0.5rem',
                      whiteSpace: 'nowrap',
                      color: !order.cust_ship_via ? 'red' : '#333F48'
                    }}>Ship Via</td>
                    <td style={{
                      paddingRight: isEditing ? '1.5rem' : 0,
                      color: !order.cust_ship_via ? 'red' : '#333F48'
                    }}>{order.cust_ship_via || '—'}</td>
                    {isEditing && (
                      <td>
                        <select
                          value={shipVia}
                          onChange={(e) => setShipVia(e.target.value)}
                          className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                          style={{ minWidth: '150px' }}
                          disabled={!carrier}
                        >
                          <option value="">{carrier ? 'Select Ship Via' : 'Select Carrier first'}</option>
                          {shipViaOptions.map((s) => (
                            <option key={s.ship_via_code} value={s.ship_via_code}>
                              {s.ship_via_code} - {s.ship_via_desc}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit/Save/Cancel Buttons - Lower Right */}
          {canEdit && (
            <div style={{
              position: 'absolute',
              bottom: '5px',
              right: '10px',
              display: 'flex',
              gap: '8px'
            }}>
              {!isEditing ? (
                <button
                  onClick={handleStartEdit}
                  className="py-1.5 text-xs font-medium transition-colors"
                  style={{ 
                    border: '1px solid #00A3E1', 
                    borderRadius: '20px', 
                    backgroundColor: 'white',
                    color: '#00A3E1',
                    paddingLeft: '21px',
                    paddingRight: '21px'
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
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="py-1.5 text-xs font-medium transition-colors"
                    style={{
                      border: '1px solid #00A3E1',
                      borderRadius: '20px',
                      backgroundColor: 'white',
                      color: '#00A3E1',
                      paddingLeft: '21px',
                      paddingRight: '21px'
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
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setShipToName(order.shipto_name || '')
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
                    className="py-1.5 text-xs font-medium transition-colors"
                    style={{
                      border: '1px solid #00A3E1',
                      borderRadius: '20px',
                      backgroundColor: 'white',
                      color: '#00A3E1',
                      paddingLeft: '21px',
                      paddingRight: '21px'
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
                    Exit
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        )}

        {/* Order Header Notes Panel - Collapsible */}
        {order.cust_header_notes && (
          <div className="mt-4 pt-4 border-t border-[#D9D9D6]">
            <button
              onClick={() => setNotesExpanded(!notesExpanded)}
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              <FileText className="h-4 w-4 text-[#00A3E1]" style={{ marginRight: '10px' }} />
              <h3 className="font-bold uppercase tracking-widest text-[#333F48]" style={{ fontSize: '12px' }}>
                ORDER HEADER NOTES
              </h3>
              <span 
                style={{ 
                  fontSize: '16px', 
                  color: '#00A3E1',
                  transition: 'transform 0.2s',
                  transform: notesExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  display: 'inline-block',
                  marginLeft: '12px'
                }}
              >
                ▶
              </span>
            </button>
            {notesExpanded && (
              <div
                className="rounded-md shadow-sm border border-gray-200 bg-[#F9F9F9] p-3 mt-2"
                style={{ fontSize: '12px', color: '#333F48', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}
              >
                {order.cust_header_notes}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

