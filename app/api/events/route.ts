import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/events - Fetch user's calendar events
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') || '100')

  let query = supabase
    .from('calendar_events')
    .select(`
      *,
      meeting_audit:meeting_audits(id, verdict, status)
    `)
    .eq('user_id', user.id)
    .order('start_time', { ascending: true })
    .limit(limit)

  if (from) {
    query = query.gte('start_time', from)
  }

  if (to) {
    query = query.lte('start_time', to)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events: data })
}

// POST /api/events - Create/sync calendar events (from webhook or manual sync)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { events } = body

  if (!events || !Array.isArray(events)) {
    return NextResponse.json({ error: 'events array is required' }, { status: 400 })
  }

  const results = []

  for (const event of events) {
    const { data, error } = await supabase
      .from('calendar_events')
      .upsert({
        user_id: user.id,
        provider_event_id: event.provider_event_id,
        title: event.title,
        description: event.description,
        organizer_email: event.organizer_email,
        attendees: event.attendees || [],
        start_time: event.start_time,
        end_time: event.end_time,
        meeting_url: event.meeting_url,
        is_external: event.is_external || false,
        raw_payload: event.raw_payload || {},
      }, {
        onConflict: 'user_id,provider_event_id',
      })
      .select()
      .single()

    if (error) {
      results.push({ provider_event_id: event.provider_event_id, error: error.message })
    } else {
      results.push({ provider_event_id: event.provider_event_id, id: data.id })
    }
  }

  return NextResponse.json({ results })
}
