import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List all child accounts for a customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId } = await params

    // Fetch child accounts
    const { data: childAccounts, error } = await supabase
      .from('customer_child_accounts')
      .select('*')
      .eq('parent_ps_customer_id', customerId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching child accounts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, child_accounts: childAccounts || [] })
  } catch (error: any) {
    console.error('Error in GET child accounts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create a new child account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId } = await params
    const body = await request.json()
    const { child_ps_account_id, routing_description } = body

    // Validation
    if (!child_ps_account_id || !routing_description) {
      return NextResponse.json(
        { error: 'child_ps_account_id and routing_description are required' },
        { status: 400 }
      )
    }

    if (routing_description.length < 20) {
      return NextResponse.json(
        { error: 'routing_description must be at least 20 characters' },
        { status: 400 }
      )
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('ps_customer_id, customer_name')
      .eq('ps_customer_id', customerId)
      .maybeSingle()

    if (customerError) {
      console.error('Error fetching parent customer:', customerError)
      return NextResponse.json({ error: `Database error: ${customerError.message}` }, { status: 500 })
    }

    if (!customer) {
      console.error(`Parent customer not found with ps_customer_id: ${customerId}`)
      return NextResponse.json({
        error: `Parent customer with ID "${customerId}" not found. Please ensure the parent customer is saved first.`
      }, { status: 404 })
    }

    // Check if account ID is already used as a parent account
    const { data: parentAccount } = await supabase
      .from('customers')
      .select('ps_customer_id, customer_name')
      .eq('ps_customer_id', child_ps_account_id)
      .maybeSingle()

    if (parentAccount) {
      return NextResponse.json(
        { error: `Account ID "${child_ps_account_id}" is already used as a parent account for customer: ${parentAccount.customer_name}` },
        { status: 409 }
      )
    }

    // Check if account ID is already used as a child account
    const { data: existingChild } = await supabase
      .from('customer_child_accounts')
      .select('id, parent_ps_customer_id')
      .eq('child_ps_account_id', child_ps_account_id)
      .maybeSingle()

    if (existingChild) {
      return NextResponse.json(
        { error: `Account ID "${child_ps_account_id}" is already used as a child account of parent: ${existingChild.parent_ps_customer_id}` },
        { status: 409 }
      )
    }

    // Get next display_order
    const { data: maxOrder } = await supabase
      .from('customer_child_accounts')
      .select('display_order')
      .eq('parent_ps_customer_id', customerId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrder?.display_order || 0) + 1

    // Insert child account
    const { data: newAccount, error: insertError } = await supabase
      .from('customer_child_accounts')
      .insert({
        parent_ps_customer_id: customerId,
        child_ps_account_id,
        routing_description,
        display_order: nextOrder,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting child account:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      child_account: newAccount,
      prompt_outdated: true,
      message: 'Child account added successfully'
    })
  } catch (error: any) {
    console.error('Error in POST child account:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
