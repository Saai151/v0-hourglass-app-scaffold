import { generateObject } from 'ai'
import type { CalendarEvent, UserPreferences } from '@/lib/types'
import { auditModel } from './client'
import {
  SYSTEM_PROMPT,
  formatEventForPrompt,
  formatPreferencesForPrompt,
} from './prompts'
import { meetingAuditResultSchema, type MeetingAuditResult } from './schemas'

/**
 * Audits a single calendar event using the configured AI model.
 *
 * Uses the Vercel AI SDK's generateObject() which handles structured
 * output and Zod validation in a single call — the schema is the
 * single source of truth for both the model output shape and runtime
 * validation.
 */
export async function auditMeeting(
  event: CalendarEvent,
  userEmail: string | null,
  preferences: UserPreferences | null
): Promise<MeetingAuditResult> {
  const prompt =
    formatEventForPrompt(event, userEmail) +
    formatPreferencesForPrompt(preferences)

  const { object } = await generateObject({
    model: auditModel,
    schema: meetingAuditResultSchema,
    system: SYSTEM_PROMPT,
    prompt,
  })

  return object
}
