import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH: Update a child account
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string; accountId: string }> }
) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId, accountId } = await params
    const body = await request.json()
    const { child_ps_account_id, routing_description } = body

    // Validation
    if (routing_description && routing_description.length < 20) {
      return NextResponse.json(
        { error: 'routing_description must be at least 20 characters' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: existingAccount, error: fetchError } = await supabase
      .from('customer_child_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('parent_ps_customer_id', customerId)
      .single()

    if (fetchError || !existingAccount) {
      return NextResponse.json({ error: 'Child account not found' }, { status: 404 })
    }

    // If changing child_ps_account_id, check for duplicates
    if (child_ps_account_id && child_ps_account_id !== existingAccount.child_ps_account_id) {
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
      const { data: duplicateChild } = await supabase
        .from('customer_child_accounts')
        .select('id, parent_ps_customer_id')
        .eq('child_ps_account_id', child_ps_account_id)
        .maybeSingle()

      if (duplicateChild) {
        return NextResponse.json(
          { error: `Account ID "${child_ps_account_id}" is already used as a child account of parent: ${duplicateChild.parent_ps_customer_id}` },
          { status: 409 }
        )
      }
    }

    // Update
    const updateData: any = {}
    if (child_ps_account_id) updateData.child_ps_account_id = child_ps_account_id
    if (routing_description) updateData.routing_description = routing_description

    const { data: updatedAccount, error: updateError } = await supabase
      .from('customer_child_accounts')
      .update(updateData)
      .eq('id', accountId)
      .eq('parent_ps_customer_id', customerId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating child account:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      child_account: updatedAccount,
      prompt_outdated: true,
      message: 'Child account updated successfully'
    })
  } catch (error: any) {
    console.error('Error in PATCH child account:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Delete a child account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string; accountId: string }> }
) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId, accountId } = await params

    // Verify ownership
    const { data: existingAccount, error: fetchError } = await supabase
      .from('customer_child_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('parent_ps_customer_id', customerId)
      .single()

    if (fetchError || !existingAccount) {
      return NextResponse.json({ error: 'Child account not found' }, { status: 404 })
    }

    // Check minimum account requirement (at least 1 must remain)
    const { data: allAccounts, error: countError } = await supabase
      .from('customer_child_accounts')
      .select('id')
      .eq('parent_ps_customer_id', customerId)

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    if (allAccounts && allAccounts.length <= 2) {
      return NextResponse.json(
        { error: 'Cannot delete this child account. MULTI customers must have at least two child accounts.' },
        { status: 400 }
      )
    }

    // Check for recent order usage (warning, but allow deletion)
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('ps_customer_id', existingAccount.child_ps_account_id)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    const orderCount = recentOrders?.length || 0

    // Delete
    const { error: deleteError } = await supabase
      .from('customer_child_accounts')
      .delete()
      .eq('id', accountId)
      .eq('parent_ps_customer_id', customerId)

    if (deleteError) {
      console.error('Error deleting child account:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Child account deleted successfully',
      prompt_outdated: true,
      recent_order_count: orderCount,
      remaining_accounts_count: (allAccounts?.length || 1) - 1
    })
  } catch (error: any) {
    console.error('Error in DELETE child account:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
