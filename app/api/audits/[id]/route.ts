import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/audits/[id] - Fetch a specific audit
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('meeting_audits')
    .select(`
      *,
      calendar_event:calendar_events(*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  // Fetch meeting context separately — the table may not exist yet
  const { data: contextRows } = await supabase
    .from('meeting_contexts')
    .select('*')
    .eq('calendar_event_id', data.calendar_event_id)
    .eq('user_id', user.id)
    .limit(1)

  return NextResponse.json({ audit: { ...data, meeting_context: contextRows ?? [] } })
}

// PATCH /api/audits/[id] - Update audit (approve/reject)
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { status, approved_via } = body

  if (!status || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json(
      { error: 'status must be "approved" or "rejected"' }, 
      { status: 400 }
    )
  }

  const updateData: Record<string, unknown> = { status }
  
  if (status === 'approved') {
    updateData.approved_via = approved_via || 'web'
    updateData.approved_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('meeting_audits')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If approved, trigger execution (in a real app, this would be a background job)
  if (status === 'approved') {
    // Create execution record
    await supabase.from('executions').insert({
      meeting_audit_id: id,
      action_type: 'calendar_update',
      status: 'pending',
    })
  }

  return NextResponse.json({ audit: data })
}
