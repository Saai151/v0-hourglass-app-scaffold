import { z } from 'zod'

export const meetingSummarySchema = z.object({
  summary: z.string().min(1),
  decisions: z.array(z.string()).max(10),
  action_items: z.array(z.string()).max(10),
  open_questions: z.array(z.string()).max(10),
  participants: z.array(z.string()).max(20),
})

export type MeetingSummaryResult = z.infer<typeof meetingSummarySchema>
