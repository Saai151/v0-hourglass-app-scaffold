import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuditDetail } from '@/components/audit/audit-detail'

interface AuditPageProps {
  params: Promise<{ id: string }>
}

export default async function AuditPage({ params }: AuditPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch the audit with calendar event
  const { data: audit, error } = await supabase
    .from('meeting_audits')
    .select(`
      *,
      calendar_event:calendar_events(*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !audit) {
    notFound()
  }

  // Fetch meeting context separately — the table may not exist yet
  const { data: contextRows } = await supabase
    .from('meeting_contexts')
    .select('*')
    .eq('calendar_event_id', audit.calendar_event_id)
    .eq('user_id', user.id)
    .limit(1)

  const auditWithContext = {
    ...audit,
    meeting_context: contextRows ?? [],
  }

  return (
    <div className="flex flex-col h-full">
      <AuditDetail audit={auditWithContext} />
    </div>
  )
}
