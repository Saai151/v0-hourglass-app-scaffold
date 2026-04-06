import { createClient } from '@/lib/supabase/server'
import { startOfWeek, endOfWeek, format, eachDayOfInterval } from 'date-fns'
import { InboxList } from '@/components/inbox/inbox-list'
import { InboxHeader } from '@/components/inbox/inbox-header'
import { InboxEmptyState } from '@/components/inbox/inbox-empty-state'
import { TimeSavedHero } from '@/components/analytics/time-saved-hero'
import { VerdictBreakdown } from '@/components/analytics/verdict-breakdown'
import { WeeklyTrend } from '@/components/analytics/weekly-trend'
import type { AuditVerdict } from '@/lib/types'

const TIME_SAVED_MULTIPLIER: Record<AuditVerdict, number> = {
  cancel: 1,
  asyncify: 1,
  delegate: 1,
  shorten: 0.5,
  keep: 0,
  needs_context: 0,
}

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  // Fetch pending audits (inbox) and actioned audits (analytics) in parallel
  const [{ data: pendingAudits }, { data: actionedAudits }] = await Promise.all([
    supabase
      .from('meeting_audits')
      .select(`*, calendar_event:calendar_events(*)`)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('meeting_audits')
      .select(`*, calendar_event:calendar_events(*)`)
      .eq('user_id', user.id)
      .in('status', ['approved', 'executed'])
      .gte('approved_at', weekStart.toISOString())
      .lte('approved_at', weekEnd.toISOString()),
  ])

  const pendingCount = pendingAudits?.length || 0

  // Compute analytics from actioned audits
  let totalMinutesSaved = 0
  const verdictCounts: Record<AuditVerdict, number> = {
    keep: 0, shorten: 0, asyncify: 0, delegate: 0, cancel: 0, needs_context: 0,
  }
  const dayMinutes: Record<string, number> = {}

  for (const audit of actionedAudits || []) {
    const event = audit.calendar_event
    if (!event) continue

    const start = new Date(event.start_time).getTime()
    const end = new Date(event.end_time).getTime()
    const durationMin = Math.round((end - start) / 60_000)
    const verdict = audit.verdict as AuditVerdict
    const multiplier = TIME_SAVED_MULTIPLIER[verdict] ?? 0
    const savedMin = durationMin * multiplier

    totalMinutesSaved += savedMin
    verdictCounts[verdict] = (verdictCounts[verdict] || 0) + 1

    if (audit.approved_at) {
      const dayKey = format(new Date(audit.approved_at), 'EEE')
      dayMinutes[dayKey] = (dayMinutes[dayKey] || 0) + savedMin
    }
  }

  const hoursSaved = totalMinutesSaved / 60
  const meetingsActioned = actionedAudits?.length || 0
  const meetingsAudited = meetingsActioned + pendingCount

  // Build weekly trend data
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const trendData = weekDays.map((day) => {
    const dayKey = format(day, 'EEE')
    return { day: dayKey, hours: Math.round(((dayMinutes[dayKey] || 0) / 60) * 10) / 10 }
  })

  return (
    <div className="flex flex-col h-full">
      <InboxHeader pendingCount={pendingCount} />

      <div className="flex-1 p-6 space-y-6">
        {/* Analytics section */}
        <div className="grid gap-4 md:grid-cols-3">
          <TimeSavedHero
            hoursSaved={hoursSaved}
            meetingsActioned={meetingsActioned}
            meetingsAudited={meetingsAudited}
          />
          <VerdictBreakdown counts={verdictCounts} />
          <WeeklyTrend data={trendData} />
        </div>

        {/* Inbox section */}
        {pendingCount === 0 ? (
          <InboxEmptyState />
        ) : (
          <InboxList audits={pendingAudits || []} />
        )}
      </div>
    </div>
  )
}
