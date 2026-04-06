import { generateText, Output } from 'ai'
import type { CalendarEvent, MeetingSummary, UserPreferences } from '@/lib/types'
import { auditModel } from './client'
import {
  SYSTEM_PROMPT,
  formatEventForPrompt,
  formatMeetingNotesForPrompt,
  formatPreferencesForPrompt,
} from './prompts'
import { meetingAuditResultSchema, type MeetingAuditResult } from './schemas'

/**
 * Audits a single calendar event using the configured AI model.
 *
 * Uses the Vercel AI SDK's generateText() with Output.object() which handles
 * structured output and Zod validation — the schema is the single source of
 * truth for both the model output shape and runtime validation.
 */
export async function auditMeeting(
  event: CalendarEvent,
  userEmail: string | null,
  preferences: UserPreferences | null,
  meetingSummary?: MeetingSummary | null,
): Promise<MeetingAuditResult> {
  const prompt =
    formatEventForPrompt(event, userEmail) +
    formatMeetingNotesForPrompt(meetingSummary ?? null) +
    formatPreferencesForPrompt(preferences)

  const { output } = await generateText({
    model: auditModel,
    output: Output.object({ schema: meetingAuditResultSchema }),
    system: SYSTEM_PROMPT,
    prompt,
  })

  if (!output) {
    throw new Error('Failed to audit meeting: no output returned')
  }

  return output
}
