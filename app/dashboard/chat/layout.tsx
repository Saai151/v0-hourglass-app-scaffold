import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { MeetingChatSidebar } from '@/components/meetings/meeting-chat'
import { Skeleton } from '@/components/ui/skeleton'

function ChatSidebarSkeleton() {
  return (
    <aside className="hidden lg:flex w-80 border-r bg-card flex-col shrink-0">
      <div className="border-b px-5 py-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
      <div className="flex-1 p-3 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-24 mt-2" />
          </div>
        ))}
      </div>
    </aside>
  )
}

/** Async chunk so the sync layout shell paints immediately; children are not blocked by thread fetch. */
async function ChatSidebarData() {
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

  return <MeetingChatSidebar threads={threads ?? []} />
}

/**
 * Must stay synchronous: an async layout awaited DB before rendering *any* output,
 * so the conversation pane (children) waited on threads and the whole route flashed blank.
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0">
      <Suspense fallback={<ChatSidebarSkeleton />}>
        <ChatSidebarData />
      </Suspense>
      <div className="flex-1 flex flex-col min-h-0 min-w-0">{children}</div>
    </div>
  )
}
