'use client'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { format, parseISO } from 'date-fns'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/types/database'
import { useRouter } from 'next/navigation'
import { MapPin, Truck, FileText, RotateCcw, XCircle } from 'lucide-react'
import { createPortal } from 'react-dom'
import { usePDFHighlight } from '@/lib/contexts/PDFHighlightContext'
import { assignPSOrderNumber } from '@/lib/utils/assignPSOrderNumber'

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
  const [customerDefaults, setCustomerDefaults] = useState<{
    default_carrier: string | null
    default_ship_via: string | null
    default_shipto_name: string | null
  }>({
    default_carrier: null,
    default_ship_via: null,
    default_shipto_name: null,
  })
  const [hoveredDefault, setHoveredDefault] = useState<string | null>(null)
  const [showErrorTooltip, setShowErrorTooltip] = useState(false)
  const [errorTooltipPosition, setErrorTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const { isEnabled: isPDFHighlightEnabled, setHighlight, clearHighlight } = usePDFHighlight()

  // Check for missing required fields in ship-to address and carrier section
  const missingRequiredFields = []
  if (!order.shipto_name) missingRequiredFields.push('Ship To Name')
  if (!order.cust_shipto_address_line1) missingRequiredFields.push('Address Line 1')
  if (!order.cust_shipto_city) missingRequiredFields.push('City')
  if (!order.cust_shipto_state) missingRequiredFields.push('State')
  if (!order.cust_shipto_postal_code) missingRequiredFields.push('Postal Code')
  if (!order.cust_carrier) missingRequiredFields.push('Carrier')
  if (!order.cust_ship_via) missingRequiredFields.push('Ship Via')

  const hasMissingFields = missingRequiredFields.length > 0

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

  // Fetch customer default values
  useEffect(() => {
    const fetchCustomerDefaults = async () => {
      if (!order.customers?.ps_customer_id) {
        return
      }

      const { data } = await supabase
        .from('customers')
        .select('default_carrier, default_ship_via, default_shipto_name')
        .eq('ps_customer_id', order.customers.ps_customer_id)
        .single()

      if (data) {
        setCustomerDefaults({
          default_carrier: data.default_carrier,
          default_ship_via: data.default_ship_via,
          default_shipto_name: data.default_shipto_name,
        })
      }
    }
    fetchCustomerDefaults()
  }, [order.customers?.ps_customer_id])

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

  // Apply default carrier
  const handleApplyDefaultCarrier = async () => {
    if (customerDefaults.default_carrier) {
      setCarrier(customerDefaults.default_carrier)

      // If not in edit mode, save immediately
      if (!isEditing) {
        const { error } = await supabase
          .from('orders')
          .update({ cust_carrier: customerDefaults.default_carrier })
          .eq('id', order.id)

        if (!error) {
          router.refresh()
        }
      }
    }
  }

  // Apply default ship via
  const handleApplyDefaultShipVia = async () => {
    if (customerDefaults.default_ship_via) {
      setShipVia(customerDefaults.default_ship_via)

      // If not in edit mode, save immediately
      if (!isEditing) {
        const { error } = await supabase
          .from('orders')
          .update({ cust_ship_via: customerDefaults.default_ship_via })
          .eq('id', order.id)

        if (!error) {
          router.refresh()
        }
      }
    }
  }

  // Apply default ship to name
  const handleApplyDefaultShipToName = async () => {
    if (customerDefaults.default_shipto_name) {
      setShipToName(customerDefaults.default_shipto_name)

      // If not in edit mode, save immediately
      if (!isEditing) {
        const { error } = await supabase
          .from('orders')
          .update({ shipto_name: customerDefaults.default_shipto_name })
          .eq('id', order.id)

        if (!error) {
          router.refresh()
        }
      }
    }
  }

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

    // Assign PS Order Number if not already assigned
    await assignPSOrderNumber(supabase, order.id)

    // If order status is "Rev No Changes" (02), update it to "Rev With Changes" (03)
    if (order.status_code === '02') {
      await supabase
        .from('orders')
        .update({ status_code: '03' })
        .eq('id', order.id)

      // Log status change
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status_code: '03',
        changed_by: userId,
        notes: 'Order header modified - status changed from Rev No Changes to Rev With Changes',
      })
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
              <td
                style={{
                  color: '#333F48',
                  paddingRight: '24px',
                  paddingBottom: '6px',
                  cursor: isPDFHighlightEnabled ? 'crosshair' : 'default',
                  backgroundColor: 'transparent',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (isPDFHighlightEnabled && order.cust_order_number) {
                    setHighlight({
                      fieldType: 'order_header',
                      fieldName: 'cust_order_number',
                      value: order.cust_order_number,
                      context: 'Order Header'
                    })
                    e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (isPDFHighlightEnabled) {
                    clearHighlight()
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                {order.cust_order_number}
              </td>
              <td style={{ fontWeight: 700, color: '#333F48', paddingRight: '6px', paddingBottom: '6px', whiteSpace: 'nowrap' }}>Order Date</td>
              <td
                style={{
                  color: '#333F48',
                  paddingRight: '24px',
                  paddingBottom: '6px',
                  cursor: isPDFHighlightEnabled ? 'crosshair' : 'default',
                  backgroundColor: 'transparent',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (isPDFHighlightEnabled && order.cust_order_date) {
                    try {
                      // Get just the month/day/year parts to search for
                      const parsedDate = parseISO(order.cust_order_date)
                      const month = format(parsedDate, 'M')        // "1"
                      const day = format(parsedDate, 'd')          // "15"
                      const year = format(parsedDate, 'yyyy')      // "2024"

                      // Search for a simple format that's most likely to match: M/d/yyyy
                      const searchValue = `${month}/${day}/${year}`

                      setHighlight({
                        fieldType: 'order_header',
                        fieldName: 'cust_order_date',
                        value: searchValue,
                        context: 'Order Header'
                      })
                      e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                    } catch (err) {
                      console.warn('[PDF] Could not parse date:', err)
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (isPDFHighlightEnabled) {
                    clearHighlight()
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                {order.cust_order_date ? format(parseISO(order.cust_order_date), 'MMM d, yyyy') : 'N/A'}
              </td>
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
          {hasMissingFields && (
            <span
              className="inline-flex items-center cursor-help"
              style={{ marginLeft: '8px', position: 'relative' }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setErrorTooltipPosition({
                  x: rect.left + rect.width / 2,
                  y: rect.top
                })
                setShowErrorTooltip(true)
              }}
              onMouseLeave={() => {
                setShowErrorTooltip(false)
                setErrorTooltipPosition(null)
              }}
            >
              <XCircle size={16} style={{ color: '#dc2626' }} />
              {showErrorTooltip && errorTooltipPosition && typeof document !== 'undefined' && createPortal(
                <div style={{
                  position: 'fixed',
                  left: `${errorTooltipPosition.x}px`,
                  top: `${errorTooltipPosition.y - 10}px`,
                  transform: 'translate(-50%, -100%)',
                  backgroundColor: '#fee',
                  border: '1px solid #dc2626',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  zIndex: 9999,
                  minWidth: '200px',
                  whiteSpace: 'nowrap'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
                    ⚠ Required Fields Missing
                  </div>
                  <div style={{ fontSize: '10px', color: '#991b1b', lineHeight: '1.5' }}>
                    {missingRequiredFields.join(', ')}
                  </div>
                  {/* Tooltip arrow */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '0',
                    height: '0',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid #dc2626'
                  }} />
                </div>,
                document.body
              )}
            </span>
          )}
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
                    }}>
                      Ship To Name
                      {isEditing && <span style={{ color: !order.shipto_name ? 'red' : '#00A3E1', marginLeft: '2px' }}>*</span>}
                    </td>
                    <td style={{
                      paddingRight: isEditing ? '1.5rem' : 0,
                      color: !order.shipto_name ? 'red' : '#333F48',
                      position: 'relative',
                      cursor: isPDFHighlightEnabled && !isEditing ? 'crosshair' : 'default',
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (isPDFHighlightEnabled && !isEditing && order.shipto_name) {
                        setHighlight({
                          fieldType: 'shipto_address',
                          fieldName: 'shipto_name',
                          value: order.shipto_name,
                          context: 'Ship To Address'
                        })
                        e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isPDFHighlightEnabled && !isEditing) {
                        clearHighlight()
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}>
                      {order.shipto_name || '—'}
                      {!isEditing && customerDefaults.default_shipto_name && !order.shipto_name && (
                        <button
                          onClick={handleApplyDefaultShipToName}
                          onMouseEnter={() => setHoveredDefault('shipToName')}
                          onMouseLeave={() => setHoveredDefault(null)}
                          style={{
                            marginLeft: '8px',
                            padding: '2px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#00A3E1',
                            display: 'inline-flex',
                            alignItems: 'center',
                            position: 'relative'
                          }}
                        >
                          <RotateCcw size={14} />
                          {hoveredDefault === 'shipToName' && (
                            <span style={{
                              position: 'absolute',
                              top: '-30px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              backgroundColor: '#333',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              whiteSpace: 'nowrap',
                              zIndex: 1000
                            }}>
                              Apply Default: {customerDefaults.default_shipto_name}
                            </span>
                          )}
                        </button>
                      )}
                    </td>
                    {isEditing && (
                      <td style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={shipToName}
                          onChange={(e) => setShipToName(e.target.value)}
                          placeholder="Ship To Name (Required)"
                          className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                          style={{ minWidth: '180px' }}
                        />
                        {customerDefaults.default_shipto_name && !shipToName && (
                          <button
                            onClick={handleApplyDefaultShipToName}
                            onMouseEnter={() => setHoveredDefault('shipToName-edit')}
                            onMouseLeave={() => setHoveredDefault(null)}
                            style={{
                              position: 'absolute',
                              right: '-24px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              padding: '2px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: '#00A3E1',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            <RotateCcw size={14} />
                            {hoveredDefault === 'shipToName-edit' && (
                              <span style={{
                                position: 'absolute',
                                top: '-30px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#333',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                whiteSpace: 'nowrap',
                                zIndex: 1000
                              }}>
                                Apply Default: {customerDefaults.default_shipto_name}
                              </span>
                            )}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td style={{
                      fontWeight: 600,
                      textAlign: 'right',
                      paddingRight: '0.5rem',
                      whiteSpace: 'nowrap',
                      color: !order.cust_shipto_address_line1 ? 'red' : '#333F48'
                    }}>
                      Addr Line 1
                      {isEditing && <span style={{ color: !order.cust_shipto_address_line1 ? 'red' : '#00A3E1', marginLeft: '2px' }}>*</span>}
                    </td>
                      <td style={{
                        paddingRight: isEditing ? '1.5rem' : 0,
                        color: !order.cust_shipto_address_line1 ? 'red' : '#333F48',
                        cursor: isPDFHighlightEnabled && !isEditing ? 'crosshair' : 'default',
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (isPDFHighlightEnabled && !isEditing && order.cust_shipto_address_line1) {
                          setHighlight({
                            fieldType: 'shipto_address',
                            fieldName: 'cust_shipto_address_line1',
                            value: order.cust_shipto_address_line1,
                            context: 'Ship To Address'
                          })
                          e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isPDFHighlightEnabled && !isEditing) {
                          clearHighlight()
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}>{order.cust_shipto_address_line1 || '—'}</td>
                      {isEditing && (
                        <td>
                          <input
                            type="text"
                            value={address.line1}
                            onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                            placeholder="Address Line 1 (Required)"
                            className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                            style={{ minWidth: '180px' }}
                          />
                        </td>
                      )}
                    </tr>
                  {(isEditing || order.cust_shipto_address_line2) && (
                    <tr>
                      <td style={{ fontWeight: 600, textAlign: 'right', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>Addr Line 2</td>
                      <td style={{
                        paddingRight: isEditing ? '1.5rem' : 0,
                        cursor: isPDFHighlightEnabled && !isEditing ? 'crosshair' : 'default',
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (isPDFHighlightEnabled && !isEditing && order.cust_shipto_address_line2) {
                          setHighlight({
                            fieldType: 'shipto_address',
                            fieldName: 'cust_shipto_address_line2',
                            value: order.cust_shipto_address_line2,
                            context: 'Ship To Address'
                          })
                          e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isPDFHighlightEnabled && !isEditing) {
                          clearHighlight()
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}>{order.cust_shipto_address_line2 || '—'}</td>
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
                      <td style={{
                        paddingRight: isEditing ? '1.5rem' : 0,
                        cursor: isPDFHighlightEnabled && !isEditing ? 'crosshair' : 'default',
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (isPDFHighlightEnabled && !isEditing && order.cust_shipto_address_line3) {
                          setHighlight({
                            fieldType: 'shipto_address',
                            fieldName: 'cust_shipto_address_line3',
                            value: order.cust_shipto_address_line3,
                            context: 'Ship To Address'
                          })
                          e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isPDFHighlightEnabled && !isEditing) {
                          clearHighlight()
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}>{order.cust_shipto_address_line3 || '—'}</td>
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
                  <tr>
                      <td style={{
                        fontWeight: 600,
                        textAlign: 'right',
                        paddingRight: '0.5rem',
                        whiteSpace: 'nowrap',
                        color: !order.cust_shipto_city ? 'red' : '#333F48'
                      }}>
                        City
                        {isEditing && <span style={{ color: !order.cust_shipto_city ? 'red' : '#00A3E1', marginLeft: '2px' }}>*</span>}
                      </td>
                      <td style={{
                        paddingRight: isEditing ? '1.5rem' : 0,
                        color: !order.cust_shipto_city ? 'red' : '#333F48',
                        cursor: isPDFHighlightEnabled && !isEditing ? 'crosshair' : 'default',
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (isPDFHighlightEnabled && !isEditing && order.cust_shipto_city) {
                          setHighlight({
                            fieldType: 'shipto_address',
                            fieldName: 'cust_shipto_city',
                            value: order.cust_shipto_city,
                            context: 'Ship To Address'
                          })
                          e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isPDFHighlightEnabled && !isEditing) {
                          clearHighlight()
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}>{order.cust_shipto_city || '—'}</td>
                      {isEditing && (
                        <td>
                          <input
                            type="text"
                            value={address.city}
                            onChange={(e) => setAddress({ ...address, city: e.target.value })}
                            placeholder="City (Required)"
                            className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                            style={{ minWidth: '180px' }}
                          />
                        </td>
                      )}
                    </tr>
                  <tr>
                      <td style={{
                        fontWeight: 600,
                        textAlign: 'right',
                        paddingRight: '0.5rem',
                        whiteSpace: 'nowrap',
                        color: !order.cust_shipto_state ? 'red' : '#333F48'
                      }}>
                        State
                        {isEditing && <span style={{ color: !order.cust_shipto_state ? 'red' : '#00A3E1', marginLeft: '2px' }}>*</span>}
                      </td>
                      <td style={{
                        paddingRight: isEditing ? '1.5rem' : 0,
                        color: !order.cust_shipto_state ? 'red' : '#333F48',
                        cursor: isPDFHighlightEnabled && !isEditing ? 'crosshair' : 'default',
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (isPDFHighlightEnabled && !isEditing && order.cust_shipto_state) {
                          setHighlight({
                            fieldType: 'shipto_address',
                            fieldName: 'cust_shipto_state',
                            value: order.cust_shipto_state,
                            context: 'Ship To Address'
                          })
                          e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isPDFHighlightEnabled && !isEditing) {
                          clearHighlight()
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}>{order.cust_shipto_state || '—'}</td>
                      {isEditing && (
                        <td>
                          {isUSA(address.country) || isUSA(order.cust_shipto_country) ? (
                            <select
                              value={address.state}
                              onChange={(e) => setAddress({ ...address, state: e.target.value })}
                              className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                              style={{ minWidth: '180px' }}
                            >
                              <option value="">Select State (Required)</option>
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
                              placeholder="State/Province (Required)"
                              className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                              style={{ minWidth: '180px' }}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  <tr>
                      <td style={{
                        fontWeight: 600,
                        textAlign: 'right',
                        paddingRight: '0.5rem',
                        whiteSpace: 'nowrap',
                        color: !order.cust_shipto_postal_code ? 'red' : '#333F48'
                      }}>
                        Postal
                        {isEditing && <span style={{ color: !order.cust_shipto_postal_code ? 'red' : '#00A3E1', marginLeft: '2px' }}>*</span>}
                      </td>
                      <td style={{
                        paddingRight: isEditing ? '1.5rem' : 0,
                        color: !order.cust_shipto_postal_code ? 'red' : '#333F48',
                        cursor: isPDFHighlightEnabled && !isEditing ? 'crosshair' : 'default',
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (isPDFHighlightEnabled && !isEditing && order.cust_shipto_postal_code) {
                          setHighlight({
                            fieldType: 'shipto_address',
                            fieldName: 'cust_shipto_postal_code',
                            value: order.cust_shipto_postal_code,
                            context: 'Ship To Address'
                          })
                          e.currentTarget.style.backgroundColor = 'rgba(0, 163, 225, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isPDFHighlightEnabled && !isEditing) {
                          clearHighlight()
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}>{order.cust_shipto_postal_code || '—'}</td>
                      {isEditing && (
                        <td>
                          <input
                            type="text"
                            value={address.postal}
                            onChange={(e) => setAddress({ ...address, postal: e.target.value })}
                            placeholder="Postal Code (Required)"
                            className="w-full rounded-xl border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-[#00A3E1] focus:outline-none focus:ring-1 focus:ring-[#00A3E1]/20"
                            style={{ minWidth: '180px' }}
                          />
                        </td>
                      )}
                    </tr>
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
                    }}>
                      Carrier
                      {isEditing && <span style={{ color: !order.cust_carrier ? 'red' : '#00A3E1', marginLeft: '2px' }}>*</span>}
                    </td>
                    <td style={{
                      paddingRight: isEditing ? '1.5rem' : 0,
                      color: !order.cust_carrier ? 'red' : '#333F48',
                      position: 'relative'
                    }}>
                      {order.cust_carrier || '—'}
                      {!isEditing && customerDefaults.default_carrier && !order.cust_carrier && (
                        <button
                          onClick={handleApplyDefaultCarrier}
                          onMouseEnter={() => setHoveredDefault('carrier')}
                          onMouseLeave={() => setHoveredDefault(null)}
                          style={{
                            marginLeft: '8px',
                            padding: '2px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#00A3E1',
                            display: 'inline-flex',
                            alignItems: 'center',
                            position: 'relative'
                          }}
                        >
                          <RotateCcw size={14} />
                          {hoveredDefault === 'carrier' && (
                            <span style={{
                              position: 'absolute',
                              top: '-30px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              backgroundColor: '#333',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              whiteSpace: 'nowrap',
                              zIndex: 1000
                            }}>
                              Apply Default: {customerDefaults.default_carrier}
                            </span>
                          )}
                        </button>
                      )}
                    </td>
                    {isEditing && (
                      <td style={{ position: 'relative' }}>
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
                        {customerDefaults.default_carrier && !carrier && (
                          <button
                            onClick={handleApplyDefaultCarrier}
                            onMouseEnter={() => setHoveredDefault('carrier-edit')}
                            onMouseLeave={() => setHoveredDefault(null)}
                            style={{
                              position: 'absolute',
                              right: '-24px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              padding: '2px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: '#00A3E1',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            <RotateCcw size={14} />
                            {hoveredDefault === 'carrier-edit' && (
                              <span style={{
                                position: 'absolute',
                                top: '-30px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#333',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                whiteSpace: 'nowrap',
                                zIndex: 1000
                              }}>
                                Apply Default: {customerDefaults.default_carrier}
                              </span>
                            )}
                          </button>
                        )}
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
                    }}>
                      Ship Via
                      {isEditing && <span style={{ color: !order.cust_ship_via ? 'red' : '#00A3E1', marginLeft: '2px' }}>*</span>}
                    </td>
                    <td style={{
                      paddingRight: isEditing ? '1.5rem' : 0,
                      color: !order.cust_ship_via ? 'red' : '#333F48',
                      position: 'relative'
                    }}>
                      {order.cust_ship_via || '—'}
                      {!isEditing && customerDefaults.default_ship_via && !order.cust_ship_via && (
                        <button
                          onClick={handleApplyDefaultShipVia}
                          onMouseEnter={() => setHoveredDefault('shipVia')}
                          onMouseLeave={() => setHoveredDefault(null)}
                          style={{
                            marginLeft: '8px',
                            padding: '2px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#00A3E1',
                            display: 'inline-flex',
                            alignItems: 'center',
                            position: 'relative'
                          }}
                        >
                          <RotateCcw size={14} />
                          {hoveredDefault === 'shipVia' && (
                            <span style={{
                              position: 'absolute',
                              top: '-30px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              backgroundColor: '#333',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              whiteSpace: 'nowrap',
                              zIndex: 1000
                            }}>
                              Apply Default: {customerDefaults.default_ship_via}
                            </span>
                          )}
                        </button>
                      )}
                    </td>
                    {isEditing && (
                      <td style={{ position: 'relative' }}>
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
                        {customerDefaults.default_ship_via && !shipVia && (
                          <button
                            onClick={handleApplyDefaultShipVia}
                            onMouseEnter={() => setHoveredDefault('shipVia-edit')}
                            onMouseLeave={() => setHoveredDefault(null)}
                            style={{
                              position: 'absolute',
                              right: '-24px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              padding: '2px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: '#00A3E1',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            <RotateCcw size={14} />
                            {hoveredDefault === 'shipVia-edit' && (
                              <span style={{
                                position: 'absolute',
                                top: '-30px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#333',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                whiteSpace: 'nowrap',
                                zIndex: 1000
                              }}>
                                Apply Default: {customerDefaults.default_ship_via}
                              </span>
                            )}
                          </button>
                        )}
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

