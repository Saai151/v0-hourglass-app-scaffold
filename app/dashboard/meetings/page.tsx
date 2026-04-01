import { createClient } from '@/lib/supabase/server'
import { MeetingsHeader } from '@/components/meetings/meetings-header'
import { MeetingsList } from '@/components/meetings/meetings-list'
import { MeetingsEmptyState } from '@/components/meetings/meetings-empty-state'

export default async function MeetingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch upcoming calendar events
  const { data: events } = await supabase
    .from('calendar_events')
    .select(`
      *,
      meeting_audit:meeting_audits(id, verdict, status)
    `)
    .eq('user_id', user.id)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(50)

  const eventCount = events?.length || 0

  return (
    <div className="flex flex-col h-full">
      <MeetingsHeader eventCount={eventCount} />
      
      <div className="flex-1 p-6">
        {eventCount === 0 ? (
          <MeetingsEmptyState />
        ) : (
          <MeetingsList events={events || []} />
        )}
      </div>
    </div>
  )
}
