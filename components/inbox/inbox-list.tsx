'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Calendar,
  Clock,
  Users,
  ArrowRight,
  CheckCircle,
  MinusCircle,
  MessageSquare,
  UserMinus,
  XCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Verdict = 'keep' | 'shorten' | 'asyncify' | 'delegate' | 'cancel' | 'needs_context'

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  attendees: { email: string; name?: string }[]
  is_external: boolean
}

interface MeetingAudit {
  id: string
  verdict: Verdict
  confidence: number
  rationale: string
  risks: string[]
  calendar_event: CalendarEvent
  created_at: string
}

interface InboxListProps {
  audits: MeetingAudit[]
}

const verdictConfig: Record<Verdict, { label: string; icon: typeof CheckCircle; color: string; bgColor: string }> = {
  keep: {
    label: 'Keep',
    icon: CheckCircle,
    color: 'text-foreground',
    bgColor: 'bg-muted',
  },
  shorten: {
    label: 'Shorten',
    icon: MinusCircle,
    color: 'text-foreground',
    bgColor: 'bg-muted',
  },
  asyncify: {
    label: 'Make Async',
    icon: MessageSquare,
    color: 'text-foreground',
    bgColor: 'bg-muted',
  },
  delegate: {
    label: 'Delegate',
    icon: UserMinus,
    color: 'text-foreground',
    bgColor: 'bg-muted',
  },
  cancel: {
    label: 'Cancel',
    icon: XCircle,
    color: 'text-foreground',
    bgColor: 'bg-muted',
  },
  needs_context: {
    label: 'Needs Context',
    icon: HelpCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const config = verdictConfig[verdict]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 font-medium', config.color, config.bgColor, 'border-0')}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  )
}

export function InboxList({ audits }: InboxListProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isBulkApproving, setIsBulkApproving] = useState(false)
  const [isBulkRejecting, setIsBulkRejecting] = useState(false)

  const allSelected = selected.size === audits.length && audits.length > 0
  const someSelected = selected.size > 0

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(audits.map((a) => a.id)))
    }
  }

  async function handleBulkApprove() {
    if (selected.size === 0) return
    setIsBulkApproving(true)
    const supabase = createClient()

    const ids = Array.from(selected)
    const { error } = await supabase
      .from('meeting_audits')
      .update({
        status: 'approved',
        approved_via: 'web',
        approved_at: new Date().toISOString(),
      })
      .in('id', ids)

    if (error) {
      toast.error('Failed to approve audits.')
    } else {
      toast.success(`${ids.length} audit${ids.length > 1 ? 's' : ''} approved!`)
      setSelected(new Set())
      router.refresh()
    }
    setIsBulkApproving(false)
  }

  async function handleBulkReject() {
    if (selected.size === 0) return
    setIsBulkRejecting(true)
    const supabase = createClient()

    const ids = Array.from(selected)
    const { error } = await supabase
      .from('meeting_audits')
      .update({ status: 'rejected' })
      .in('id', ids)

    if (error) {
      toast.error('Failed to reject audits.')
    } else {
      toast.success(`${ids.length} audit${ids.length > 1 ? 's' : ''} rejected.`)
      setSelected(new Set())
      router.refresh()
    }
    setIsBulkRejecting(false)
  }

  const isBulkActioning = isBulkApproving || isBulkRejecting

  return (
    <div className="flex flex-col gap-4">
      {/* Bulk actions bar — fixed height to prevent layout shift */}
      <div className="flex items-center justify-between h-9">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {allSelected ? 'Deselect all' : 'Select all'}
          </span>
        </label>
        {someSelected && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selected.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkReject}
              disabled={isBulkActioning}
              className="gap-2"
            >
              {isBulkRejecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {isBulkRejecting ? 'Rejecting...' : `Reject ${selected.size}`}
            </Button>
            <Button
              size="sm"
              onClick={handleBulkApprove}
              disabled={isBulkActioning}
              className="gap-2"
            >
              {isBulkApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {isBulkApproving ? 'Approving...' : `Approve ${selected.size}`}
            </Button>
          </div>
        )}
      </div>

      {audits.map((audit) => {
        const event = audit.calendar_event
        const startDate = new Date(event.start_time)
        const endDate = new Date(event.end_time)
        const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
        const attendeeCount = event.attendees?.length || 0
        const isSelected = selected.has(audit.id)

        return (
          <Card
            key={audit.id}
            className={cn(
              'hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 ease-out',
              isSelected && 'border-foreground/20 bg-muted',
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(audit.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <VerdictBadge verdict={audit.verdict} />
                      {event.is_external && (
                        <Badge variant="outline" className="text-xs">External</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg truncate">{event.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {audit.rationale}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p className="font-medium">{format(startDate, 'MMM d, yyyy')}</p>
                  <p>{format(startDate, 'h:mm a')}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {duration} min
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {attendeeCount} {attendeeCount === 1 ? 'attendee' : 'attendees'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatDistanceToNow(startDate, { addSuffix: true })}
                  </span>
                </div>
                <Button asChild variant="ghost" size="sm" className="gap-2">
                  <Link href={`/dashboard/audit/${audit.id}`}>
                    Review
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {audit.risks && audit.risks.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1.5">Potential risks:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {audit.risks.slice(0, 3).map((risk, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-normal">
                        {risk}
                      </Badge>
                    ))}
                    {audit.risks.length > 3 && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        +{audit.risks.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
