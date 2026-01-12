'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function OrderNavigation({ currentOrderId }: { currentOrderId: string }) {
  const router = useRouter()
  const [orderIds, setOrderIds] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  useEffect(() => {
    // Read filtered order IDs from sessionStorage
    const storedOrderIds = sessionStorage.getItem('filteredOrderIds')
    if (storedOrderIds) {
      try {
        const ids = JSON.parse(storedOrderIds) as string[]
        setOrderIds(ids)
        const index = ids.indexOf(currentOrderId)
        setCurrentIndex(index)
      } catch (error) {
        console.error('Failed to parse filtered order IDs:', error)
      }
    }
  }, [currentOrderId])

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevOrderId = orderIds[currentIndex - 1]
      router.push(`/orders/${prevOrderId}`)
    }
  }

  const handleNext = () => {
    if (currentIndex < orderIds.length - 1) {
      const nextOrderId = orderIds[currentIndex + 1]
      router.push(`/orders/${nextOrderId}`)
    }
  }

  // Don't render if we don't have order list context
  if (orderIds.length === 0 || currentIndex === -1) {
    return null
  }

  const position = currentIndex + 1 // 1-based for display
  const total = orderIds.length

  return (
    <div className="rounded-md shadow-sm border border-gray-200 bg-white" style={{ padding: '8px 24px 12px 24px' }}>
      <div className="flex items-center justify-center" style={{ gap: '24px' }}>
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderRadius: '20px',
            border: '1px solid #00A3E1',
            backgroundColor: 'white',
            color: '#00A3E1'
          }}
          onMouseEnter={(e) => {
            if (currentIndex > 0) {
              e.currentTarget.style.backgroundColor = '#00A3E1'
              e.currentTarget.style.color = 'white'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#00A3E1'
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        <span className="text-xs font-medium tracking-wider text-[#6b7a85]">
          {position} of {total}
        </span>

        <button
          onClick={handleNext}
          disabled={currentIndex === orderIds.length - 1}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderRadius: '20px',
            border: '1px solid #00A3E1',
            backgroundColor: 'white',
            color: '#00A3E1'
          }}
          onMouseEnter={(e) => {
            if (currentIndex < orderIds.length - 1) {
              e.currentTarget.style.backgroundColor = '#00A3E1'
              e.currentTarget.style.color = 'white'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#00A3E1'
          }}
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
