import { createClient } from '@/lib/supabase/server'
import { MeetingChat } from '@/components/meetings/meeting-chat'

interface MeetingChatPageProps {
  searchParams: Promise<{
    threadId?: string
    meetingId?: string
  }>
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

  const { data: threads } = await supabase
    .from('meeting_chat_threads')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(25)

  const activeThread =
    threads?.find((thread) => thread.id === threadId) ??
    threads?.[0] ??
    null

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

  return (
    <MeetingChat
      threads={threads ?? []}
      activeThread={activeThread}
      initialMessages={messages ?? []}
      focusedMeeting={focusedMeeting}
    />
  )
}
