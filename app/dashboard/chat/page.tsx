import { generateId, type UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { MeetingChatConversation } from '@/components/meetings/meeting-chat'
import type { MeetingChatMessage } from '@/lib/types'

interface MeetingChatPageProps {
  searchParams: Promise<{
    threadId?: string
    meetingId?: string
  }>
}

function toUIMessages(rows: MeetingChatMessage[]): UIMessage[] {
  return rows
    .filter((row) => row.role === 'user' || row.role === 'assistant')
    .map((row) => ({
      id: row.id ?? generateId(),
      role: row.role as 'user' | 'assistant',
      parts: [{ type: 'text' as const, text: row.content }],
    }))
}

export default async function MeetingChatPage({ searchParams }: MeetingChatPageProps) {
  const { threadId, meetingId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: activeThread } = threadId
    ? await supabase
        .from('meeting_chat_threads')
        .select('*')
        .eq('id', threadId)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

  const [{ data: messages }, { data: focusedMeeting }] = await Promise.all([
    activeThread
      ? supabase
          .from('meeting_chat_messages')
          .select('*')
          .eq('thread_id', activeThread.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    meetingId
      ? supabase
          .from('calendar_events')
          .select('id, title')
          .eq('id', meetingId)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const uiMessages = toUIMessages((messages ?? []) as MeetingChatMessage[])

  const conversationKey = activeThread?.id ?? meetingId ?? 'new'

  return (
    <MeetingChatConversation
      key={conversationKey}
      activeThread={activeThread}
      initialMessages={uiMessages}
      focusedMeeting={focusedMeeting}
    />
  )
}
