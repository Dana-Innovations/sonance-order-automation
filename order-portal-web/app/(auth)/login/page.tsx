'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/orders')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .login-animate-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .login-slide-in {
          animation: slideIn 0.6s ease-out 0.2s forwards;
          opacity: 0;
        }
      `}</style>
      
      <div className="login-container">
        {/* Left Panel - Branding (hidden on mobile via media query in style) */}
        <div 
          className="login-branding-panel"
          style={{
            backgroundColor: '#333F48',
            position: 'relative',
            overflow: 'hidden',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px',
          }}
        >
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #333F48 0%, #3d4a54 50%, #2a3540 100%)',
          }} />
          
          {/* Subtle pattern */}
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
          
          {/* The Beam accent line */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '2px',
            height: '100%',
            background: 'linear-gradient(to bottom, #00A3E1, rgba(0,163,225,0.3), transparent)',
          }} />
          
          {/* Glow effect */}
          <div style={{
            position: 'absolute',
            bottom: '-200px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(0,163,225,0.08)',
            filter: 'blur(100px)',
          }} />
          
          {/* Content */}
          <div style={{ position: 'relative', zIndex: 10 }} className="login-animate-in">
            <img 
              src="/logos/Sonance_Logo_2C_Light_RGB.png" 
              alt="Sonance" 
              style={{ height: '40px', width: 'auto' }} 
            />
          </div>
          
          <div style={{ position: 'relative', zIndex: 10 }} className="login-slide-in">
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 300,
              color: 'white',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              marginBottom: '24px',
            }}>
              The Order Genie
            </h1>
            <p style={{
              fontSize: '1.125rem',
              fontWeight: 300,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6,
              maxWidth: '400px',
            }}>
              Streamline your order management with agentic AI automation and seamless ERP integration.
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '24px', 
              marginTop: '32px',
            }}>
                {['Review', 'Edit', 'Upload'].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: '#00A3E1' 
                  }} />
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: 'rgba(255,255,255,0.5)', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ position: 'relative', zIndex: 10 }}>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)' }}>
              © {new Date().getFullYear()} Sonance. All rights reserved.
            </p>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          backgroundColor: 'white',
        }}>
          <div style={{ width: '100%', maxWidth: '400px' }} className="login-animate-in">
            {/* Mobile Logo */}
            <div className="login-mobile-logo" style={{ marginBottom: '48px', textAlign: 'center' }}>
              <img 
                src="/logos/Sonance_Logo_2C_Light_RGB.png" 
                alt="Sonance" 
                style={{ height: '36px', width: 'auto', display: 'inline-block' }} 
              />
            </div>

            {/* Header */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{
                fontSize: '1.875rem',
                fontWeight: 300,
                color: '#333F48',
                letterSpacing: '-0.02em',
                marginBottom: '8px',
              }}>
                Welcome back
              </h2>
              <p style={{ color: '#6b7780', fontSize: '1rem', fontWeight: 300 }}>
                Sign in to continue to your dashboard
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin}>
              {/* Error Message */}
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: '#FEF2F2',
                  borderLeft: '3px solid #EF4444',
                  marginBottom: '24px',
                }}>
                  <svg style={{ width: '20px', height: '20px', color: '#EF4444', flexShrink: 0, marginTop: '2px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p style={{ fontSize: '0.875rem', color: '#B91C1C' }}>{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div style={{ marginBottom: '24px' }}>
                <label 
                  htmlFor="email" 
                  style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: focused === 'email' ? '#00A3E1' : 'rgba(51,63,72,0.7)',
                    marginBottom: '8px',
                    transition: 'color 0.2s',
                  }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@company.com"
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 16px',
                    fontSize: '1rem',
                    backgroundColor: focused === 'email' ? 'white' : '#F8F9FA',
                    border: 'none',
                    borderBottom: `2px solid ${focused === 'email' ? '#00A3E1' : '#D9D9D6'}`,
                    color: '#333F48',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                />
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: '32px' }}>
                <label 
                  htmlFor="password" 
                  style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: focused === 'password' ? '#00A3E1' : 'rgba(51,63,72,0.7)',
                    marginBottom: '8px',
                    transition: 'color 0.2s',
                  }}
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 16px',
                    fontSize: '1rem',
                    backgroundColor: focused === 'password' ? 'white' : '#F8F9FA',
                    border: 'none',
                    borderBottom: `2px solid ${focused === 'password' ? '#00A3E1' : '#D9D9D6'}`,
                    color: '#333F48',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '56px',
                  backgroundColor: loading ? '#4a5661' : '#333F48',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#00A3E1'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#333F48'
                  }
                }}
              >
                {loading ? (
                  <>
                    <svg style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Mobile Footer */}
            <p className="login-mobile-footer" style={{ 
              marginTop: '48px', 
              textAlign: 'center', 
              fontSize: '0.75rem', 
              color: '#A0A8AF' 
            }}>
              © {new Date().getFullYear()} Sonance. All rights reserved.
            </p>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .login-container {
          display: grid;
          grid-template-columns: 1fr;
          min-height: 100vh;
        }
        .login-branding-panel {
          display: none;
        }
        .login-mobile-logo,
        .login-mobile-footer {
          display: block;
        }
        @media (min-width: 768px) {
          .login-container {
            grid-template-columns: 1fr 1fr;
          }
          .login-branding-panel {
            display: flex !important;
          }
          .login-mobile-logo,
          .login-mobile-footer {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}

// Sonance Logo Component with "The Beam" (cyan A)
function SonanceLogo({ variant = 'light', style }: { variant?: 'light' | 'dark'; style?: React.CSSProperties }) {
  const primaryColor = variant === 'light' ? '#FFFFFF' : '#333F48'
  const beamColor = '#00A3E1'
  
  return (
    <svg
      viewBox="0 0 200 28"
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* S */}
      <path
        d="M6.8 22.4c-3.8 0-6.8-2.2-6.8-5.8h4.2c0 1.4 1.2 2.4 2.7 2.4 1.7 0 2.6-.8 2.6-2 0-1.1-.8-1.8-2.8-2.2l-1.9-.5c-3.2-.8-4.8-2.7-4.8-5.4 0-3.4 2.8-5.6 6.6-5.6 3.6 0 6.2 2.2 6.2 5.6H8.6c0-1.2-1-2.1-2.2-2.1-1.3 0-2.2.7-2.2 1.8 0 1 .7 1.6 2.6 2l1.8.5c3.4.8 5.2 2.6 5.2 5.4 0 3.6-3 6-7 6z"
        fill={primaryColor}
      />
      {/* O */}
      <path
        d="M26 22.4c-5 0-8.4-3.8-8.4-9.6s3.4-9.6 8.4-9.6 8.4 3.8 8.4 9.6-3.4 9.6-8.4 9.6zm0-3.8c2.6 0 4.2-2.2 4.2-5.8s-1.6-5.8-4.2-5.8-4.2 2.2-4.2 5.8 1.6 5.8 4.2 5.8z"
        fill={primaryColor}
      />
      {/* N */}
      <path
        d="M38.4 22V3.6h4l6.8 11.6V3.6h4V22h-4l-6.8-11.6V22h-4z"
        fill={primaryColor}
      />
      {/* A - The Beam (Cyan) */}
      <path
        d="M65.6 22l-1.4-4.4h-7.2L55.6 22h-4.2l7.2-18.4h4.8L70.8 22h-5.2zm-5-14.8l-2.6 6.8h5.2l-2.6-6.8z"
        fill={beamColor}
      />
      {/* N */}
      <path
        d="M74.4 22V3.6h4l6.8 11.6V3.6h4V22h-4l-6.8-11.6V22h-4z"
        fill={primaryColor}
      />
      {/* C */}
      <path
        d="M102.8 22.4c-5 0-8.4-3.8-8.4-9.6s3.4-9.6 8.4-9.6c4 0 7 2.4 7.8 6.4h-4.2c-.6-1.6-2-2.6-3.6-2.6-2.6 0-4.2 2.2-4.2 5.8s1.6 5.8 4.2 5.8c1.6 0 3-1 3.6-2.6h4.2c-.8 4-3.8 6.4-7.8 6.4z"
        fill={primaryColor}
      />
      {/* E */}
      <path
        d="M114.4 22V3.6h11.6v3.6h-7.6v4h6.8v3.4h-6.8v3.8h7.6V22h-11.6z"
        fill={primaryColor}
      />
    </svg>
  )
}
