import { generateText, Output } from 'ai'
import { auditModel } from '@/lib/ai/client'
import type {
  CalendarEvent,
  MeetingDocument,
} from '@/lib/types'
import { chunkMeetingContent, toSearchText } from './chunking'
import {
  meetingSummarySchema,
  type MeetingSummaryResult,
} from './schemas'

export interface MeetingDocumentInput {
  title: string
  documentType: 'transcript' | 'notes'
  content: string
  sourceMetadata?: Record<string, unknown>
}

export interface MeetingSummaryUpsert {
  summary: string
  decisions: string[]
  action_items: string[]
  open_questions: string[]
  participants: string[]
  search_text: string
  source_document_ids: string[]
}

function formatAttendees(event: CalendarEvent) {
  if (!event.attendees?.length) return 'None listed'
  return event.attendees
    .map((attendee) => attendee.name || attendee.email)
    .join(', ')
}

function buildSummarySearchText(result: MeetingSummaryResult, event: CalendarEvent) {
  return toSearchText([
    event.title,
    event.description,
    result.summary,
    ...result.decisions,
    ...result.action_items,
    ...result.open_questions,
    ...result.participants,
  ])
}

export function buildDocumentChunks(documentId: string, eventId: string, userId: string, input: MeetingDocumentInput) {
  return chunkMeetingContent(input.content).map((content, index) => ({
    user_id: userId,
    calendar_event_id: eventId,
    meeting_document_id: documentId,
    chunk_index: index,
    content,
    search_text: toSearchText([input.title, input.documentType, content]),
    source_label: `${input.documentType}:${input.title}`,
    metadata: input.sourceMetadata ?? {},
  }))
}

export async function summarizeMeeting(
  event: CalendarEvent,
  documents: Array<Pick<MeetingDocument, 'id' | 'title' | 'document_type' | 'content'>>,
): Promise<MeetingSummaryUpsert> {
  const context = documents
    .map((document) => {
      const trimmedContent = document.content.trim().slice(0, 6000)
      return [
        `Document: ${document.title}`,
        `Type: ${document.document_type}`,
        `Content:`,
        trimmedContent,
      ].join('\n')
    })
    .join('\n\n---\n\n')

  const prompt = [
    'Create a concise canonical summary for this meeting using the supplied documents.',
    'Return decisions, action items, open questions, and key participants as short bullet-style phrases.',
    '',
    `Meeting title: ${event.title}`,
    `Meeting window: ${event.start_time} to ${event.end_time}`,
    `Organizer: ${event.organizer_email || 'unknown'}`,
    `Attendees: ${formatAttendees(event)}`,
    `Description: ${event.description || '(none provided)'}`,
    '',
    'Meeting documents:',
    context || 'No supporting documents provided.',
  ].join('\n')

  const { output } = await generateText({
    model: auditModel,
    output: Output.object({ schema: meetingSummarySchema }),
    system:
      'You summarize meeting transcripts and notes for later retrieval. Be factual, concise, and do not invent decisions or action items.',
    prompt,
  })

  if (!output) {
    throw new Error('Failed to generate meeting summary: no output returned')
  }

  return {
    ...output,
    search_text: buildSummarySearchText(output, event),
    source_document_ids: documents.map((document) => document.id),
  }
}
