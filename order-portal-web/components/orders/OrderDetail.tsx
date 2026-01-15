'use client'

import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { OrderHeader } from './OrderHeader'
import { OrderLinesTable } from './OrderLinesTable'
import { OrderActions } from './OrderActions'
import { OrderNavigation } from './OrderNavigation'
import { Tables } from '@/lib/types/database'
import { Loader2, Zap, FileText } from 'lucide-react'

// Lazy load PDF viewer for better performance
const PDFViewer = lazy(() =>
  import('@/components/pdf/PDFViewer').then((mod) => ({ default: mod.PDFViewer }))
)

type Order = Tables<'orders'> & {
  customers: Tables<'customers'>
  order_statuses: Tables<'order_statuses'>
  order_lines: Tables<'order_lines'>[]
}

export function OrderDetail({
  order,
  userId,
}: {
  order: Order
  userId: string
}) {
  const isCancelled = order.status_code === '06'

  // State for resizable PDF panel
  const [pdfPanelWidth, setPdfPanelWidth] = useState(640) // Default width
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(640)

  // Calculate PDF zoom scale proportionally to panel width
  // Width range: 400-1000px, Scale range: 0.5-2.0
  const pdfScale = 0.5 + ((pdfPanelWidth - 400) / (1000 - 400)) * (2.0 - 0.5)

  // Handle scale changes from PDF zoom buttons
  const handleScaleChange = (scaleDelta: number) => {
    // Convert scale delta to width delta
    // Scale range: 1.5 (2.0 - 0.5), Width range: 600 (1000 - 400)
    const widthDelta = (scaleDelta / 1.5) * 600
    const newWidth = Math.max(400, Math.min(1000, pdfPanelWidth + widthDelta))
    setPdfPanelWidth(newWidth)
    savePdfPanelWidth(newWidth)
  }

  // Load saved width from localStorage on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('orderDetailPdfPanelWidth')
    if (savedWidth) {
      const width = parseInt(savedWidth, 10)
      if (width >= 400 && width <= 1000) {
        setPdfPanelWidth(width)
      }
    }
  }, [])

  // Save width to localStorage when it changes (after drag)
  const savePdfPanelWidth = (width: number) => {
    localStorage.setItem('orderDetailPdfPanelWidth', width.toString())
  }

  // Mouse event handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartWidth.current = pdfPanelWidth

    // Prevent text selection during drag
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    // Calculate the change in X position (negative = dragging left, positive = dragging right)
    const deltaX = e.clientX - dragStartX.current

    // Calculate new width (dragging left reduces width, dragging right increases width)
    const newWidth = dragStartWidth.current - deltaX

    // Clamp between min (400px) and max (1000px)
    const clampedWidth = Math.max(400, Math.min(1000, newWidth))

    setPdfPanelWidth(clampedWidth)
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      savePdfPanelWidth(pdfPanelWidth)
    }
  }

  // Add/remove global mouse event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      // Prevent text selection during drag
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    }
  }, [isDragging, pdfPanelWidth])

  return (
    <>
      {/* Custom styles for side-by-side layout */}
      <style jsx global>{`
        @media (min-width: 1024px) {
          .order-detail-container {
            display: flex;
            flex-direction: row;
            gap: 0;
          }
          .order-detail-left {
            flex: 1;
            min-width: 0;
          }
          .order-detail-right {
            flex-shrink: 0;
          }
          .order-detail-right-inner {
            position: sticky;
            top: 1.5rem;
            max-height: calc(100vh - 80px);
          }
        }
        @media (max-width: 1023px) {
          .order-detail-container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }
          .order-detail-left,
          .order-detail-right {
            width: 100%;
          }
        }
      `}</style>

      <div className="order-detail-container" style={{ paddingTop: '5px' }}>
        {/* Left Panel: Order Content */}
        <div className="order-detail-left space-y-6" style={{ paddingRight: '12px' }}>
          <OrderHeader order={order} userId={userId} />
          <OrderLinesTable order={order} userId={userId} />
          
          {/* Footer Panel: Action Buttons */}
          <div className="rounded-md shadow-sm border border-gray-200 bg-white" style={{ padding: '8px 0 12px 0' }}>
            <div className="flex items-start justify-between">
              <span className="flex items-center uppercase tracking-widest text-[#333F48]" style={{ fontSize: '12px', fontWeight: 700 }}>
                <Zap className="h-4 w-4 text-[#00A3E1]" style={{ marginRight: '10px' }} />
                ACTIONS
              </span>
              <div className="flex-1 flex justify-center">
                <OrderActions order={order} userId={userId} />
              </div>
            </div>
          </div>

          {/* Order Navigation */}
          <OrderNavigation currentOrderId={order.id} />
        </div>

        {/* Draggable separator (desktop only) */}
        <div
          onMouseDown={handleMouseDown}
          className="resize-separator"
          style={{
            width: '3px',
            backgroundColor: '#9ca3af',
            cursor: 'col-resize',
            flexShrink: 0,
            position: 'relative',
            alignSelf: 'stretch',
            minHeight: '100%',
            display: 'block',
            transition: isDragging ? 'none' : 'background-color 0.2s, width 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.backgroundColor = '#00A3E1'
              e.currentTarget.style.width = '4px'
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.backgroundColor = '#9ca3af'
              e.currentTarget.style.width = '3px'
            }
          }}
        >
          {/* Invisible wider hit area for easier grabbing */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-4px',
            right: '-4px',
            bottom: 0,
            cursor: 'col-resize',
          }} />
        </div>

        {/* Right Panel: PDF Viewer */}
        <div className="order-detail-right" style={{ width: `${pdfPanelWidth}px`, paddingLeft: '12px' }}>
          <div className="order-detail-right-inner">
            <Suspense
              fallback={
                <div className="rounded-md shadow-sm border border-gray-200 bg-white">
                  <div className="flex items-center justify-between border-b border-[#D9D9D6] px-4 py-3">
                    <span className="flex items-center uppercase tracking-widest text-[#333F48]" style={{ fontSize: '12px', fontWeight: 700 }}>
                      <FileText className="h-4 w-4 text-[#00A3E1]" style={{ marginRight: '10px' }} />
                      ORDER PDF
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center h-96 gap-3">
                    <Loader2 className="h-8 w-8 text-[#00A3E1] animate-spin" />
                    <p className="text-sm text-[#6b7a85]">Loading PDF viewer...</p>
                  </div>
                </div>
              }
            >
              <PDFViewer
                pdfUrl={order.pdf_file_url}
                externalScale={pdfScale}
                onScaleChange={handleScaleChange}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
