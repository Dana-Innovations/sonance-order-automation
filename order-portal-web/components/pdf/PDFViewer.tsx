'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileWarning, Loader2 } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

// Set up PDF.js worker using unpkg (more reliable than cdnjs for newer versions)
// Note: Using .mjs extension for modern ES modules
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export function PDFViewer({ pdfUrl }: { pdfUrl: string | null }) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [pdfData, setPdfData] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    let blobUrl: string | null = null

    const fetchPDF = async () => {
      if (!pdfUrl) {
        if (isMounted) {
          setError('No PDF URL provided')
          setLoading(false)
        }
        return
      }

      try {
        if (isMounted) {
          setLoading(true)
          setError(null)
        }

        // Fetch from SharePoint via API route with the full URL
        const encodedUrl = encodeURIComponent(pdfUrl)
        const response = await fetch(`/api/sharepoint/pdf?url=${encodedUrl}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to fetch PDF (${response.status})`)
        }

        const blob = await response.blob()
        blobUrl = URL.createObjectURL(blob)
        
        if (isMounted) {
          setPdfData(blobUrl)
        }
      } catch (err: any) {
        console.error('PDF fetch error:', err)
        if (isMounted) {
          setError(err.message || 'Failed to load PDF')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchPDF()

    // Cleanup blob URL on unmount
    return () => {
      isMounted = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [pdfUrl])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(1) // Reset to first page when document loads
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF document load error:', error)
    setError('Failed to render PDF document')
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="rounded-sm border border-[#D9D9D6] bg-white">
        <div className="flex items-center justify-between border-b border-[#D9D9D6] px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-widest text-[#333F48]">
            Order PDF
          </span>
        </div>
        <div className="flex flex-col items-center justify-center h-96 gap-3">
          <Loader2 className="h-8 w-8 text-[#00A3E1] animate-spin" />
          <p className="text-sm text-[#6b7a85]">Loading PDF...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !pdfData) {
    return (
      <div className="rounded-sm border border-[#D9D9D6] bg-white">
        <div className="flex items-center justify-between border-b border-[#D9D9D6] px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-widest text-[#333F48]">
            Order PDF
          </span>
        </div>
        <div className="flex flex-col items-center justify-center h-96 gap-3">
          <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
            <FileWarning className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-sm text-red-600 text-center px-4">
            {error || 'PDF not available'}
          </p>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#00A3E1] hover:underline"
            >
              Try opening in SharePoint
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-sm border border-[#D9D9D6] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D9D9D6] px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-widest text-[#333F48]">
          Order PDF
        </span>
        <div className="flex items-center gap-4">
          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="h-7 w-7 rounded-sm border border-[#D9D9D6] bg-white flex items-center justify-center text-[#333F48] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-[#6b7a85] min-w-[60px] text-center">
              {pageNumber} / {numPages || '?'}
            </span>
            <button
              onClick={() => setPageNumber((p) => Math.min(numPages || 1, p + 1))}
              disabled={pageNumber >= (numPages || 1)}
              className="h-7 w-7 rounded-sm border border-[#D9D9D6] bg-white flex items-center justify-center text-[#333F48] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2 border-l border-[#D9D9D6] pl-4">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
              disabled={scale <= 0.5}
              className="h-7 w-7 rounded-sm border border-[#D9D9D6] bg-white flex items-center justify-center text-[#333F48] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs text-[#6b7a85] min-w-[40px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2, s + 0.25))}
              disabled={scale >= 2}
              className="h-7 w-7 rounded-sm border border-[#D9D9D6] bg-white flex items-center justify-center text-[#333F48] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div className="overflow-auto bg-[#F5F5F5]" style={{ maxHeight: 'calc(100vh - 100px)', minHeight: '700px' }}>
        <div className="p-4 flex justify-center">
          <Document
            file={pdfData}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center h-96 gap-3">
                <Loader2 className="h-8 w-8 text-[#00A3E1] animate-spin" />
                <p className="text-sm text-[#6b7a85]">Rendering PDF...</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-96 gap-3">
                <FileWarning className="h-8 w-8 text-red-500" />
                <p className="text-sm text-red-600">Failed to render PDF</p>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
            />
          </Document>
        </div>
      </div>
    </div>
  )
}
