'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { LogOut } from 'lucide-react'

// Sonance Logo SVG with "The Beam" (cyan A)
function SonanceLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 40"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* S */}
      <path
        d="M8.5 31.5C3.8 31.5 0 28.8 0 24.2h5.2c0 1.8 1.5 3 3.4 3 2.1 0 3.3-1 3.3-2.5 0-1.4-1-2.2-3.5-2.8L6 21.2C2 20.2 0 17.8 0 14.5c0-4.2 3.5-7 8.2-7 4.5 0 7.8 2.8 7.8 7h-5.2c0-1.5-1.2-2.6-2.8-2.6-1.6 0-2.7.9-2.7 2.2 0 1.2.9 2 3.2 2.5l2.3.6c4.3 1 6.5 3.3 6.5 6.8 0 4.5-3.8 7.5-8.8 7.5z"
        fill="currentColor"
      />
      {/* O */}
      <path
        d="M32.5 31.5c-6.2 0-10.5-4.8-10.5-12s4.3-12 10.5-12S43 12.3 43 19.5s-4.3 12-10.5 12zm0-4.8c3.2 0 5.2-2.8 5.2-7.2s-2-7.2-5.2-7.2-5.2 2.8-5.2 7.2 2 7.2 5.2 7.2z"
        fill="currentColor"
      />
      {/* N */}
      <path
        d="M48 31V8h5l8.5 14.5V8H66v23h-5L52.5 16.5V31H48z"
        fill="currentColor"
      />
      {/* A - The Beam (Cyan) */}
      <path
        d="M82 31l-1.8-5.5h-9L69.5 31h-5.3L73.5 8h6l9.3 23h-5.5zm-6.2-18.5L72.5 21h6.5l-3.2-8.5z"
        fill="#00A3E1"
      />
      {/* N */}
      <path
        d="M93 31V8h5l8.5 14.5V8H111v23h-5l-8.5-14.5V31H93z"
        fill="currentColor"
      />
      {/* C */}
      <path
        d="M128.5 31.5c-6.2 0-10.5-4.8-10.5-12s4.3-12 10.5-12c5 0 8.8 3 9.8 8h-5.3c-.8-2-2.5-3.2-4.5-3.2-3.2 0-5.2 2.8-5.2 7.2s2 7.2 5.2 7.2c2 0 3.7-1.2 4.5-3.2h5.3c-1 5-4.8 8-9.8 8z"
        fill="currentColor"
      />
      {/* E */}
      <path
        d="M143 31V8h14.5v4.5H148v5h8.5v4.3H148v4.7h9.5V31H143z"
        fill="currentColor"
      />
    </svg>
  )
}

export function Header({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header 
      className="border-b border-[#2a353d]"
      style={{ backgroundColor: '#333F48' }}
    >
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <SonanceLogo className="h-7 w-auto text-white" />
          <div className="hidden sm:flex items-center">
            <span className="text-[#6b7a85] text-lg font-light">|</span>
            <span className="ml-4 text-sm font-medium uppercase tracking-widest text-white/80">
              Order Portal
            </span>
          </div>
        </div>

        {/* User Info and Sign Out */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-sm text-white/70">
            {user.email}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-medium uppercase tracking-wider text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
