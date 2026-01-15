'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/types/database'
import { Search } from 'lucide-react'

type CustomerProductPricing = Tables<'customer_product_pricing'>

interface ProductLookupModalProps {
  orderId: string
  psCustomerId: string
  currencyCode: string
  lineNumber?: number
  onSelect: (product: {
    product_id: string
    uom: string
    dfi_price: number
    description: string
  }) => void
  onClose: () => void
}

export function ProductLookupModal({
  psCustomerId,
  currencyCode,
  lineNumber,
  onSelect,
  onClose,
}: ProductLookupModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [products, setProducts] = useState<CustomerProductPricing[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch products when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setProducts([])
      return
    }

    const fetchProducts = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error: queryError } = await supabase
          .from('customer_product_pricing')
          .select('*')
          .eq('ps_customer_id', psCustomerId)
          .eq('currency_code', currencyCode)
          .or(`product_id.ilike.%${debouncedQuery}%,description.ilike.%${debouncedQuery}%`)
          .order('product_id')
          .limit(100)

        if (queryError) throw queryError

        if (!data || data.length === 0) {
          setError('No products found matching your search')
          setProducts([])
        } else {
          // Deduplicate based on ps_customer_id, product_id, uom, currency_code
          const uniqueProducts = data.reduce((acc, product) => {
            const key = `${product.ps_customer_id}-${product.product_id}-${product.uom}-${product.currency_code}`
            if (!acc.has(key)) {
              acc.set(key, product)
            }
            return acc
          }, new Map<string, CustomerProductPricing>())

          setProducts(Array.from(uniqueProducts.values()))
        }
      } catch (err: any) {
        setError('Error searching products: ' + err.message)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [debouncedQuery, psCustomerId, currencyCode, supabase])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleProductSelect = (product: CustomerProductPricing) => {
    onSelect({
      product_id: product.product_id,
      uom: product.uom || 'EA',
      dfi_price: product.dfi_price || 0,
      description: product.description || '',
    })
    onClose()
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-4xl rounded-lg shadow-lg" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: 'white', border: '1px solid #00A3E1' }}>
        {/* Header */}
        <div className="border-b border-gray-300" style={{ backgroundColor: 'white', paddingTop: '8px', paddingBottom: '12px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div className="mb-3">
            <h2 className="font-semibold" style={{ color: '#666', fontSize: '11px' }}>
              {lineNumber ? `Line ${lineNumber} - Product Lookup` : 'Product Lookup'}
            </h2>
          </div>
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Prod. ID or Desc."
              className="w-full px-4 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'white', color: '#000' }}
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'white' }}>
          {!searchQuery || searchQuery.length < 2 ? (
            <div className="text-center py-12" style={{ color: '#666', fontSize: '13px', paddingLeft: '24px', paddingRight: '24px' }}>
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p style={{ marginTop: '16px', marginBottom: '16px' }}>Start typing to search for products...</p>
              <p className="mt-2" style={{ fontSize: '11px' }}>Enter at least 2 characters</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12" style={{ color: '#666' }}>
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 mb-4" style={{ borderColor: '#000' }}></div>
              <p>Searching products...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="rounded-md bg-red-50 border border-red-200 p-4 inline-block">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          ) : products.length > 0 ? (
            <div className="overflow-x-auto" style={{ padding: '0 24px' }}>
              <table className="w-full" style={{ fontSize: '12px' }}>
                <thead className="border-b border-gray-300">
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th className="text-left py-2 px-3 font-medium" style={{ color: '#666' }}>
                      Product<br />ID
                    </th>
                    <th className="text-left py-2 px-3 font-medium" style={{ color: '#666' }}>Description</th>
                    <th className="text-left py-2 px-3 font-medium" style={{ color: '#666' }}>UOM</th>
                    <th className="text-right py-2 px-3 font-medium" style={{ color: '#666' }}>
                      Customer<br />Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr
                      key={`${product.product_id}-${product.uom}-${index}`}
                      onClick={() => handleProductSelect(product)}
                      className="border-b border-gray-200 cursor-pointer transition-colors"
                      style={{ backgroundColor: 'white' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <td className="py-2 px-3 font-medium" style={{ color: '#000' }}>{product.product_id}</td>
                      <td className="py-2 px-3" style={{ color: '#000' }}>{product.description || 'N/A'}</td>
                      <td className="py-2 px-3" style={{ color: '#000' }}>{product.uom || 'N/A'}</td>
                      <td className="py-2 px-3 text-right font-medium" style={{ color: '#000' }}>{formatPrice(product.dfi_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length === 100 && (
                <p className="text-xs text-center mt-4" style={{ color: '#666' }}>
                  Showing first 100 results. Refine your search for more specific results.
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 flex justify-center" style={{ backgroundColor: 'white', paddingTop: '8px', paddingBottom: '8px' }}>
          <button
            onClick={onClose}
            className="font-medium transition-colors"
            style={{
              border: '1px solid #00A3E1',
              borderRadius: '20px',
              backgroundColor: 'white',
              color: '#00A3E1',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingTop: '6px',
              paddingBottom: '6px',
              fontSize: '9px',
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
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
