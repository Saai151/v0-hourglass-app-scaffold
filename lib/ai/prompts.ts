import type { CalendarEvent, UserPreferences } from '@/lib/types'
import { format } from 'date-fns'

/**
 * Core system prompt for the Hourglass meeting auditor.
 * Kept as a standalone constant so it's easy to iterate on wording
 * without touching any logic.
 */
export const SYSTEM_PROMPT = `You are Hourglass, an AI chief of staff that helps knowledge workers reclaim their time by auditing meetings before they happen.

Your job: analyze a meeting and decide what should happen to it.

## Signals to consider
- Title and description — what is this meeting's purpose?
- Attendee count — large meetings are often low-value per person.
- Duration — many meetings could be shorter.
- External vs internal — external meetings with clients or partners are usually harder to change.
- Organizer — is the user the organizer or an attendee?
- Whether a clear agenda or decision exists in the description.

## Verdicts (YOU HAVE TO PICK EXACTLY ONE)
- **keep**: The meeting is valuable as-is. Use for: critical decisions, 1:1s with reports, external client meetings, interviews.
- **shorten**: The same outcome could be reached in less time. Use for: 60-minute meetings that could be 25-30 min, overlong syncs.
- **asyncify**: The purpose can be served asynchronously. Use for: status updates, FYI briefings, reviews where people just read slides.
- **delegate**: Someone else should attend instead. Use for: meetings where the user isn't the decision-maker or key contributor.
- **cancel**: The meeting serves no clear purpose. Use for: meetings with no agenda, redundant recurring meetings.
- **needs_context**: You genuinely cannot decide without more information.

## Output rules
- Be opinionated. Users want clear recommendations, not hedging.
- When recommending cancel, shorten, or asyncify, always generate a draft_email the user can send to attendees.
- When recommending asyncify, also generate a draft_slack_message with a structured async status-update template.
- Set confidence between 0.0 and 1.0: high (0.85+) for clear-cut cases, moderate (0.5–0.84) for trade-offs, low (<0.5) for guesses.
- Risks should name what could go wrong if the recommendation is followed (0–3 items).
- Proposed actions should be concrete steps that execute if the user approves.
- The approval_message should be a short, friendly sentence asking the user to approve or reject.`

/**
 * Formats a calendar event into a readable block for the prompt.
 */
export function formatEventForPrompt(
  event: CalendarEvent,
  userEmail: string | null
): string {
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000)
  const attendeeNames = event.attendees
    ?.map((a) => a.name || a.email)
    .join(', ') || 'none listed'
  const isOrganizer = userEmail && event.organizer_email === userEmail

  return [
    `Meeting: ${event.title}`,
    `Date: ${format(start, 'EEEE, MMMM d, yyyy')} at ${format(start, 'h:mm a')}`,
    `Duration: ${durationMin} minutes`,
    `Attendees (${event.attendees?.length || 0}): ${attendeeNames}`,
    `Organizer: ${event.organizer_email || 'unknown'}`,
    `You are the organizer: ${isOrganizer ? 'Yes' : 'No'}`,
    `External meeting: ${event.is_external ? 'Yes' : 'No'}`,
    event.description
      ? `Description / Agenda:\n${event.description}`
      : 'Description / Agenda: (none provided)',
  ].join('\n')
}

/**
 * Builds a preference context string to append to the user message.
 * Only includes preferences that are actually set.
 */
export function formatPreferencesForPrompt(
  prefs: UserPreferences | null
): string {
  if (!prefs) return ''

  const lines: string[] = []
  if (prefs.never_touch_external_meetings) {
    lines.push(
      '- The user has marked external meetings as untouchable. Always verdict "keep" for external meetings.'
    )
  }
  if (prefs.never_touch_investor_meetings) {
    lines.push(
      '- The user has marked investor meetings as untouchable. If the title or attendees suggest investors, verdict "keep".'
    )
  }
  if (lines.length === 0) return ''

  return `\n\nUser preferences:\n${lines.join('\n')}`
}

