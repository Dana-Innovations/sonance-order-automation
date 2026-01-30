'use client';

import React, { useEffect, useRef } from 'react';

interface MagnifyingLensProps {
  mousePosition: { x: number; y: number; pageX: number; pageY: number } | null;
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container || !mousePosition || !highlightBox || !sourceCanvas || !isEnabled) {
      if (container) {
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Position lens centered on mouse
    const lensSize = LENS_RADIUS * 2;
    container.style.left = `${mousePosition.pageX - LENS_RADIUS}px`;
    container.style.top = `${mousePosition.pageY - LENS_RADIUS}px`;
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
    const highlightCenterX = highlightBox.x + highlightBox.width / 2;
    const highlightCenterY = highlightBox.y + highlightBox.height / 2;

    // Source region size (what we're zooming in on)
    const sourceWidth = lensSize / MAGNIFICATION;
    const sourceHeight = lensSize / MAGNIFICATION;

    // Source region position
    const sourceX = highlightCenterX - sourceWidth / 2;
    const sourceY = highlightCenterY - sourceHeight / 2;

    // Draw magnified portion from source canvas
    try {
      ctx.drawImage(
        sourceCanvas,
        sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle
        0, 0, lensSize, lensSize // Destination rectangle (magnified)
      );
    } catch (error) {
      console.error('[Magnifying Lens] Draw error:', error);
    }

    ctx.restore();

    // Draw border circle
    ctx.strokeStyle = '#00A3E1'; // Sonance blue
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(LENS_RADIUS, LENS_RADIUS, LENS_RADIUS - 2, 0, Math.PI * 2);
    ctx.stroke();
  }, [mousePosition, highlightBox, scale, sourceCanvas, isEnabled]);

  if (!isEnabled) return null;

  return (
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
  );
}
