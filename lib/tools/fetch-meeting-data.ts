import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { excerptText, extractSearchTerms, keywordScore, toSearchText } from '@/lib/meetings/chunking'
import type {
  CalendarEvent,
  MeetingChunk,
  MeetingDocument,
  MeetingSummary,
} from '@/lib/types'

type RetrievedSummary = MeetingSummary & {
  calendar_event: Pick<CalendarEvent, 'id' | 'title' | 'start_time' | 'end_time'>
}

type RetrievedChunk = MeetingChunk & {
  meeting_document: Pick<MeetingDocument, 'id' | 'title' | 'document_type'>
  calendar_event: Pick<CalendarEvent, 'id' | 'title' | 'start_time' | 'end_time'>
}

const fetchMeetingDataInputSchema = z.object({
  searchQuery: z.string().describe('Keywords to search in meeting summaries, notes, and transcripts'),
  meetingTitle: z.string().optional().describe('Filter by meeting title (partial match)'),
  dateAfter: z.string().optional().describe('ISO date string — only include meetings after this date'),
  dateBefore: z.string().optional().describe('ISO date string — only include meetings before this date'),
})

export type FetchMeetingDataInput = z.infer<typeof fetchMeetingDataInputSchema>

function rankSummaries(summaries: RetrievedSummary[], terms: string[]) {
  return summaries
    .map((summary) => ({
      summary,
      score: keywordScore(
        toSearchText([summary.calendar_event.title, summary.summary, summary.search_text]),
        terms,
      ),
    }))
    .sort((a, b) => b.score - a.score)
}

function rankChunks(chunks: RetrievedChunk[], terms: string[]) {
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
        terms,
      ),
    }))
    .sort((a, b) => b.score - a.score)
}

export function createFetchMeetingDataTool(
  supabase: SupabaseClient,
  userId: string,
  scopedMeetingId?: string | null,
) {
  return tool({
    description:
      'Query meeting summaries, notes, transcripts, decisions, and action items from the database. ' +
      'Call this tool when the user asks about specific meetings, decisions, action items, attendees, ' +
      'or anything related to their meeting history.',
    inputSchema: fetchMeetingDataInputSchema,
    execute: async ({ searchQuery, meetingTitle, dateAfter, dateBefore }) => {
      const terms = extractSearchTerms(searchQuery)

      // --- Calendar events (for date/title filtering) ---
      let eventsQuery = supabase
        .from('calendar_events')
        .select('id, title, start_time, end_time, organizer_email, attendees, description')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .limit(60)

      if (scopedMeetingId) {
        eventsQuery = eventsQuery.eq('id', scopedMeetingId)
      }
      if (meetingTitle) {
        eventsQuery = eventsQuery.ilike('title', `%${meetingTitle}%`)
      }
      if (dateAfter) {
        eventsQuery = eventsQuery.gte('start_time', dateAfter)
      }
      if (dateBefore) {
        eventsQuery = eventsQuery.lte('start_time', dateBefore)
      }

      const { data: events } = await eventsQuery
      const eventIds = (events ?? []).map((e: { id: string }) => e.id)

      // --- Summaries ---
      let summariesQuery = supabase
        .from('meeting_summaries')
        .select('*, calendar_event:calendar_events(id, title, start_time, end_time)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(40)

      if (eventIds.length > 0 && (meetingTitle || dateAfter || dateBefore || scopedMeetingId)) {
        summariesQuery = summariesQuery.in('calendar_event_id', eventIds)
      }

      const { data: summariesData } = await summariesQuery
      const ranked = rankSummaries((summariesData ?? []) as RetrievedSummary[], terms)
      const topSummaries = ranked.filter((r, i) => r.score > 0 || i < 3).slice(0, 5)

      const summaryMeetingIds = Array.from(
        new Set([
          ...topSummaries.map((r) => r.summary.calendar_event_id),
          ...(scopedMeetingId ? [scopedMeetingId] : []),
        ]),
      )

      // --- Chunks (detailed transcript/notes content) ---
      let chunksQuery = supabase
        .from('meeting_chunks')
        .select(
          '*, meeting_document:meeting_documents(id, title, document_type), calendar_event:calendar_events(id, title, start_time, end_time)',
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(120)

      if (summaryMeetingIds.length > 0) {
        chunksQuery = chunksQuery.in('calendar_event_id', summaryMeetingIds)
      }

      const { data: chunksData } = await chunksQuery
      const rankedChunks = rankChunks((chunksData ?? []) as RetrievedChunk[], terms)
      const topChunks = rankedChunks.filter((r, i) => r.score > 0 || i < 4).slice(0, 6)

      // --- Build structured output for the LLM ---
      const results = [
        ...topSummaries.map(({ summary }) => ({
          type: 'summary' as const,
          meetingTitle: summary.calendar_event.title,
          meetingTime: summary.calendar_event.start_time,
          summary: summary.summary,
          decisions: summary.decisions,
          actionItems: summary.action_items,
          openQuestions: summary.open_questions,
          participants: summary.participants,
          excerpt: excerptText(summary.summary),
        })),
        ...topChunks.map(({ chunk }) => ({
          type: 'chunk' as const,
          meetingTitle: chunk.calendar_event.title,
          meetingTime: chunk.calendar_event.start_time,
          documentTitle: chunk.meeting_document.title,
          documentType: chunk.meeting_document.document_type,
          content: chunk.content,
          excerpt: excerptText(chunk.content),
        })),
      ]

      // Always include matching calendar events so the LLM can answer
      // basic questions even when no notes/summaries have been uploaded
      const eventResults = (events ?? []).map((e: Record<string, unknown>) => ({
        type: 'event' as const,
        meetingTitle: e.title as string,
        meetingTime: e.start_time as string,
        endTime: e.end_time as string,
        organizer: e.organizer_email as string,
        attendees: e.attendees as unknown[],
        description: e.description as string | null,
      }))

      const allResults = [...eventResults, ...results]

      if (allResults.length === 0) {
        return { found: false, message: 'No meeting data found matching the query.', results: [] }
      }

      return { found: true, resultCount: allResults.length, results: allResults }
    },
  })
}
