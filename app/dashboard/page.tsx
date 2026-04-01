import { createClient } from '@/lib/supabase/server'
import { InboxList } from '@/components/inbox/inbox-list'
import { InboxHeader } from '@/components/inbox/inbox-header'
import { InboxEmptyState } from '@/components/inbox/inbox-empty-state'

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch pending audits with their calendar events
  const { data: audits } = await supabase
    .from('meeting_audits')
    .select(`
      *,
      calendar_event:calendar_events(*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const pendingCount = audits?.length || 0

  return (
    <div className="flex flex-col h-full">
      <InboxHeader pendingCount={pendingCount} />
      
      <div className="flex-1 p-6">
        {pendingCount === 0 ? (
          <InboxEmptyState />
        ) : (
          <InboxList audits={audits || []} />
        )}
      </div>
    </div>
  )
}
