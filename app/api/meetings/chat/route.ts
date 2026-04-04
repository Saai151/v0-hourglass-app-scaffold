import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { answerMeetingQuestion, retrieveMeetingContext } from '@/lib/meetings/service'
import type { MeetingChatRequest } from '@/lib/types'

function buildThreadTitle(message: string, meetingTitle?: string | null) {
  if (meetingTitle) {
    return `Chat about ${meetingTitle}`
  }

  const words = message.trim().split(/\s+/).slice(0, 6)
  return words.length > 0 ? words.join(' ') : 'Meeting chat'
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as MeetingChatRequest | null
  const message = body?.message?.trim()
  const meetingId = body?.meeting_id
  const threadId = body?.thread_id

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  let focusedMeeting: { id: string; title: string } | null = null
  if (meetingId) {
    const { data: meeting, error } = await supabase
      .from('calendar_events')
      .select('id, title')
      .eq('id', meetingId)
      .eq('user_id', user.id)
      .single()

    if (error || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    focusedMeeting = meeting
  }

  let thread: {
    id: string
    user_id: string
    title: string
    scope: 'single_meeting' | 'cross_meeting'
    calendar_event_id: string | null
  } | null = null

  if (threadId) {
    const { data: existingThread, error } = await supabase
      .from('meeting_chat_threads')
      .select('*')
      .eq('id', threadId)
      .eq('user_id', user.id)
      .single()

    if (error || !existingThread) {
      return NextResponse.json({ error: 'Chat thread not found' }, { status: 404 })
    }

    thread = existingThread
  } else {
    const { data: createdThread, error } = await supabase
      .from('meeting_chat_threads')
      .insert({
        user_id: user.id,
        title: buildThreadTitle(message, focusedMeeting?.title),
        scope: focusedMeeting ? 'single_meeting' : 'cross_meeting',
        calendar_event_id: focusedMeeting?.id ?? null,
      })
      .select()
      .single()

    if (error || !createdThread) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create chat thread' }, { status: 500 })
    }

    thread = createdThread
  }

  if (!thread) {
    return NextResponse.json({ error: 'Failed to initialize chat thread' }, { status: 500 })
  }

  const { data: previousMessages } = await supabase
    .from('meeting_chat_messages')
    .select('*')
    .eq('thread_id', thread.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(12)

  const { error: userMessageError } = await supabase
    .from('meeting_chat_messages')
    .insert({
      thread_id: thread.id,
      user_id: user.id,
      role: 'user',
      content: message,
      citations: [],
      retrieval_context: {},
    })

  if (userMessageError) {
    return NextResponse.json({ error: userMessageError.message }, { status: 500 })
  }

  const contexts = await retrieveMeetingContext({
    supabase,
    userId: user.id,
    message,
    meetingId: thread.calendar_event_id ?? meetingId,
  })

  const answer = await answerMeetingQuestion({
    message,
    thread,
    history: (previousMessages ?? []) as any[],
    contexts,
  })

  const { data: assistantMessage, error: assistantError } = await supabase
    .from('meeting_chat_messages')
    .insert({
      thread_id: thread.id,
      user_id: user.id,
      role: 'assistant',
      content: answer.answer,
      citations: answer.citations,
      retrieval_context: answer.retrievalContext,
    })
    .select()
    .single()

  if (assistantError || !assistantMessage) {
    return NextResponse.json(
      { error: assistantError?.message ?? 'Failed to save assistant response' },
      { status: 500 }
    )
  }

  await supabase
    .from('meeting_chat_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', thread.id)
    .eq('user_id', user.id)

  return NextResponse.json({
    thread,
    message: assistantMessage,
  })
}
