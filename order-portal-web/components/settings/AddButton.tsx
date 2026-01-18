'use client'

import Link from 'next/link'
import { useState, ReactNode } from 'react'

interface AddButtonProps {
  href: string
  children: ReactNode
}

export function AddButton({ href, children }: AddButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 py-1.5 text-xs font-medium transition-colors no-underline"
      style={{
        border: '1px solid #00A3E1',
        borderRadius: '20px',
        backgroundColor: isHovered ? '#00A3E1' : 'white',
        color: isHovered ? 'white' : '#00A3E1',
        paddingLeft: '16px',
        paddingRight: '16px',
        textDecoration: 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </Link>
  )
}
