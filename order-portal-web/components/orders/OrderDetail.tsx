'use client'

import { lazy, Suspense } from 'react'
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

  return (
    <>
      {/* Custom styles for side-by-side layout */}
      <style jsx global>{`
        @media (min-width: 1024px) {
          .order-detail-container {
            display: flex;
            flex-direction: row;
            gap: 1.5rem;
          }
          .order-detail-left {
            flex: 1;
            min-width: 0;
          }
          .order-detail-right {
            width: 640px;
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
        <div className="order-detail-left space-y-6">
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

        {/* Right Panel: PDF Viewer */}
        <div className="order-detail-right">
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
              <PDFViewer pdfUrl={order.pdf_file_url} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
