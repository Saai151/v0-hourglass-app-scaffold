import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MeetingWorkspace } from '@/components/meetings/meeting-workspace'

interface MeetingWorkspacePageProps {
  params: Promise<{ id: string }>
}

export default async function MeetingWorkspacePage({ params }: MeetingWorkspacePageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const [{ data: event }, { data: documents }, { data: summary }, { data: audit }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('meeting_documents')
      .select('*')
      .eq('calendar_event_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('meeting_summaries')
      .select('*')
      .eq('calendar_event_id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('meeting_audits')
      .select('verdict, status')
      .eq('calendar_event_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!event) {
    notFound()
  }

  return (
    <MeetingWorkspace
      event={event}
      audit={audit}
      documents={documents ?? []}
      summary={summary}
    />
  )
}
