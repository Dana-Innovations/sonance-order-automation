'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PDFDocumentProxy, PDFPageProxy, PageViewport } from 'pdfjs-dist';
import { usePDFHighlight } from '@/lib/contexts/PDFHighlightContext';
import { extractPageTextData } from '@/lib/utils/pdfTextExtraction';

interface PDFHighlightOverlayProps {
  pageNumber: number;
  scale: number;
  viewport: PageViewport | null;
  pdfDocument: PDFDocumentProxy | null;
  pdfUrl: string;
}

export default function PDFHighlightOverlay({
  pageNumber,
  scale,
  viewport,
  pdfDocument,
  pdfUrl
}: PDFHighlightOverlayProps) {
  const {
    isEnabled,
    activeHighlight,
    findTextMatches,
    setPDFTextData,
    debugMessage
  } = usePDFHighlight();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [matches, setMatches] = useState<Array<{ x: number; y: number; width: number; height: number }>>([]);

  // Extract text data when page loads
  useEffect(() => {
    if (!pdfDocument || !isEnabled || isExtracting) return;

    const extractText = async () => {
      setIsExtracting(true);
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const textData = await extractPageTextData(page);
        setPDFTextData(pdfUrl, pageNumber, textData);

        console.log(`[PDF] Extracted ${textData.items.length} items, ${textData.lineRowMap?.size || 0} lines`);
      } catch (error) {
        console.error('[PDF Highlight] Text extraction error:', error);
      } finally {
        setIsExtracting(false);
      }
    };

    extractText();
  }, [pdfDocument, pageNumber, pdfUrl, isEnabled, setPDFTextData, isExtracting]);

  // Find and highlight matches when activeHighlight changes
  useEffect(() => {
    if (!isEnabled || !activeHighlight || !viewport) {
      setMatches([]);
      return;
    }

    const foundMatches = findTextMatches(activeHighlight, pdfUrl, pageNumber);

    // Scale coordinates to current viewport and expand boxes in all directions
    const scaledMatches = foundMatches.map(match => ({
      x: (match.x * scale) - 3, // Expand left by 3pt
      y: (match.y * scale) - 5, // Expand up by 5pt (includes alignment adjustment)
      width: (match.width * scale || 50) + 6, // Expand width by 6pt (3 on each side)
      height: (match.height * scale) + 10 // Expand height by 10pt (5 on each side)
    }));

    setMatches(scaledMatches);
  }, [isEnabled, activeHighlight, viewport, scale, findTextMatches, pdfUrl, pageNumber]);

  // Draw highlights on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !viewport) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match viewport
    canvas.width = viewport.width * scale;
    canvas.height = viewport.height * scale;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isEnabled || matches.length === 0) return;

    // Draw highlight rectangles
    matches.forEach(match => {
      // Yellow semi-transparent fill
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.fillRect(match.x, match.y, match.width, match.height);

      // Orange border
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 2;
      ctx.strokeRect(match.x, match.y, match.width, match.height);
    });
  }, [matches, viewport, scale, isEnabled]);

  if (!isEnabled || !viewport) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 10,
          transition: 'opacity 200ms ease-in-out',
          opacity: matches.length > 0 ? 1 : 0
        }}
      />
      {debugMessage && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(255, 193, 7, 0.98)',
            color: '#333',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 500,
            fontFamily: 'monospace',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 100,
            pointerEvents: 'auto',
            maxWidth: '500px',
            maxHeight: '300px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5'
          }}
        >
          <strong style={{ display: 'block', marginBottom: '8px' }}>⚠️ DEBUG INFO</strong>
          {debugMessage}
        </div>
      )}
    </>
  );
}
