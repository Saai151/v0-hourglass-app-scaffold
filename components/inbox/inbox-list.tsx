'use client'

import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  shorten: {
    label: 'Shorten',
    icon: MinusCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  asyncify: {
    label: 'Make Async',
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  delegate: {
    label: 'Delegate',
    icon: UserMinus,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  cancel: {
    label: 'Cancel',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  needs_context: {
    label: 'Needs Context',
    icon: HelpCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
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
  return (
    <div className="flex flex-col gap-4">
      {audits.map((audit) => {
        const event = audit.calendar_event
        const startDate = new Date(event.start_time)
        const endDate = new Date(event.end_time)
        const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
        const attendeeCount = event.attendees?.length || 0

        return (
          <Card key={audit.id} className="hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
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
