import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Await params (Next.js 15+ requirement)
  const { sessionId } = await params

  try {
    const body = await request.json()
    const { wizard_step, customer_data, child_accounts, status } = body

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (wizard_step !== undefined) updates.wizard_step = wizard_step
    if (customer_data !== undefined) updates.customer_data = customer_data
    if (child_accounts !== undefined) updates.child_accounts = child_accounts
    if (status !== undefined) updates.status = status

    // Update customer_name if present in customer_data
    if (customer_data?.customer_name) {
      updates.customer_name = customer_data.customer_name
    }

    // Update the session
    const { data, error } = await supabase
      .from('prompt_builder_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('user_id', user.id) // Ensure user owns this session
      .eq('is_customer_wizard', true)
      .select()
      .single()

    if (error) {
      console.error('Error updating wizard session:', error)
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, session: data })
  } catch (error) {
    console.error('Error in wizard update:', error)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Await params (Next.js 15+ requirement)
  const { sessionId } = await params

  try {
    const { data, error } = await supabase
      .from('prompt_builder_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .eq('is_customer_wizard', true)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ session: data })
  } catch (error) {
    console.error('Error fetching wizard session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}
