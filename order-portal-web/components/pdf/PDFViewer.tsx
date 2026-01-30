'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileWarning, Loader2, FileText, Target } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import type { PDFDocumentProxy, PageViewport } from 'pdfjs-dist'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { usePDFHighlight } from '@/lib/contexts/PDFHighlightContext'
import PDFHighlightOverlay from './PDFHighlightOverlay'
import MagnifyingLens from './MagnifyingLens'

// Set up PDF.js worker using unpkg (more reliable than cdnjs for newer versions)
// Note: Using .mjs extension for modern ES modules
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export function PDFViewer({
  pdfUrl,
}: {
  pdfUrl: string | null;
}) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [pdfData, setPdfData] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [viewport, setViewport] = useState<PageViewport | null>(null)
  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const { isEnabled, mousePosition, setMousePosition, highlightMatches, setEnabled } = usePDFHighlight()

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

  const onDocumentLoadSuccess = useCallback((pdf: PDFDocumentProxy) => {
    setNumPages(pdf.numPages)
    setPageNumber(1) // Reset to first page when document loads
    setPdfDocument(pdf)
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF document load error:', error)
    setError('Failed to render PDF document')
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="rounded-md shadow-sm border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-[#D9D9D6] px-4 py-3">
          <span className="flex items-center uppercase tracking-widest text-[#333F48]" style={{ fontSize: '12px', fontWeight: 700 }}>
            <FileText className="h-4 w-4 text-[#00A3E1]" style={{ marginRight: '10px' }} />
            ORDER PDF
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
      <div className="rounded-md shadow-sm border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-[#D9D9D6] px-4 py-3">
          <span className="flex items-center uppercase tracking-widest text-[#333F48]" style={{ fontSize: '12px', fontWeight: 700 }}>
            <FileText className="h-4 w-4 text-[#00A3E1]" style={{ marginRight: '10px' }} />
            ORDER PDF
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
    <div className="rounded-md shadow-sm border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D9D9D6] px-4 py-3">
        <span className="flex items-center uppercase tracking-widest text-[#333F48]" style={{ fontSize: '12px', fontWeight: 700 }}>
          <FileText className="h-4 w-4 text-[#00A3E1]" style={{ marginRight: '10px' }} />
          ORDER PDF
        </span>

        {/* PDF Highlight Toggle - Centered */}
        <button
          onClick={() => setEnabled(!isEnabled)}
          className="font-medium transition-colors"
          style={{
            border: '1px solid #00A3E1',
            borderRadius: '20px',
            backgroundColor: isEnabled ? '#00A3E1' : 'white',
            color: isEnabled ? 'white' : '#00A3E1',
            paddingTop: '5px',
            paddingBottom: '5px',
            paddingLeft: '14px',
            paddingRight: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '10px'
          }}
          onMouseEnter={(e) => {
            if (!isEnabled) {
              e.currentTarget.style.backgroundColor = '#00A3E1'
              e.currentTarget.style.color = 'white'
            }
          }}
          onMouseLeave={(e) => {
            if (!isEnabled) {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.color = '#00A3E1'
            }
          }}
          title={isEnabled ? 'Disable PDF highlighting' : 'Enable PDF highlighting'}
        >
          <Target style={{ width: '12px', height: '12px' }} />
          <span>Highlight {isEnabled ? 'ON' : 'OFF'}</span>
        </button>

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
              onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
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
              onClick={() => setScale((s) => Math.min(2, s + 0.1))}
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
            <div
              style={{ position: 'relative', display: 'inline-block' }}
              onMouseMove={(e) => {
                if (!isEnabled) return
                const rect = e.currentTarget.getBoundingClientRect()
                setMousePosition({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  pageX: e.pageX,
                  pageY: e.pageY
                })
              }}
              onMouseLeave={() => {
                setMousePosition(null)
              }}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
                onLoadSuccess={(page) => {
                  setViewport(page.getViewport({ scale }))
                  // Capture the canvas reference for magnifying lens
                  const canvas = document.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement
                  if (canvas) {
                    pageCanvasRef.current = canvas
                  }
                }}
                canvasRef={(canvas) => {
                  if (canvas) {
                    pageCanvasRef.current = canvas
                  }
                }}
              />
              {pdfUrl && (
                <PDFHighlightOverlay
                  pageNumber={pageNumber}
                  scale={scale}
                  viewport={viewport}
                  pdfDocument={pdfDocument}
                  pdfUrl={pdfUrl}
                />
              )}
            </div>
          </Document>
        </div>
      </div>

      {/* Magnifying Lens */}
      <MagnifyingLens
        mousePosition={mousePosition}
        highlightBox={highlightMatches.length > 0 ? highlightMatches[0] : null}
        scale={scale}
        sourceCanvas={pageCanvasRef.current}
        isEnabled={isEnabled && highlightMatches.length > 0}
      />
    </div>
  )
}
