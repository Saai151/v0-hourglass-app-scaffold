import { generateObject } from 'ai'
import { auditModel } from '@/lib/ai/client'
import type {
  CalendarEvent,
  MeetingCitation,
  MeetingChatMessage,
  MeetingChatThread,
  MeetingChunk,
  MeetingDocument,
  MeetingSummary,
} from '@/lib/types'
import { chunkMeetingContent, excerptText, extractSearchTerms, keywordScore, toSearchText } from './chunking'
import {
  meetingChatAnswerSchema,
  meetingSummarySchema,
  type MeetingSummaryResult,
} from './schemas'

type RetrievedSummary = MeetingSummary & {
  calendar_event: Pick<CalendarEvent, 'id' | 'title' | 'start_time' | 'end_time'>
}

type RetrievedChunk = MeetingChunk & {
  meeting_document: Pick<MeetingDocument, 'id' | 'title' | 'document_type'>
  calendar_event: Pick<CalendarEvent, 'id' | 'title' | 'start_time' | 'end_time'>
}

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

interface RetrievedContext {
  type: 'summary' | 'chunk'
  meetingId: string
  meetingTitle: string
  label: string
  excerpt: string
  text: string
  documentId?: string
  documentTitle?: string
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
  documents: Array<Pick<MeetingDocument, 'id' | 'title' | 'document_type' | 'content'>>
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

  const { object } = await generateObject({
    model: auditModel,
    schema: meetingSummarySchema,
    system:
      'You summarize meeting transcripts and notes for later retrieval. Be factual, concise, and do not invent decisions or action items.',
    prompt,
  })

  return {
    ...object,
    search_text: buildSummarySearchText(object, event),
    source_document_ids: documents.map((document) => document.id),
  }
}

function summarizeMessageHistory(messages: MeetingChatMessage[]) {
  if (messages.length === 0) return 'No earlier messages.'

  return messages
    .slice(-6)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n')
}

function toCitation(context: RetrievedContext): MeetingCitation {
  return {
    type: context.type,
    meeting_id: context.meetingId,
    meeting_title: context.meetingTitle,
    document_id: context.documentId,
    document_title: context.documentTitle,
    excerpt: context.excerpt,
  }
}

function rankSummaries(summaries: RetrievedSummary[], message: string) {
  const terms = extractSearchTerms(message)

  return summaries
    .map((summary) => ({
      summary,
      score: keywordScore(
        toSearchText([
          summary.calendar_event.title,
          summary.summary,
          summary.search_text,
        ]),
        terms
      ),
    }))
    .sort((a, b) => b.score - a.score)
}

function rankChunks(chunks: RetrievedChunk[], message: string) {
  const terms = extractSearchTerms(message)

  return chunks
    .map((chunk) => ({
      chunk,
      score: keywordScore(
        toSearchText([
          chunk.calendar_event.title,
          chunk.meeting_document.title,
          chunk.search_text,
          chunk.content,
        ]),
        terms
      ),
    }))
    .sort((a, b) => b.score - a.score)
}

