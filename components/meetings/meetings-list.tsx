'use client'

import Link from 'next/link'
import { format, isToday, isTomorrow, startOfDay } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Clock, 
  Users, 
  ExternalLink,
  ArrowRight,
  CheckCircle,
  Clock4,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Verdict = 'keep' | 'shorten' | 'asyncify' | 'delegate' | 'cancel' | 'needs_context'
type AuditStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'expired'

interface MeetingAudit {
  id: string
  verdict: Verdict
  status: AuditStatus
}

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  attendees: { email: string; name?: string }[]
  meeting_url?: string
  is_external: boolean
  meeting_audit?: MeetingAudit[]
}

interface MeetingsListProps {
  events: CalendarEvent[]
}

function groupEventsByDay(events: CalendarEvent[]) {
  const groups: Record<string, CalendarEvent[]> = {}
  
  events.forEach(event => {
    const day = startOfDay(new Date(event.start_time)).toISOString()
    if (!groups[day]) {
      groups[day] = []
    }
    groups[day].push(event)
  })
  
  return groups
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'EEEE, MMMM d')
}

export function MeetingsList({ events }: MeetingsListProps) {
  const groupedEvents = groupEventsByDay(events)
  const sortedDays = Object.keys(groupedEvents).sort()

  return (
    <div className="space-y-8">
      {sortedDays.map(day => (
        <div key={day}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            {getDayLabel(day)}
          </h2>
          <div className="space-y-3">
            {groupedEvents[day].map(event => {
              const startDate = new Date(event.start_time)
              const endDate = new Date(event.end_time)
              const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
              const attendeeCount = event.attendees?.length || 0
              const audit = event.meeting_audit?.[0]

              return (
                <Card key={event.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        {/* Time column */}
                        <div className="text-sm text-muted-foreground w-20 flex-shrink-0">
                          <p className="font-medium text-foreground">{format(startDate, 'h:mm a')}</p>
                          <p>{format(endDate, 'h:mm a')}</p>
                        </div>

                        {/* Event details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{event.title}</h3>
                            {event.is_external && (
                              <Badge variant="outline" className="text-xs">External</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {duration} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {attendeeCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center gap-2">
                        {audit && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'gap-1',
                              audit.status === 'approved' && 'text-green-600 bg-green-50 border-green-200',
                              audit.status === 'pending' && 'text-amber-600 bg-amber-50 border-amber-200'
                            )}
                          >
                            {audit.status === 'approved' ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                Approved
                              </>
                            ) : audit.status === 'pending' ? (
                              <>
                                <Clock4 className="h-3 w-3" />
                                Pending review
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3" />
                                {audit.status}
                              </>
                            )}
                          </Badge>
                        )}
                        {event.meeting_url && (
                          <Button asChild variant="ghost" size="sm">
                            <a href={event.meeting_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/meetings/${event.id}`}>
                            Workspace
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
