'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Mail,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Verdict = 'keep' | 'shorten' | 'asyncify' | 'delegate' | 'cancel' | 'needs_context'
type AuditStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'expired'

interface CalendarEvent {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  attendees: { email: string; name?: string }[]
  organizer_email: string
  meeting_url?: string
  is_external: boolean
}

interface MeetingContext {
  email_summary?: string
  slack_summary?: string
  agenda_detected: boolean
  decision_owner?: string
}

interface MeetingAudit {
  id: string
  verdict: Verdict
  confidence: number
  rationale: string
  risks: string[]
  approval_message: string
  draft_email?: string
  draft_slack_message?: string
  proposed_actions: { type: string; description: string }[]
  status: AuditStatus
  calendar_event: CalendarEvent
  meeting_context?: MeetingContext[]
}

interface AuditDetailProps {
  audit: MeetingAudit
}

const verdictLabels: Record<Verdict, string> = {
  keep: 'Keep Meeting',
  shorten: 'Shorten Meeting',
  asyncify: 'Convert to Async',
  delegate: 'Delegate Meeting',
  cancel: 'Cancel Meeting',
  needs_context: 'Needs More Context',
}

const verdictColors: Record<Verdict, string> = {
  keep: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  shorten: 'bg-amber-50 text-amber-700 border-amber-200',
  asyncify: 'bg-blue-50 text-blue-700 border-blue-200',
  delegate: 'bg-violet-50 text-violet-700 border-violet-200',
  cancel: 'bg-red-50 text-red-700 border-red-200',
  needs_context: 'bg-muted text-muted-foreground border-border',
}

export function AuditDetail({ audit }: AuditDetailProps) {
  const router = useRouter()
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const event = audit.calendar_event
  const context = audit.meeting_context?.[0]
  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
  const attendeeCount = event.attendees?.length || 0
  const confidencePercent = Math.round((audit.confidence || 0) * 100)

  async function handleApprove() {
    setIsApproving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('meeting_audits')
      .update({
        status: 'approved',
        approved_via: 'web',
        approved_at: new Date().toISOString(),
      })
      .eq('id', audit.id)

    if (error) {
      setIsApproving(false)
      return
    }

    // Execute the calendar action (cancel, shorten, etc.)
    try {
      const res = await fetch(`/api/audits/${audit.id}/execute`, { method: 'POST' })
      const data = await res.json()

      if (data.executed) {
        toast.success(`Action executed: ${audit.verdict}`, {
          description: data.result?.action === 'shortened'
            ? `Meeting shortened from ${data.result.originalMinutes}min to ${data.result.newMinutes}min`
            : `Calendar event has been updated`,
        })
      } else if (data.message) {
        toast.info(data.message)
      } else if (data.error) {
        toast.error('Execution failed', { description: data.error })
      }
    } catch {
      toast.error('Could not execute calendar action')
    }

    router.push('/dashboard')
    router.refresh()
    setIsApproving(false)
  }

  async function handleReject() {
    setIsRejecting(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('meeting_audits')
      .update({ status: 'rejected' })
      .eq('id', audit.id)

    if (!error) {
      router.push('/dashboard')
      router.refresh()
    }
    setIsRejecting(false)
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  function openMailto() {
    const to = event.attendees
      ?.filter((a) => a.email !== event.organizer_email)
      .map((a) => a.email)
      .join(',') || ''
    const subject = encodeURIComponent(`Re: ${event.title}`)
    const body = encodeURIComponent(audit.draft_email || '')
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_self')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="border-b border-border bg-card px-8 py-5">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <Badge className={cn('font-medium', verdictColors[audit.verdict])}>
                {verdictLabels[audit.verdict]}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {confidencePercent}% confidence
              </Badge>
              {event.is_external && (
                <Badge variant="secondary">External</Badge>
              )}
            </div>
            <h1 className="text-xl font-semibold">{event.title}</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8 space-y-8">
          {/* Meeting Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meeting Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{duration} minutes</p>
                    <p className="text-sm text-muted-foreground">Duration</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{attendeeCount} attendees</p>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {event.attendees?.slice(0, 2).map(a => a.name || a.email).join(', ')}
                      {attendeeCount > 2 && ` +${attendeeCount - 2} more`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">{event.organizer_email}</p>
                    <p className="text-sm text-muted-foreground">Organizer</p>
                  </div>
                </div>
              </div>
              {event.meeting_url && (
                <div className="mt-4 pt-4 border-t">
                  <Button asChild variant="outline" size="sm">
                    <a href={event.meeting_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join meeting
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-foreground" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Rationale</h4>
                <p className="text-sm text-muted-foreground">{audit.rationale}</p>
              </div>

              {audit.risks && audit.risks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    Potential Risks
                  </h4>
                  <ul className="space-y-1">
                    {audit.risks.map((risk, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-muted-foreground mt-1.5">•</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {audit.proposed_actions && audit.proposed_actions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Proposed Actions</h4>
                  <ul className="space-y-2">
                    {audit.proposed_actions.map((action, i) => (
                      <li key={i} className="text-sm bg-muted/50 rounded-lg p-3">
                        <p className="font-medium">{action.type}</p>
                        <p className="text-muted-foreground">{action.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Draft Messages */}
          {(audit.draft_email || audit.draft_slack_message) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Draft Messages</CardTitle>
                <CardDescription>
                  Edit and customize before sending
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="email">
                  <TabsList>
                    {audit.draft_email && (
                      <TabsTrigger value="email" className="gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </TabsTrigger>
                    )}
                    {audit.draft_slack_message && (
                      <TabsTrigger value="slack" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Slack
                      </TabsTrigger>
                    )}
                  </TabsList>
                  
                  {audit.draft_email && (
                    <TabsContent value="email" className="mt-4 space-y-3">
                      <div className="relative">
                        <Textarea
                          defaultValue={audit.draft_email}
                          className="min-h-[150px] pr-12"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(audit.draft_email!, 'email')}
                        >
                          {copiedField === 'email' ? (
                            <Check className="h-4 w-4 text-foreground" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button onClick={openMailto} className="gap-2">
                        <Send className="h-4 w-4" />
                        Send Email to Attendees
                      </Button>
                    </TabsContent>
                  )}
                  
                  {audit.draft_slack_message && (
                    <TabsContent value="slack" className="mt-4">
                      <div className="relative">
                        <Textarea
                          defaultValue={audit.draft_slack_message}
                          className="min-h-[150px] pr-12"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(audit.draft_slack_message!, 'slack')}
                        >
                          {copiedField === 'slack' ? (
                            <Check className="h-4 w-4 text-foreground" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Context */}
          {context && (context.email_summary || context.slack_summary) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gathered Context</CardTitle>
                <CardDescription>
                  Information collected from your connected accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {context.email_summary && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Summary
                    </h4>
                    <p className="text-sm text-muted-foreground">{context.email_summary}</p>
                  </div>
                )}
                {context.slack_summary && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Slack Summary
                    </h4>
                    <p className="text-sm text-muted-foreground">{context.slack_summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Action Bar */}
      {audit.status === 'pending' && (
        <div className="border-t border-border bg-card px-8 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {audit.approval_message || 'Do you approve this recommendation?'}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={isRejecting || isApproving}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {isRejecting ? 'Rejecting...' : 'Reject'}
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isApproving ? 'Approving...' : 'Approve & Execute'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
