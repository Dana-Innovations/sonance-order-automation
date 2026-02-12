import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, service_name, api_key, created_at, updated_at')
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ apiKeys: apiKeys || [] })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { service_name, api_key } = body

    if (!service_name || !api_key) {
      return NextResponse.json(
        { error: 'service_name and api_key are required' },
        { status: 400 }
      )
    }

    // Upsert (insert or update if exists)
    const { data, error } = await supabase
      .from('api_keys')
      .upsert({
        user_id: user.id,
        service_name,
        api_key
      }, {
        onConflict: 'user_id,service_name'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ apiKey: data })
  } catch (error) {
    console.error('Error saving API key:', error)
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const service_name = searchParams.get('service_name')

    if (!service_name) {
      return NextResponse.json(
        { error: 'service_name is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('service_name', service_name)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    )
  }
}
