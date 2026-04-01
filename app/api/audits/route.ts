import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/audits - Fetch user's meeting audits
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('meeting_audits')
    .select(`
      *,
      calendar_event:calendar_events(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ audits: data })
}

// POST /api/audits - Create a new meeting audit (internal use)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { calendar_event_id, verdict, confidence, rationale, risks, proposed_actions } = body

  if (!calendar_event_id || !verdict) {
    return NextResponse.json(
      { error: 'calendar_event_id and verdict are required' }, 
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('meeting_audits')
    .insert({
      user_id: user.id,
      calendar_event_id,
      verdict,
      confidence,
      rationale,
      risks,
      proposed_actions,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ audit: data }, { status: 201 })
}
