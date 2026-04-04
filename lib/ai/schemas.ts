import { z } from 'zod'

/**
 * Validates the structured output returned by Claude via tool_use.
 * If the AI returns unexpected values (e.g., a verdict typo or
 * confidence > 1), this catches it before it reaches the database.
 */
export const meetingAuditResultSchema = z.object({
  verdict: z.enum([
    'keep',
    'shorten',
    'asyncify',
    'delegate',
    'cancel',
    'needs_context',
  ]),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  risks: z.array(z.string()).max(5),
  draft_email: z.string().nullable().optional(),
  draft_slack_message: z.string().nullable().optional(),
  proposed_actions: z.array(
    z.object({
      type: z.enum([
        'shorten',
        'cancel',
        'delegate',
        'convert_async',
        'send_email',
        'send_slack',
        'create_focus_block',
      ]),
      description: z.string(),
    })
  ),
  approval_message: z.string().min(1),
})

export type MeetingAuditResult = z.infer<typeof meetingAuditResultSchema>
