'use client'

import { useState, useRef, useEffect } from 'react'
import { WizardStepProps } from '@/lib/types/wizard'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, AlertCircle, CheckCircle, Mail, AlertTriangle, ArrowRight } from 'lucide-react'

export function WizardStep4({ session, onNext, isLoading }: WizardStepProps) {
  const initialEmails = session.customer_data?.sender_email
    ? session.customer_data.sender_email.split(';').map(e => e.trim())
    : ['']

  const [emails, setEmails] = useState<string[]>(initialEmails)
  const [errors, setErrors] = useState<{ [key: number]: string }>({})
  const [checking, setChecking] = useState<{ [key: number]: boolean }>({})
  const [availability, setAvailability] = useState<{ [key: number]: boolean | null }>({})
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})

  const supabase = createClient()

  useEffect(() => {
    if (focusIndex !== null && inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex]?.focus()
      setFocusIndex(null)
    }
  }, [focusIndex])

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const checkEmailAvailability = async (email: string, index: number) => {
    if (!email.trim() || !isValidEmail(email)) {
      setAvailability({ ...availability, [index]: null })
      return
    }

    setChecking({ ...checking, [index]: true })

    const { data, error } = await supabase
      .from('customers')
      .select('sender_email')
      .or(`sender_email.eq.${email},sender_email.like.${email},%,sender_email.like.%,${email},%,sender_email.like.%,${email}`)
      .limit(1)

    setChecking({ ...checking, [index]: false })

    if (error) {
      console.error('Error checking email:', error)
      setAvailability({ ...availability, [index]: null })
      return
    }

    // Check if email is in use by another customer
    const isInUse = data && data.length > 0
    setAvailability({ ...availability, [index]: !isInUse })
  }

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)

    // Clear error for this index
    if (errors[index]) {
      const newErrors = { ...errors }
      delete newErrors[index]
      setErrors(newErrors)
    }

    // Reset availability
    setAvailability({ ...availability, [index]: null })

    // Debounce the availability check
    if (value.trim() && isValidEmail(value)) {
      const timer = setTimeout(() => checkEmailAvailability(value.trim(), index), 500)
      return () => clearTimeout(timer)
    }
  }

  const handleAddEmail = () => {
    const newIndex = emails.length
    setEmails([...emails, ''])
    setFocusIndex(newIndex)
  }

  const handleRemoveEmail = (index: number) => {
    if (emails.length <= 1) return
    const newEmails = emails.filter((_, i) => i !== index)
    setEmails(newEmails)

    // Clear error and availability for this index
    const newErrors = { ...errors }
    delete newErrors[index]
    setErrors(newErrors)

    const newAvailability = { ...availability }
    delete newAvailability[index]
    setAvailability(newAvailability)
  }

  const validateAndContinue = async () => {
    const newErrors: { [key: number]: string } = {}

    // First pass: check format and required
    emails.forEach((email, index) => {
      const trimmedEmail = email.trim()

      if (!trimmedEmail) {
        newErrors[index] = 'Email address is required'
      } else if (!isValidEmail(trimmedEmail)) {
        newErrors[index] = 'Invalid email format'
      }
    })

    // Check for duplicates within the list
    const emailList = emails.map(e => e.trim().toLowerCase()).filter(e => e)
    const duplicates = emailList.filter((email, idx) => emailList.indexOf(email) !== idx)
    if (duplicates.length > 0) {
      emails.forEach((email, index) => {
        if (duplicates.includes(email.trim().toLowerCase())) {
          newErrors[index] = 'Duplicate email address'
        }
      })
    }

    // If there are format/duplicate errors, stop here
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Check availability - get all customers and check their emails
    const { data: allCustomers, error: fetchError } = await supabase
      .from('customers')
      .select('sender_email, customer_name')

    if (fetchError) {
      console.error('Error fetching customers:', fetchError)
      setErrors({ 0: 'Error checking email availability. Please try again.' })
      return
    }

    // Build a map of emails to customer names
    const emailToCustomer = new Map<string, string>()
    if (allCustomers) {
      allCustomers.forEach(customer => {
        if (customer.sender_email) {
          // Split by semicolon since that's the separator used in the database
          const customerEmails = customer.sender_email.split(';').map(e => e.trim().toLowerCase())
          customerEmails.forEach(email => {
            if (email) emailToCustomer.set(email, customer.customer_name)
          })
        }
      })
    }

    // Check each email against existing emails
    emails.forEach((email, index) => {
      const trimmedEmail = email.trim().toLowerCase()
      if (!trimmedEmail) return

      const existingCustomer = emailToCustomer.get(trimmedEmail)
      if (existingCustomer) {
        newErrors[index] = `This email is already in use by ${existingCustomer}`
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Join emails with semicolon to match database format
    const senderEmail = emails.map(e => e.trim()).join(';')
    await onNext({ sender_email: senderEmail })
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[#333F48] mb-2">
          Sender Email Addresses
        </h2>
        <p className="text-[#6b7a85]">
          Customer: <strong>{session.customer_data?.customer_name}</strong>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#333F48] mb-2 flex items-center">
          <Mail className="h-5 w-5 flex-shrink-0" style={{ color: '#00A3E1', marginRight: '12px' }} />
          What are sender emails?
        </h3>
        <div style={{ marginLeft: '28px' }}>
          <p className="text-sm text-[#6b7a85]">
            These are the email addresses that will send orders for this customer.
            The automation system will monitor these addresses and process orders when they arrive.
          </p>
        </div>
      </div>

      {/* Email Inputs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <label className="block text-sm font-medium text-[#333F48]">
            Email Addresses <span className="text-red-500">*</span>
          </label>
          <button
            onClick={handleAddEmail}
            className="py-1.5 text-xs font-medium transition-colors flex items-center gap-2"
            style={{
              border: '1px solid #00A3E1',
              borderRadius: '20px',
              backgroundColor: 'white',
              color: '#00A3E1',
              paddingLeft: '16px',
              paddingRight: '16px',
              marginTop: '3pt'
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
            <Plus className="h-4 w-4" />
            Add Email
          </button>
        </div>

        <div>
          {emails.map((email, index) => (
            <div key={index} style={{ marginBottom: '16px' }}>
              <div className="flex items-center">
                <div className="relative" style={{ width: '240px' }}>
                  <input
                    ref={(el) => { inputRefs.current[index] = el }}
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    placeholder="email@example.com"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#00A3E1]/20 outline-none ${
                      errors[index]
                        ? 'border-red-500'
                        : availability[index] === true
                        ? 'border-green-500'
                        : availability[index] === false
                        ? 'border-orange-500'
                        : 'border-gray-300 focus:border-[#00A3E1]'
                    }`}
                  />

                  {/* Status Indicators (only when no error) */}
                  {!errors[index] && (
                    <>
                      {checking[index] && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin h-5 w-5 border-2 border-[#00A3E1] border-t-transparent rounded-full"></div>
                        </div>
                      )}
                      {!checking[index] && availability[index] === true && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                      {!checking[index] && availability[index] === false && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveEmail(index)}
                  disabled={emails.length <= 1}
                  className="transition-colors flex items-center justify-center flex-shrink-0"
                  style={{
                    border: emails.length <= 1 ? '1px solid #d1d5db' : '1px solid #00A3E1',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    color: emails.length <= 1 ? '#d1d5db' : '#00A3E1',
                    width: '19px',
                    height: '19px',
                    padding: '0',
                    cursor: emails.length <= 1 ? 'not-allowed' : 'pointer',
                    marginLeft: '24px'
                  }}
                  onMouseEnter={(e) => {
                    if (emails.length > 1) {
                      e.currentTarget.style.backgroundColor = '#00A3E1'
                      e.currentTarget.style.color = 'white'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (emails.length > 1) {
                      e.currentTarget.style.backgroundColor = 'white'
                      e.currentTarget.style.color = '#00A3E1'
                    }
                  }}
                  title={emails.length <= 1 ? 'At least one email required' : 'Remove email'}
                >
                  <X className="h-2.5 w-2.5" />
                </button>

                {/* Error Badge - to the right of cancel button */}
                {errors[index] && (
                  <div className="flex-shrink-0 flex items-center" style={{ marginLeft: '12px', height: '19px' }}>
                    <AlertTriangle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errors[index] && (
                <p className="mt-1 text-sm ml-1" style={{ color: '#dc2626', fontWeight: '600' }}>{errors[index]}</p>
              )}

              {/* Success Message */}
              {!errors[index] && !checking[index] && availability[index] === true && (
                <p className="mt-1 text-sm text-green-600 ml-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Available
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-[#6b7a85]">
          Add all email addresses that will send orders for this customer.
          You can add more later if needed.
        </p>
      </div>

      {/* Examples */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#333F48] text-sm" style={{ marginBottom: '4px' }}>Examples:</h3>
        <ul className="text-sm text-[#6b7a85] space-y-1" style={{ paddingLeft: '20px', marginTop: 0 }}>
          <li><code className="bg-white px-2 py-0.5 rounded">orders@acmecorp.com</code></li>
          <li><code className="bg-white px-2 py-0.5 rounded">purchasing@acmecorp.com</code></li>
          <li><code className="bg-white px-2 py-0.5 rounded">john.smith@acmecorp.com</code></li>
        </ul>
      </div>

      <div className="flex justify-end">
        <button
          onClick={validateAndContinue}
          disabled={isLoading || emails.every(e => !e.trim())}
          className="py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{
            border: '1px solid #00A3E1',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#00A3E1',
            paddingLeft: '16px',
            paddingRight: '16px',
            marginTop: '3pt'
          }}
          onMouseEnter={(e) => {
            if (!isLoading && !emails.every(e => !e.trim())) {
              e.currentTarget.style.backgroundColor = '#00A3E1'
              e.currentTarget.style.color = 'white'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#00A3E1'
          }}
        >
          {isLoading ? 'Saving...' : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
