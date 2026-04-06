import { generateText } from 'ai'
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
 * Uses generateText + manual JSON parsing to avoid provider-level
 * structured output issues with Groq's json_schema mode.
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

  const { text } = await generateText({
    model: auditModel,
    system: SYSTEM_PROMPT,
    prompt,
  })

  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
  if (!jsonMatch) {
    throw new Error('Failed to audit meeting: no JSON found in response')
  }

  const parsed = JSON.parse(jsonMatch[1].trim())
  return meetingAuditResultSchema.parse(parsed)
}
