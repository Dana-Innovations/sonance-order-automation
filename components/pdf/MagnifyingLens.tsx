'use client';

import React, { useEffect, useRef } from 'react';

interface MagnifyingLensProps {
  mousePosition?: { x: number; y: number; pageX: number; pageY: number } | null; // Optional - not used for positioning
  highlightBox: { x: number; y: number; width: number; height: number } | null;
  scale: number;
  sourceCanvas: HTMLCanvasElement | null;
  isEnabled: boolean;
}

const LENS_RADIUS = 100;
const MAGNIFICATION = 2;

export default function MagnifyingLens({
  mousePosition,
  highlightBox,
  scale,
  sourceCanvas,
  isEnabled
}: MagnifyingLensProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [debugInfo, setDebugInfo] = React.useState<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Debug logging
    console.log('[MagnifyingLens] State:', {
      hasCanvas: !!canvas,
      hasContainer: !!container,
      hasMousePosition: !!mousePosition,
      hasHighlightBox: !!highlightBox,
      hasSourceCanvas: !!sourceCanvas,
      isEnabled
    });

    // Mouse position is not required - we position based on highlight box
    if (!canvas || !container || !highlightBox || !sourceCanvas || !isEnabled) {
      if (container) {
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
      }
      return;
    }

    console.log('[MagnifyingLens] Showing lens at highlight:', highlightBox);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Position lens centered above the highlight box (not following mouse)
    const lensSize = LENS_RADIUS * 2;

    // Calculate position to center lens above the highlight
    // Get the PDF container's position on the page
    const pdfContainer = document.querySelector('.react-pdf__Page') as HTMLElement;
    if (pdfContainer) {
      const containerRect = pdfContainer.getBoundingClientRect();

      // Center the lens horizontally on the highlight
      const highlightCenterX = containerRect.left + highlightBox.x + (highlightBox.width / 2);

      // Position lens above the highlight with some spacing
      const highlightTop = containerRect.top + highlightBox.y;
      const lensTop = highlightTop - lensSize - 20; // 20px spacing above

      container.style.left = `${highlightCenterX - LENS_RADIUS}px`;
      container.style.top = `${Math.max(10, lensTop)}px`; // Don't go above viewport

      console.log('[MagnifyingLens] Positioned at:', {
        left: highlightCenterX - LENS_RADIUS,
        top: Math.max(10, lensTop),
        highlightBox
      });
    } else {
      console.warn('[MagnifyingLens] PDF container not found');
      // Can't position without container
      container.style.opacity = '0';
      return;
    }

    container.style.opacity = '1';
    container.style.pointerEvents = 'none';

    // Set canvas size
    canvas.width = lensSize;
    canvas.height = lensSize;

    // Clear canvas
    ctx.clearRect(0, 0, lensSize, lensSize);

    // Create circular clipping path
    ctx.save();
    ctx.beginPath();
    ctx.arc(LENS_RADIUS, LENS_RADIUS, LENS_RADIUS - 3, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Calculate source region to magnify (centered on highlight)
    // CRITICAL: Canvas has device pixel ratio applied
    // HighlightBox coords are in display space, canvas is in pixel space
    const canvasStyle = window.getComputedStyle(sourceCanvas);
    const displayWidth = parseFloat(canvasStyle.width);
    const pixelRatio = sourceCanvas.width / displayWidth;

    // Convert highlight box from display space to canvas pixel space
    const canvasHighlightX = highlightBox.x * pixelRatio;
    const canvasHighlightY = highlightBox.y * pixelRatio;
    const canvasHighlightWidth = highlightBox.width * pixelRatio;
    const canvasHighlightHeight = highlightBox.height * pixelRatio;

    // Use the highlight box center
    const highlightCenterX = canvasHighlightX + canvasHighlightWidth / 2;
    const highlightCenterY = canvasHighlightY + canvasHighlightHeight / 2;

    // Source region size (what we're zooming in on)
    const sourceWidth = lensSize / MAGNIFICATION;
    const sourceHeight = lensSize / MAGNIFICATION;

    // Source region position
    const sourceX = highlightCenterX - sourceWidth / 2;
    const sourceY = highlightCenterY - sourceHeight / 2;

    const debugMsg = `Magnify Debug:
Canvas: ${sourceCanvas.width}x${sourceCanvas.height} (actual pixels)
Display: ${displayWidth.toFixed(0)}px wide
Pixel Ratio: ${pixelRatio.toFixed(2)}x
HighlightBox (display): (${highlightBox.x.toFixed(1)}, ${highlightBox.y.toFixed(1)})
HighlightBox (canvas): (${canvasHighlightX.toFixed(1)}, ${canvasHighlightY.toFixed(1)})
Center (canvas): (${highlightCenterX.toFixed(1)}, ${highlightCenterY.toFixed(1)})
Source Region:
  X: ${sourceX.toFixed(1)}, Y: ${sourceY.toFixed(1)}
  W: ${sourceWidth.toFixed(1)}, H: ${sourceHeight.toFixed(1)}
Scale: ${scale}
Lens: ${lensSize}px, ${MAGNIFICATION}x magnification`;

    console.log('[MagnifyingLens] Drawing magnified region:', debugMsg);
    setDebugInfo(debugMsg);

    // Draw magnified portion from source canvas
    try {
      console.log('[MagnifyingLens] Drawing from canvas:', {
        canvasSize: `${sourceCanvas.width}x${sourceCanvas.height}`,
        sourceRegion: `(${sourceX}, ${sourceY}) ${sourceWidth}x${sourceHeight}`,
        scale: scale,
        highlightBox: highlightBox
      });

      ctx.drawImage(
        sourceCanvas,
        sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle
        0, 0, lensSize, lensSize // Destination rectangle (magnified)
      );
      console.log('[MagnifyingLens] Successfully drew magnified image');
    } catch (error) {
      console.error('[Magnifying Lens] Draw error:', error);
      setDebugInfo(debugMsg + '\nERROR: ' + error);
    }

    ctx.restore();

    // Draw the highlight overlay in the magnified view
    // Calculate where the highlight appears within the magnified region
    const highlightRelativeX = (canvasHighlightX - sourceX) * MAGNIFICATION;
    const highlightRelativeY = (canvasHighlightY - sourceY) * MAGNIFICATION;
    const highlightMagnifiedWidth = canvasHighlightWidth * MAGNIFICATION;
    const highlightMagnifiedHeight = canvasHighlightHeight * MAGNIFICATION;

    // Create circular clipping path again for the highlight
    ctx.save();
    ctx.beginPath();
    ctx.arc(LENS_RADIUS, LENS_RADIUS, LENS_RADIUS - 3, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw yellow semi-transparent highlight
    ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
    ctx.fillRect(highlightRelativeX, highlightRelativeY, highlightMagnifiedWidth, highlightMagnifiedHeight);

    // Draw orange border around highlight
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    ctx.strokeRect(highlightRelativeX, highlightRelativeY, highlightMagnifiedWidth, highlightMagnifiedHeight);

    ctx.restore();

    // Draw border circle
    ctx.strokeStyle = '#00A3E1'; // Sonance blue
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(LENS_RADIUS, LENS_RADIUS, LENS_RADIUS - 2, 0, Math.PI * 2);
    ctx.stroke();
  }, [highlightBox, scale, sourceCanvas, isEnabled]); // mousePosition removed - not needed

  if (!isEnabled) return null;

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          width: `${LENS_RADIUS * 2}px`,
          height: `${LENS_RADIUS * 2}px`,
          borderRadius: '50%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 100ms ease-out',
          backgroundColor: 'white'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%'
          }}
        />
      </div>

      {/* Debug info - disabled */}
      {false && debugInfo && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          backgroundColor: '#1e293b',
          color: '#fbbf24',
          padding: '8px 12px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '10px',
          zIndex: 9999,
          border: '1px solid #fbbf24',
          maxWidth: '350px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap'
        }}>
          {debugInfo}
        </div>
      )}
    </>
  );
}