export async function retrieveMeetingContext(options: {
  supabase: any
  userId: string
  message: string
  meetingId?: string
}) {
  const { supabase, userId, message, meetingId } = options

  let summariesQuery = supabase
    .from('meeting_summaries')
    .select(`
      *,
      calendar_event:calendar_events(id, title, start_time, end_time)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(40)

  if (meetingId) {
    summariesQuery = summariesQuery.eq('calendar_event_id', meetingId)
  }

  const { data: summariesData } = await summariesQuery
  const rankedSummaries = rankSummaries((summariesData ?? []) as RetrievedSummary[], message)
  const selectedSummaries = rankedSummaries
    .filter((item, index) => item.score > 0 || index < 3)
    .slice(0, 4)

  const selectedMeetingIds = Array.from(
    new Set(
      selectedSummaries.map((item) => item.summary.calendar_event_id).concat(meetingId ? [meetingId] : [])
    )
  )

  let chunksQuery = supabase
    .from('meeting_chunks')
    .select(`
      *,
      meeting_document:meeting_documents(id, title, document_type),
      calendar_event:calendar_events(id, title, start_time, end_time)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(120)

  if (selectedMeetingIds.length === 1) {
    chunksQuery = chunksQuery.eq('calendar_event_id', selectedMeetingIds[0])
  }

  const { data: chunksData } = await chunksQuery
  const rankedChunks = rankChunks(
    ((chunksData ?? []) as RetrievedChunk[]).filter((chunk) =>
      selectedMeetingIds.length === 0
        ? true
        : selectedMeetingIds.includes(chunk.calendar_event_id)
    ),
    message
  )

  const selectedChunks = rankedChunks
    .filter((item, index) => item.score > 0 || index < 4)
    .slice(0, 6)

  const contexts: RetrievedContext[] = [
    ...selectedSummaries.map(({ summary }) => ({
      type: 'summary' as const,
      meetingId: summary.calendar_event.id,
      meetingTitle: summary.calendar_event.title,
      label: `Summary for ${summary.calendar_event.title}`,
      excerpt: excerptText(summary.summary),
      text: [
        `Summary: ${summary.summary}`,
        `Decisions: ${summary.decisions.join('; ') || 'None recorded'}`,
        `Action items: ${summary.action_items.join('; ') || 'None recorded'}`,
        `Open questions: ${summary.open_questions.join('; ') || 'None recorded'}`,
      ].join('\n'),
    })),
    ...selectedChunks.map(({ chunk }) => ({
      type: 'chunk' as const,
      meetingId: chunk.calendar_event.id,
      meetingTitle: chunk.calendar_event.title,
      label: `${chunk.meeting_document.title} (${chunk.meeting_document.document_type})`,
      excerpt: excerptText(chunk.content),
      text: chunk.content,
      documentId: chunk.meeting_document.id,
      documentTitle: chunk.meeting_document.title,
    })),
  ]

  return contexts
}

export async function answerMeetingQuestion(options: {
  message: string
  thread: Pick<MeetingChatThread, 'scope'> & { calendar_event_id: string | null }
  history: MeetingChatMessage[]
  contexts: RetrievedContext[]
}) {
  const { message, thread, history, contexts } = options

  const contextBlock =
    contexts.length === 0
      ? 'No meeting summaries or meeting notes were found for this question.'
      : contexts
          .map((context, index) =>
            [
              `[${index}] ${context.label}`,
              `Meeting: ${context.meetingTitle}`,
              `Excerpt: ${context.excerpt}`,
              `Full context: ${context.text}`,
            ].join('\n')
          )
          .join('\n\n---\n\n')

  const { object } = await generateObject({
    model: auditModel,
    schema: meetingChatAnswerSchema,
    system: [
      'You answer questions about meetings using provided notes, transcripts, and canonical summaries.',
      'Only rely on the provided context.',
      'If the context is incomplete, say so clearly.',
      'Use a helpful and concise tone.',
      'Select citation_indices that best support the answer.',
    ].join(' '),
    prompt: [
      `Thread scope: ${thread.scope}`,
      `Focused meeting id: ${thread.calendar_event_id || 'none'}`,
      '',
      'Recent conversation:',
      summarizeMessageHistory(history),
      '',
      'Retrieved meeting context:',
      contextBlock,
      '',
      `User question: ${message}`,
    ].join('\n'),
  })

  const citations = object.citation_indices
    .map((index) => contexts[index])
    .filter((context): context is RetrievedContext => Boolean(context))
    .map(toCitation)

  return {
    answer: object.answer,
    citations,
    retrievalContext: {
      context_count: contexts.length,
      scope: thread.scope,
      meeting_id: thread.calendar_event_id,
    },
  }
}
