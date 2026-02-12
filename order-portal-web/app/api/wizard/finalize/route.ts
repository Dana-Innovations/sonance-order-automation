import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { sessionId } = body

    // Fetch the wizard session
    const { data: session, error: sessionError } = await supabase
      .from('prompt_builder_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const customerData = session.customer_data || {}
    const childAccounts = session.child_accounts || []

    // Validate required fields
    if (!customerData.customer_name) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
    }

    if (!customerData.sender_email) {
      return NextResponse.json({ error: 'Sender email is required' }, { status: 400 })
    }

    if (!customerData.order_header_prompt) {
      return NextResponse.json({ error: 'Order header prompt is required' }, { status: 400 })
    }

    if (!customerData.order_line_prompt) {
      return NextResponse.json({ error: 'Order line prompt is required' }, { status: 400 })
    }

    // For multi-account customers, validate child accounts
    if (customerData.is_multi_account) {
      if (!childAccounts || childAccounts.length < 2) {
        return NextResponse.json(
          { error: 'Multi-account customers must have at least 2 child accounts' },
          { status: 400 }
        )
      }
    } else {
      // For single account customers, validate PS ID
      if (!customerData.ps_customer_id) {
        return NextResponse.json({ error: 'PeopleSoft Customer ID is required' }, { status: 400 })
      }
    }

    // Start transaction - create customer record
    const customerRecord = {
      ps_customer_id: customerData.is_multi_account ? 'MULTI' : customerData.ps_customer_id,
      customer_name: customerData.customer_name,
      sender_email: customerData.sender_email,
      csr_id: customerData.csr_id || null,
      sharepoint_folder_id: customerData.sharepoint_folder_id || null,
      default_carrier: customerData.default_carrier || null,
      default_ship_via: customerData.default_ship_via || null,
      default_shipto_name: customerData.default_shipto_name || null,
      order_header_prompt: customerData.order_header_prompt,
      order_line_prompt: customerData.order_line_prompt,
      MultiAccount_Prompt: customerData.is_multi_account && customerData.account_routing_prompt
        ? customerData.account_routing_prompt
        : 'This customer is not a multi-territory account.',
      is_active: true
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert(customerRecord)
      .select()
      .single()

    if (customerError) {
      console.error('Error creating customer:', customerError)
      return NextResponse.json(
        { error: `Failed to create customer: ${customerError.message}` },
        { status: 500 }
      )
    }

    // If multi-account, insert child accounts
    if (customerData.is_multi_account && childAccounts.length > 0) {
      const childAccountRecords = childAccounts.map((account: any, index: number) => ({
        parent_ps_customer_id: 'MULTI',
        child_ps_account_id: account.ps_account_id,
        routing_description: account.routing_description,
        display_order: index + 1
      }))

      const { error: childAccountsError } = await supabase
        .from('customer_child_accounts')
        .insert(childAccountRecords)

      if (childAccountsError) {
        console.error('Error creating child accounts:', childAccountsError)
        // Try to rollback by deleting the customer
        await supabase
          .from('customers')
          .delete()
          .eq('ps_customer_id', 'MULTI')
          .eq('customer_name', customerData.customer_name)

        return NextResponse.json(
          { error: `Failed to create child accounts: ${childAccountsError.message}` },
          { status: 500 }
        )
      }
    }

    // Update session status to completed
    await supabase
      .from('prompt_builder_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId)

    return NextResponse.json({
      success: true,
      customer: customer
    })
  } catch (error) {
    console.error('Error finalizing wizard:', error)
    return NextResponse.json(
      { error: 'Failed to finalize customer setup' },
      { status: 500 }
    )
  }
}
