import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Create a new prompt builder session for the customer wizard
  const { data: session, error: sessionError } = await supabase
    .from('prompt_builder_sessions')
    .insert({
      user_id: user.id,
      title: 'Customer Setup',
      status: 'draft',
      is_customer_wizard: true,
      wizard_step: 0, // Start at step 0 (copy from existing or start fresh)
      customer_data: {
        is_active: true // Default to active
      },
      question_answers: []
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    console.error('Error creating wizard session:', sessionError)
    return NextResponse.json(
      { error: 'Failed to create wizard session', details: sessionError?.message },
      { status: 500 }
    )
  }

  // Redirect to the wizard with the session ID
  // Note: redirect() throws a NEXT_REDIRECT error which is expected behavior
  redirect(`/settings/wizard/${session.id}`)
}
