import { google, type calendar_v3 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import { addDays } from 'date-fns'

export interface EventAttachment {
  fileId: string
  title: string
  mimeType: string
  fileUrl: string
}

interface TransformedEvent {
  provider_event_id: string
  title: string
  description: string | null
  organizer_email: string | null
  attendees: { email: string; name?: string; response_status?: string }[]
  start_time: string
  end_time: string
  meeting_url: string | null
  is_external: boolean
  attachments: EventAttachment[]
  raw_payload: Record<string, unknown>
}

export async function fetchUpcomingEvents(
  auth: OAuth2Client,
  userEmail: string,
): Promise<TransformedEvent[]> {
  const calendar = google.calendar({ version: 'v3', auth })
  const now = new Date()

  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: addDays(now, 14).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
    supportsAttachments: true,
  })

  return (data.items || [])
    .filter((e) => e.id && (e.start?.dateTime || e.start?.date))
    .map((e) => transformGoogleEvent(e, userEmail))
}

function transformGoogleEvent(
  event: calendar_v3.Schema$Event,
  userEmail: string,
): TransformedEvent {
  const userDomain = userEmail.split('@')[1]

  const attendees = (event.attendees || [])
    .filter((a) => a.email)
    .map((a) => ({
      email: a.email!,
      name: a.displayName || undefined,
      response_status: a.responseStatus || undefined,
    }))

  const isExternal = attendees.some(
    (a) => a.email.split('@')[1] !== userDomain,
  )

  // Extract meeting URL from conference data or hangout link
  const meetingUrl =
    event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri ||
    event.hangoutLink ||
    null

  const attachments: EventAttachment[] = (event.attachments || [])
    .filter((a) => a.fileId && a.title)
    .map((a) => ({
      fileId: a.fileId!,
      title: a.title!,
      mimeType: a.mimeType || '',
      fileUrl: a.fileUrl || '',
    }))

  return {
    provider_event_id: event.id!,
    title: event.summary || '(No title)',
    description: event.description || null,
    organizer_email: event.organizer?.email || null,
    attendees,
    start_time: event.start?.dateTime || event.start?.date!,
    end_time: event.end?.dateTime || event.end?.date!,
    meeting_url: meetingUrl,
    is_external: isExternal,
    attachments,
    raw_payload: event as unknown as Record<string, unknown>,
  }
}
