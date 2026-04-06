import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedClient } from '@/lib/google/auth'
import { fetchUpcomingEvents } from '@/lib/google/calendar'
import { searchMeetingDocs } from '@/lib/google/drive'
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

    // Search Google Drive for docs related to each synced meeting
    let docsFound = 0
    const syncedEvents = results.filter((r): r is { title: string; id: string } => !('error' in r))

    for (const event of syncedEvents) {
      try {
        const docs = await searchMeetingDocs(auth, event.title, 3)
        for (const doc of docs) {
          // Check if we already have this Drive file for this event
          const { data: existing } = await supabase
            .from('meeting_documents')
            .select('id')
            .eq('calendar_event_id', event.id)
            .eq('user_id', user.id)
            .filter('source_metadata->>drive_file_id', 'eq', doc.id)
            .maybeSingle()

          if (existing) {
            // Update existing doc content
            await supabase
              .from('meeting_documents')
              .update({
                content: doc.content,
                source_metadata: {
                  source: 'google_drive',
                  drive_file_id: doc.id,
                  mime_type: doc.mimeType,
                  url: doc.url,
                  modified_time: doc.modifiedTime,
                },
              })
              .eq('id', existing.id)
            docsFound++
          } else {
            const { error: docError } = await supabase
              .from('meeting_documents')
              .insert({
                user_id: user.id,
                calendar_event_id: event.id,
                title: doc.title,
                document_type: 'notes' as const,
                content: doc.content,
                source_metadata: {
                  source: 'google_drive',
                  drive_file_id: doc.id,
                  mime_type: doc.mimeType,
                  url: doc.url,
                  modified_time: doc.modifiedTime,
                },
              })
            if (!docError) docsFound++
          }
        }
      } catch {
        // Drive search may fail if scope not granted — continue silently
      }
    }

    return NextResponse.json({
      synced: syncedEvents.length,
      total: events.length,
      docs_found: docsFound,
      results,
    })
  } catch (err) {
    console.error('Google Calendar sync error:', err)

    const message = err instanceof Error ? err.message : ''
    if (message.includes('insufficient authentication scopes')) {
      return NextResponse.json(
        {
          error: 'Calendar permission not granted. Please disconnect and reconnect, making sure to check the Google Calendar checkbox on the consent screen.',
          code: 'missing_scope',
        },
        { status: 403 },
      )
    }

    return NextResponse.json(
      { error: message || 'Sync failed' },
      { status: 500 },
    )
  }
}
