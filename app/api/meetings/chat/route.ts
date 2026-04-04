import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { chatModel } from '@/lib/ai/client'
import { createFetchMeetingDataTool } from '@/lib/tools/fetch-meeting-data'
import {
  isMissingMeetingChatSchemaError,
  missingMeetingChatSchemaResponse,
} from '@/lib/meetings/errors'

export const maxDuration = 60

function buildThreadTitle(message: string, meetingTitle?: string | null) {
  if (meetingTitle) {
    return `Chat about ${meetingTitle}`
  }
  const words = message.trim().split(/\s+/).slice(0, 6)
  return words.length > 0 ? words.join(' ') : 'Meeting chat'
}

function firstUserText(messages: UIMessage[]): string {
  const last = messages.findLast((m) => m.role === 'user')
  if (!last) return ''
  const textPart = last.parts.find((p) => p.type === 'text')
  return textPart?.type === 'text' ? textPart.text : ''
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const url = new URL(request.url)
  const threadId = url.searchParams.get('threadId')
  const meetingId = url.searchParams.get('meetingId')

  const body = await request.json().catch(() => null)
  const messages: UIMessage[] = body?.messages ?? []
  const userText = firstUserText(messages)

  if (!userText) {
    return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 })
  }

  // --- Resolve focused meeting ---
  let focusedMeeting: { id: string; title: string } | null = null
  if (meetingId) {
    const { data: meeting, error } = await supabase
      .from('calendar_events')
      .select('id, title')
      .eq('id', meetingId)
      .eq('user_id', user.id)
      .single()

    if (error || !meeting) {
      return new Response(JSON.stringify({ error: 'Meeting not found' }), { status: 404 })
    }
    focusedMeeting = meeting
  }

  // --- Resolve or create thread ---
  let thread: {
    id: string
    user_id: string
    title: string
    scope: 'single_meeting' | 'cross_meeting'
    calendar_event_id: string | null
  } | null = null

  if (threadId) {
    const { data: existing, error } = await supabase
      .from('meeting_chat_threads')
      .select('*')
      .eq('id', threadId)
      .eq('user_id', user.id)
      .single()

    if (error || !existing) {
      if (isMissingMeetingChatSchemaError(error)) return missingMeetingChatSchemaResponse()
      return new Response(JSON.stringify({ error: 'Chat thread not found' }), { status: 404 })
    }
    thread = existing
  } else {
    const { data: created, error } = await supabase
      .from('meeting_chat_threads')
      .insert({
        user_id: user.id,
        title: buildThreadTitle(userText, focusedMeeting?.title),
        scope: focusedMeeting ? 'single_meeting' : 'cross_meeting',
        calendar_event_id: focusedMeeting?.id ?? null,
      })
      .select()
      .single()

    if (error || !created) {
      if (isMissingMeetingChatSchemaError(error)) return missingMeetingChatSchemaResponse()
      return new Response(
        JSON.stringify({ error: error?.message ?? 'Failed to create chat thread' }),
        { status: 500 },
      )
    }
    thread = created
  }

  if (!thread) {
    return new Response(JSON.stringify({ error: 'Failed to initialize chat thread' }), {
      status: 500,
    })
  }

  // --- Persist user message ---
  const { error: userMsgErr } = await supabase.from('meeting_chat_messages').insert({
    thread_id: thread.id,
    user_id: user.id,
    role: 'user',
    content: userText,
    citations: [],
    retrieval_context: {},
  })

  if (userMsgErr) {
    if (isMissingMeetingChatSchemaError(userMsgErr)) return missingMeetingChatSchemaResponse()
    return new Response(JSON.stringify({ error: userMsgErr.message }), { status: 500 })
  }

  // --- Build tools ---
  const scopedMeetingId = thread.calendar_event_id ?? meetingId
  const tools = {
    fetchMeetingData: createFetchMeetingDataTool(supabase, user.id, scopedMeetingId),
  }

  const systemPrompt = [
    'You are Hourglass, a meeting assistant that helps users recall decisions, action items, and details from their meetings.',
    'When the user asks about meetings, decisions, action items, attendees, transcripts, or anything related to their meeting history, use the fetchMeetingData tool to retrieve relevant data before answering.',
    'When the user asks general questions unrelated to meetings, respond directly without calling any tools.',
    'Be concise and helpful. If the tool returns no results, let the user know you could not find matching meeting data.',
    thread.scope === 'single_meeting' && thread.calendar_event_id
      ? `This conversation is scoped to a single meeting (ID: ${thread.calendar_event_id}).`
      : 'This conversation spans all of the user\'s meetings.',
  ]
    .filter(Boolean)
    .join(' ')

  // --- Stream response ---
  const result = streamText({
    model: chatModel,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(4),
    onFinish: async ({ text }) => {
      if (!text) return

      await supabase.from('meeting_chat_messages').insert({
        thread_id: thread.id,
        user_id: user.id,
        role: 'assistant',
        content: text,
        citations: [],
        retrieval_context: { streamed: true },
      })

      await supabase
        .from('meeting_chat_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', thread.id)
        .eq('user_id', user.id)
    },
  })

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === 'start') {
        return { threadId: thread.id }
      }
    },
  })
}
