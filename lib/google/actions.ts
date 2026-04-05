import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

/**
 * Cancel a Google Calendar event by setting its status to 'cancelled'.
 */
export async function cancelEvent(auth: OAuth2Client, eventId: string) {
  const calendar = google.calendar({ version: 'v3', auth })
  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all', // Notify attendees
  })
}

/**
 * Shorten a Google Calendar event by moving the end time earlier.
 * Defaults to halving the duration.
 */
export async function shortenEvent(
  auth: OAuth2Client,
  eventId: string,
  newDurationMinutes?: number,
) {
  const calendar = google.calendar({ version: 'v3', auth })

  // Fetch the current event
  const { data: event } = await calendar.events.get({
    calendarId: 'primary',
    eventId,
  })

  const start = event.start?.dateTime
  if (!start) return // Skip all-day events

  const startMs = new Date(start).getTime()
  const endMs = event.end?.dateTime ? new Date(event.end.dateTime).getTime() : startMs + 60 * 60 * 1000
  const currentDuration = (endMs - startMs) / 60_000

  const targetMinutes = newDurationMinutes ?? Math.round(currentDuration / 2)
  const newEnd = new Date(startMs + targetMinutes * 60_000)

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
    requestBody: {
      end: {
        dateTime: newEnd.toISOString(),
        timeZone: event.start?.timeZone || undefined,
      },
    },
  })

  return { originalMinutes: currentDuration, newMinutes: targetMinutes }
}
