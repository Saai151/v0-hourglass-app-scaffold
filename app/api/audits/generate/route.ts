import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auditMeeting } from '@/lib/ai/audit'
import type { CalendarEvent, UserPreferences } from '@/lib/types'

/**
 * POST /api/audits/generate
 *
 * Runs the AI audit pipeline:
 * 1. Fetches the user's upcoming calendar events
 * 2. Filters out events that already have an active audit
 * 3. Calls Claude for each event in parallel
 * 4. Writes the resulting audits to the database
 *
 * Body (all optional):
 *   event_ids: string[]     — audit only these events (default: all upcoming)
 *   force_reaudit: boolean  — re-audit events that already have audits
 */
export async function POST(request: Request) {
  try {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const eventIds: string[] | undefined = body.event_ids
  const forceReaudit: boolean = body.force_reaudit ?? false

  // Fetch user preferences (needed for "never touch" rules)
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Fetch upcoming events
  let eventsQuery = supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(20)

  if (eventIds && eventIds.length > 0) {
    eventsQuery = eventsQuery.in('id', eventIds)
  }

  const { data: events, error: eventsError } = await eventsQuery

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 })
  }

  if (!events || events.length === 0) {
    return NextResponse.json(
      { error: 'No upcoming events found. Sync your calendar first.' },
      { status: 404 }
    )
  }

  // Filter out events that already have a non-rejected audit
  let eventsToAudit: CalendarEvent[] = events as CalendarEvent[]

  if (!forceReaudit) {
    const { data: existingAudits } = await supabase
      .from('meeting_audits')
      .select('calendar_event_id')
      .eq('user_id', user.id)
      .in(
        'calendar_event_id',
        events.map((e) => e.id)
      )
      .in('status', ['pending', 'approved', 'executed'])

    const auditedEventIds = new Set(
      existingAudits?.map((a) => a.calendar_event_id) ?? []
    )
    eventsToAudit = eventsToAudit.filter((e) => !auditedEventIds.has(e.id))
  }

  if (eventsToAudit.length === 0) {
    return NextResponse.json({
      audits_created: 0,
      audits: [],
      message: 'All events already have active audits.',
    })
  }

  // Fetch meeting summaries for events that have notes (best-effort)
  let summaryByEvent = new Map<string, Record<string, unknown>>()
  try {
    const { data: summaries } = await supabase
      .from('meeting_summaries')
      .select('*')
      .eq('user_id', user.id)
      .in('calendar_event_id', eventsToAudit.map((e) => e.id))

    summaryByEvent = new Map(
      (summaries ?? []).map((s: Record<string, unknown>) => [s.calendar_event_id as string, s])
    )
  } catch {
    // Table may not exist yet — continue without notes context
  }

  // Run AI audit for each event in parallel
  const results = await Promise.allSettled(
    eventsToAudit.map((event) =>
      auditMeeting(
        event,
        user.email ?? null,
        preferences as UserPreferences | null,
        summaryByEvent.get(event.id) ?? null,
      ).then((result) => ({ event, result }))
    )
  )

  // Write successful audits to the database
  const auditsToInsert = results
    .filter(
      (r): r is PromiseFulfilledResult<{ event: CalendarEvent; result: Awaited<ReturnType<typeof auditMeeting>> }> =>
        r.status === 'fulfilled'
    )
    .map(({ value: { event, result } }) => ({
      user_id: user.id,
      calendar_event_id: event.id,
      verdict: result.verdict,
      confidence: result.confidence,
      rationale: result.rationale,
      risks: result.risks,
      draft_email: result.draft_email ?? null,
      draft_slack_message: result.draft_slack_message ?? null,
      proposed_actions: result.proposed_actions,
      approval_message: result.approval_message,
      status: 'pending' as const,
    }))

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason?.message ?? 'Unknown error')

  if (auditsToInsert.length === 0) {
    return NextResponse.json(
      { error: 'All audits failed', details: errors },
      { status: 500 }
    )
  }

  const { data: insertedAudits, error: insertError } = await supabase
    .from('meeting_audits')
    .insert(auditsToInsert)
    .select(`
      *,
      calendar_event:calendar_events(*)
    `)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    audits_created: insertedAudits?.length ?? 0,
    audits: insertedAudits ?? [],
    ...(errors.length > 0 && { partial_errors: errors }),
  })
  } catch (error) {
    console.error('Audit generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
