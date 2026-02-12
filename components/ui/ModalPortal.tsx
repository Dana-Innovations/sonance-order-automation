'use client'

import { useEffect, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalPortalProps {
  children: ReactNode
  onClose?: () => void
}

export function ModalPortal({ children, onClose }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Lock body scroll
    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    // Cleanup
    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      setMounted(false)
    }
  }, [])

  useEffect(() => {
    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  if (!mounted) return null

  return createPortal(children, document.body)
}
