import { NextResponse } from 'next/server'

export async function GET() {
  // This endpoint helps debug environment variables
  // Remove or secure this after debugging!

  const envStatus = {
    DISABLE_AUTH: process.env.DISABLE_AUTH || 'not set',
    DISABLE_AUTH_value: process.env.DISABLE_AUTH === 'true' ? 'TRUE (auth bypassed!)' : 'false or not set',
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'NOT SET',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'NOT SET',
  }

  return NextResponse.json(envStatus, { status: 200 })
}
