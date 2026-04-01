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

  // Fetch the audit with calendar event and context
  const { data: audit, error } = await supabase
    .from('meeting_audits')
    .select(`
      *,
      calendar_event:calendar_events(*),
      meeting_context:meeting_contexts(*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !audit) {
    notFound()
  }

  return (
    <div className="flex flex-col h-full">
      <AuditDetail audit={audit} />
    </div>
  )
}
