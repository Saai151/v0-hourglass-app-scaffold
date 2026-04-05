import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedClient } from '@/lib/google/auth'
import { fetchUpcomingEvents } from '@/lib/google/calendar'
import type { ConnectedAccount } from '@/lib/types'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the connected Google Calendar account
  const { data: account, error: accountError } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .eq('status', 'connected')
    .single()

  if (accountError || !account) {
    return NextResponse.json(
      { error: 'Google Calendar not connected' },
      { status: 400 },
    )
  }

  try {
    const auth = await getAuthenticatedClient(supabase, account as ConnectedAccount)
    const events = await fetchUpcomingEvents(auth, account.account_email || user.email || '')

    // Upsert events into calendar_events
    const results = []
    for (const event of events) {
      const { data, error } = await supabase
        .from('calendar_events')
        .upsert(
          {
            user_id: user.id,
            ...event,
          },
          { onConflict: 'user_id,provider_event_id' },
        )
        .select('id, title')
        .single()

      results.push(
        error
          ? { title: event.title, error: error.message }
          : { title: data.title, id: data.id },
      )
    }

    return NextResponse.json({
      synced: results.filter((r) => !('error' in r)).length,
      total: events.length,
      results,
    })
  } catch (err) {
    console.error('Google Calendar sync error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 },
    )
  }
}
