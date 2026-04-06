import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedClient } from '@/lib/google/auth'
import { cancelEvent, shortenEvent } from '@/lib/google/actions'
import type { ConnectedAccount } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/audits/[id]/execute
 *
 * Executes the approved audit recommendation on Google Calendar.
 * - cancel → deletes the event
 * - shorten → halves the event duration
 * - asyncify → deletes the event (meeting replaced by async)
 * - delegate → no calendar action (user handles manually)
 * - keep → no action
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch the audit with its calendar event
  const { data: audit, error: auditError } = await supabase
    .from('meeting_audits')
    .select('*, calendar_event:calendar_events(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (auditError || !audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  if (audit.status !== 'approved') {
    return NextResponse.json({ error: 'Audit must be approved before execution' }, { status: 400 })
  }

  // Get Google Calendar connection
  const { data: account } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .eq('status', 'connected')
    .single()

  if (!account) {
    return NextResponse.json(
      { error: 'Google Calendar not connected. Connect it in Integrations to execute actions.' },
      { status: 400 },
    )
  }

  const providerEventId = audit.calendar_event?.provider_event_id
  if (!providerEventId) {
    return NextResponse.json(
      { error: 'No Google Calendar event ID found. This event may have been created from seed data.' },
      { status: 400 },
    )
  }

  try {
    const auth = await getAuthenticatedClient(supabase, account as ConnectedAccount)
    let result: Record<string, unknown> = {}

    switch (audit.verdict) {
      case 'cancel':
      case 'asyncify':
        await cancelEvent(auth, providerEventId)
        result = { action: 'cancelled', eventId: providerEventId }
        break

      case 'shorten':
        const shortenResult = await shortenEvent(auth, providerEventId)
        result = { action: 'shortened', ...shortenResult }
        break

      case 'delegate':
      case 'keep':
      case 'needs_context':
        return NextResponse.json({
          executed: false,
          message: `No calendar action for "${audit.verdict}" verdict.`,
        })
    }

    // Update audit status to executed
    await supabase
      .from('meeting_audits')
      .update({ status: 'executed' })
      .eq('id', id)

    return NextResponse.json({ executed: true, result })
  } catch (err) {
    console.error('Audit execution error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Execution failed' },
      { status: 500 },
    )
  }
}
