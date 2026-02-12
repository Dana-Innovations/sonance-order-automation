'use client'

import Link from 'next/link'

export function WizardLandingButtons() {
  return (
    <div className="flex flex-col items-center mb-6" style={{ gap: '16px' }}>
      <Link href="/settings/wizard/new" className="no-underline">
        <button
          className="py-1.5 text-xs font-medium transition-colors"
          style={{
            border: '1px solid #00A3E1',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#00A3E1',
            paddingLeft: '16px',
            paddingRight: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#00A3E1'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#00A3E1'
          }}
        >
          Start New Customer Setup
        </button>
      </Link>

      <Link href="/settings/customers/new" className="no-underline">
        <button
          className="py-1.5 text-xs font-medium transition-colors"
          style={{
            border: '1px solid #00A3E1',
            borderRadius: '20px',
            backgroundColor: 'white',
            color: '#00A3E1',
            paddingLeft: '16px',
            paddingRight: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#00A3E1'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.color = '#00A3E1'
          }}
        >
          Use Quick Form Instead
        </button>
      </Link>
    </div>
  )
}
