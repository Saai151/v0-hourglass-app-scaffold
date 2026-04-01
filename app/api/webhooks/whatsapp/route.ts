import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Webhook endpoint for WhatsApp approval responses
// This would be configured with your WhatsApp Business API provider

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Verify webhook authenticity (in production, verify signature)
    // const signature = request.headers.get('x-webhook-signature')
    
    const { from, message, audit_id } = body

    if (!from || !message || !audit_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Find the user by WhatsApp number
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('whatsapp_number', from)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify the audit belongs to this user
    const { data: audit } = await supabase
      .from('meeting_audits')
      .select('id, status')
      .eq('id', audit_id)
      .eq('user_id', profile.id)
      .single()

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    if (audit.status !== 'pending') {
      return NextResponse.json({ error: 'Audit already processed' }, { status: 400 })
    }

    // Parse the response (expecting "yes", "approve", "no", "reject", etc.)
    const normalizedMessage = message.toLowerCase().trim()
    const isApproved = ['yes', 'y', 'approve', 'approved', 'ok', 'confirm'].includes(normalizedMessage)
    const isRejected = ['no', 'n', 'reject', 'rejected', 'cancel', 'deny'].includes(normalizedMessage)

    if (!isApproved && !isRejected) {
      return NextResponse.json({ 
        status: 'clarification_needed',
        message: 'Please reply with "yes" to approve or "no" to reject'
      })
    }

    // Update the audit status
    const { error: updateError } = await supabase
      .from('meeting_audits')
      .update({
        status: isApproved ? 'approved' : 'rejected',
        approved_via: 'whatsapp',
        approved_at: isApproved ? new Date().toISOString() : null,
      })
      .eq('id', audit_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update audit' }, { status: 500 })
    }

    // Update the approval request delivery status
    await supabase
      .from('approval_requests')
      .update({
        delivery_status: 'responded',
        response_text: message,
      })
      .eq('meeting_audit_id', audit_id)
      .eq('channel', 'whatsapp')

    // If approved, create execution record
    if (isApproved) {
      await supabase.from('executions').insert({
        meeting_audit_id: audit_id,
        action_type: 'calendar_update',
        status: 'pending',
      })
    }

    return NextResponse.json({ 
      status: 'success',
      action: isApproved ? 'approved' : 'rejected'
    })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
