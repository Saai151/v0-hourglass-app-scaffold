'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HourglassIcon } from '@/components/icons'
import { TimeSavedHero } from '@/components/analytics/time-saved-hero'
import { VerdictBreakdown } from '@/components/analytics/verdict-breakdown'
import { WeeklyTrend } from '@/components/analytics/weekly-trend'
import { cn } from '@/lib/utils'
import { GoogleIcon, SlackIcon, WhatsAppIcon } from '@/components/icons'
import {
  Inbox,
  Calendar,
  MessageSquare,
  Clock,
  Users,
  ArrowRight,
  CheckCircle,
  MinusCircle,
  XCircle,
  HelpCircle,
  Clock4,
  Send,
  LogOut,
  MessageSquarePlus,
  ExternalLink,
  Link2,
  Mail,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type DemoTab = 'inbox' | 'meetings' | 'chat' | 'integrations'
type Verdict = 'keep' | 'shorten' | 'asyncify' | 'delegate' | 'cancel' | 'needs_context'

// ─── Dummy Data ──────────────────────────────────────────────────────────────

const DEMO_AUDITS = [
  {
    id: 'demo-1',
    verdict: 'shorten' as Verdict,
    rationale: 'This weekly sync could be reduced from 60 to 30 minutes based on typical agenda coverage and past meeting durations.',
    risks: ['May miss ad-hoc topics'],
    event: {
      title: 'Weekly Team Standup',
      start_time: '2026-04-06T10:00:00Z',
      end_time: '2026-04-06T11:00:00Z',
      attendees: 3,
      is_external: false,
    },
  },
  {
    id: 'demo-2',
    verdict: 'cancel' as Verdict,
    rationale: 'No agenda set, previous 3 occurrences ended early. Recommend cancelling and sending an async summary instead.',
    risks: ['Stakeholder may prefer face time'],
    event: {
      title: 'Project Status Update',
      start_time: '2026-04-06T14:00:00Z',
      end_time: '2026-04-06T14:30:00Z',
      attendees: 2,
      is_external: false,
    },
  },
  {
    id: 'demo-3',
    verdict: 'keep' as Verdict,
    rationale: 'External client meeting with clear agenda and decision points. High priority — keep as scheduled.',
    risks: [],
    event: {
      title: 'Q2 Planning with Initech',
      start_time: '2026-04-07T09:00:00Z',
      end_time: '2026-04-07T10:00:00Z',
      attendees: 4,
      is_external: true,
    },
  },
  {
    id: 'demo-4',
    verdict: 'asyncify' as Verdict,
    rationale: 'Design review feedback can be collected via a shared Figma comment thread instead of a synchronous meeting.',
    risks: ['Nuanced feedback may be lost'],
    event: {
      title: 'Design Review: Homepage Mockups',
      start_time: '2026-04-07T15:00:00Z',
      end_time: '2026-04-07T15:45:00Z',
      attendees: 3,
      is_external: false,
    },
  },
]

const DEMO_MEETINGS = {
  today: [
    {
      id: 'meet-1',
      title: 'Weekly Team Standup',
      start: '10:00 AM',
      end: '11:00 AM',
      duration: 60,
      attendees: 3,
      is_external: false,
      audit: { verdict: 'shorten' as Verdict, status: 'pending' as const },
    },
    {
      id: 'meet-2',
      title: 'Product Roadmap Review',
      start: '2:00 PM',
      end: '3:00 PM',
      duration: 60,
      attendees: 5,
      is_external: false,
      audit: { verdict: 'keep' as Verdict, status: 'approved' as const },
    },
  ],
  tomorrow: [
    {
      id: 'meet-3',
      title: 'Q2 Planning with Initech',
      start: '9:00 AM',
      end: '10:00 AM',
      duration: 60,
      attendees: 4,
      is_external: true,
      audit: null,
    },
    {
      id: 'meet-4',
      title: 'Design Review: Homepage Mockups',
      start: '3:00 PM',
      end: '3:45 PM',
      duration: 45,
      attendees: 3,
      is_external: false,
      audit: { verdict: 'asyncify' as Verdict, status: 'pending' as const },
    },
  ],
}

const DEMO_THREADS = [
  { id: 'thread-1', title: 'What were the action items from sprint retro?', scope: 'cross_meeting' as const, updated: '2 hours ago' },
  { id: 'thread-2', title: 'Summarize onboarding blockers discussed', scope: 'single_meeting' as const, updated: '1 day ago' },
  { id: 'thread-3', title: 'Who owns the API migration decision?', scope: 'cross_meeting' as const, updated: '2 days ago' },
]

const DEMO_MESSAGES: Record<string, { id: string; role: 'user' | 'assistant'; content: string }[]> = {
  'thread-1': [
    { id: 'msg-1a', role: 'user', content: 'What were the action items from the last sprint retro?' },
    {
      id: 'msg-1b',
      role: 'assistant',
      content: 'Based on the Sprint 14 Retrospective notes from April 2nd, here are the action items:\n\n1. **John Doe** — Set up automated test pipeline for the checkout flow (due April 9th)\n2. **Jordan Lee** — Create RFC for the new design system component library\n3. **Sam Patel** — Schedule stakeholder interviews for Q2 user research\n4. **Team** — Reduce standup duration from 30 to 15 minutes on a trial basis',
    },
  ],
  'thread-2': [
    { id: 'msg-2a', role: 'user', content: 'Can you summarize the onboarding blockers that were discussed?' },
    {
      id: 'msg-2b',
      role: 'assistant',
      content: 'From the Onboarding Sync on March 28th, here are the key blockers raised:\n\n1. **SSO setup delays** — IT hasn\'t provisioned SAML for the new hire cohort yet (owner: DevOps)\n2. **Documentation gaps** — The internal wiki is outdated for the payments module\n3. **Buddy program** — Only 2 of 5 new hires were assigned a buddy\n\nJordan Lee committed to following up with IT by EOW.',
    },
  ],
  'thread-3': [
    { id: 'msg-3a', role: 'user', content: 'Who owns the API migration decision? I can\'t remember which meeting this was discussed in.' },
    {
      id: 'msg-3b',
      role: 'assistant',
      content: 'The API migration was discussed across two meetings:\n\n1. **Architecture Review (March 25th)** — Ravi Sharma proposed migrating from REST to GraphQL for the dashboard endpoints. The team agreed to run a 2-week spike.\n2. **Engineering Leads Sync (April 1st)** — Dana Kim was formally assigned as the owner. Decision deadline is April 15th.\n\n**Owner: Dana Kim** with Ravi Sharma as the technical lead for the spike.',
    },
  ],
}

const DEMO_ANALYTICS = {
  hoursSaved: 4.5,
  meetingsActioned: 6,
  meetingsAudited: 12,
  verdictCounts: { keep: 3, shorten: 3, asyncify: 2, delegate: 1, cancel: 2, needs_context: 1 } as Record<Verdict, number>,
  weeklyTrend: [
    { day: 'Mon', hours: 0.5 },
    { day: 'Tue', hours: 1.0 },
    { day: 'Wed', hours: 0.5 },
    { day: 'Thu', hours: 1.5 },
    { day: 'Fri', hours: 1.0 },
    { day: 'Sat', hours: 0 },
    { day: 'Sun', hours: 0 },
  ],
}

const DEMO_INTEGRATIONS = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync your calendar events and let Hourglass analyze your meetings.',
    icon: 'calendar' as const,
    required: true,
    connected: true,
    email: 'john@acme.co',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Gather email context around meeting topics and attendees.',
    icon: 'mail' as const,
    required: false,
    connected: false,
    email: null,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Analyze relevant Slack conversations and send meeting updates.',
    icon: 'slack' as const,
    required: false,
    connected: true,
    email: 'acme.slack.com',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Receive approval requests and notifications via WhatsApp.',
    icon: 'whatsapp' as const,
    required: false,
    connected: false,
    email: null,
  },
]

// ─── Verdict Helpers ─────────────────────────────────────────────────────────

const verdictConfig: Record<Verdict, { label: string; icon: typeof CheckCircle; color: string; bgColor: string }> = {
  keep: { label: 'Keep', icon: CheckCircle, color: 'text-foreground', bgColor: 'bg-muted' },
  shorten: { label: 'Shorten', icon: MinusCircle, color: 'text-foreground', bgColor: 'bg-muted' },
  asyncify: { label: 'Make Async', icon: MessageSquare, color: 'text-foreground', bgColor: 'bg-muted' },
  delegate: { label: 'Delegate', icon: Users, color: 'text-foreground', bgColor: 'bg-muted' },
  cancel: { label: 'Cancel', icon: XCircle, color: 'text-foreground', bgColor: 'bg-muted' },
  needs_context: { label: 'Needs Context', icon: HelpCircle, color: 'text-muted-foreground', bgColor: 'bg-muted' },
}

function DemoVerdictBadge({ verdict }: { verdict: Verdict }) {
  const config = verdictConfig[verdict]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium border-0', config.color, config.bgColor)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  )
}

// ─── Demo Sidebar ────────────────────────────────────────────────────────────

const sidebarNav = [
  { id: 'inbox' as DemoTab, label: 'Inbox', icon: Inbox, badge: 4 },
  { id: 'meetings' as DemoTab, label: 'Meetings', icon: Calendar, badge: 0 },
  { id: 'chat' as DemoTab, label: 'Chat', icon: MessageSquare, badge: 0 },
  { id: 'integrations' as DemoTab, label: 'Integrations', icon: Link2, badge: 0 },
]

function DemoSidebar({ activeTab, onTabChange }: { activeTab: DemoTab; onTabChange: (tab: DemoTab) => void }) {
  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-border shrink-0">
      <div className="flex items-center h-14 px-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <HourglassIcon className="h-6 w-6 text-foreground flex-shrink-0" />
          <span className="font-semibold text-sm text-foreground">Hourglass</span>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2">
        <ul className="flex flex-col gap-1">
          {sidebarNav.map((item) => {
            const isActive = activeTab === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    'cursor-pointer flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] transition-all duration-200 ease-out text-left',
                    isActive
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className={cn('h-4 w-4', isActive ? 'text-foreground' : 'text-muted-foreground')} />
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-foreground truncate">John Doe</p>
          <p className="text-[11px] text-muted-foreground truncate">john@acme.co</p>
        </div>
        <div className="flex items-center gap-2.5 px-2 py-1.5 mt-1 text-muted-foreground">
          <LogOut className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Sign out</span>
        </div>
      </div>
    </aside>
  )
}

// ─── Mobile Tab Bar ──────────────────────────────────────────────────────────

function DemoTabBar({ activeTab, onTabChange }: { activeTab: DemoTab; onTabChange: (tab: DemoTab) => void }) {
  return (
    <div className="flex md:hidden border-b border-border">
      {sidebarNav.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={cn(
            'cursor-pointer flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
            activeTab === item.id
              ? 'text-foreground border-b-2 border-foreground'
              : 'text-muted-foreground'
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
          {item.badge > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Demo Inbox View ─────────────────────────────────────────────────────────

function DemoInboxView() {
  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold">Inbox</h1>
            <Badge variant="secondary" className="font-normal text-xs">4 pending</Badge>
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">Review AI recommendations</p>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-5 overflow-y-auto">
        <div className="grid gap-4 md:grid-cols-3">
          <TimeSavedHero
            hoursSaved={DEMO_ANALYTICS.hoursSaved}
            meetingsActioned={DEMO_ANALYTICS.meetingsActioned}
            meetingsAudited={DEMO_ANALYTICS.meetingsAudited}
          />
          <VerdictBreakdown counts={DEMO_ANALYTICS.verdictCounts} />
          <WeeklyTrend data={DEMO_ANALYTICS.weeklyTrend} />
        </div>

        <div className="flex flex-col gap-3">
          {DEMO_AUDITS.map((audit) => {
            const start = new Date(audit.event.start_time)
            const end = new Date(audit.event.end_time)
            const duration = Math.round((end.getTime() - start.getTime()) / 60_000)

            return (
              <Card key={audit.id} className="hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 ease-out">
                <CardHeader className="pb-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <DemoVerdictBadge verdict={audit.verdict} />
                        {audit.event.is_external && (
                          <Badge variant="outline" className="text-[10px]">External</Badge>
                        )}
                      </div>
                      <CardTitle className="text-sm truncate">{audit.event.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-0.5 text-xs">{audit.rationale}</CardDescription>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground shrink-0">
                      <p className="font-medium">{start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      <p>{start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {audit.event.attendees}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs cursor-default">
                      Review
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                  {audit.risks.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex flex-wrap gap-1">
                        {audit.risks.map((risk, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] font-normal">{risk}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Demo Meetings View ──────────────────────────────────────────────────────

function DemoMeetingsView() {
  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold">Meetings</h1>
            <Badge variant="secondary" className="font-normal text-xs">4 upcoming</Badge>
          </div>
          <Button variant="outline" size="sm" className="text-xs cursor-default">Sync calendar</Button>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-6 overflow-y-auto">
        {(['today', 'tomorrow'] as const).map((day) => (
          <div key={day}>
            <h2 className="text-xs font-medium text-muted-foreground mb-2.5 capitalize">
              {day === 'today' ? 'Today' : 'Tomorrow'}
            </h2>
            <div className="space-y-2.5">
              {DEMO_MEETINGS[day].map((meeting) => (
                <Card key={meeting.id} className="hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 ease-out">
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="text-[11px] text-muted-foreground w-16 shrink-0">
                          <p className="font-medium text-foreground">{meeting.start}</p>
                          <p>{meeting.end}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-medium text-sm truncate">{meeting.title}</h3>
                            {meeting.is_external && (
                              <Badge variant="outline" className="text-[10px]">External</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {meeting.duration} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {meeting.attendees}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {meeting.audit && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'gap-1 text-[10px]',
                              meeting.audit.status === 'approved' && 'text-foreground bg-muted border-border',
                              meeting.audit.status === 'pending' && 'text-muted-foreground bg-muted border-border'
                            )}
                          >
                            {meeting.audit.status === 'approved' ? (
                              <><CheckCircle className="h-2.5 w-2.5" /> Approved</>
                            ) : (
                              <><Clock4 className="h-2.5 w-2.5" /> Pending</>
                            )}
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-default">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 cursor-default">
                          Workspace
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Demo Chat View ──────────────────────────────────────────────────────────

function DemoChatView() {
  const [selectedThread, setSelectedThread] = useState('thread-1')
  const activeThread = DEMO_THREADS.find((t) => t.id === selectedThread) ?? DEMO_THREADS[0]
  const messages = DEMO_MESSAGES[selectedThread] ?? []

  return (
    <div className="flex h-full">
      {/* Thread sidebar */}
      <aside className="hidden lg:flex w-64 border-r bg-card flex-col shrink-0">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">Chats</h2>
              <p className="text-[11px] text-muted-foreground">Ask across all meeting notes</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[11px] cursor-default">
              <MessageSquarePlus className="h-3 w-3 mr-1" />
              New
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1.5">
            {DEMO_THREADS.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread.id)}
                className={cn(
                  'cursor-pointer rounded-xl border p-2.5 transition-all duration-200 ease-out w-full text-left',
                  selectedThread === thread.id
                    ? 'border-foreground/20 bg-muted'
                    : 'hover:bg-muted/50',
                )}
              >
                <p className="font-medium text-xs">{thread.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{thread.updated}</p>
                <Badge variant="secondary" className="mt-1.5 text-[10px]">
                  {thread.scope === 'single_meeting' ? 'Single meeting' : 'Cross meeting'}
                </Badge>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Conversation */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="border-b border-border bg-card px-5 py-3.5 shrink-0">
          <h1 className="text-sm font-semibold">{activeThread.title}</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            The assistant searches your uploaded meeting notes and summaries.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-3">
            {messages.map((message) => (
              <Card
                key={message.id}
                className={cn(message.role === 'assistant' ? 'bg-card' : 'bg-muted border-border')}
              >
                <CardHeader className="pb-2 p-3">
                  <CardTitle className="text-xs capitalize">{message.role}</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="border-t border-border bg-card px-5 py-3 shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            <Textarea
              placeholder="Ask a question about your meetings..."
              className="min-h-[70px] text-xs resize-none"
              disabled
            />
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                Results grounded in uploaded notes, transcripts, and summaries.
              </p>
              <Button size="sm" className="h-7 text-xs cursor-default" disabled>
                <Send className="h-3 w-3 mr-1.5" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Demo Integrations View ──────────────────────────────────────────────────

const integrationIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  calendar: ({ className }) => <Calendar className={className} />,
  mail: ({ className }) => <Mail className={className} />,
  slack: SlackIcon,
  whatsapp: WhatsAppIcon,
}

function DemoIntegrationsView() {
  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Integrations</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Connect your tools to give Hourglass more context</p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          {DEMO_INTEGRATIONS.map((integration) => {
            const Icon = integrationIconMap[integration.icon] || Calendar
            return (
              <Card
                key={integration.id}
                className={cn(
                  'transition-all duration-200 ease-out',
                  integration.connected && 'border-border bg-muted/30'
                )}
              >
                <CardHeader className="flex flex-row items-start gap-3 p-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    integration.connected ? 'bg-primary/15' : 'bg-muted'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{integration.name}</CardTitle>
                      {integration.required && (
                        <Badge variant="secondary" className="text-[10px]">Required</Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-0.5">{integration.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {integration.connected ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-foreground" />
                          <span className="text-xs text-foreground font-medium">Connected</span>
                          {integration.email && (
                            <span className="text-xs text-muted-foreground">as {integration.email}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not connected</span>
                      )}
                    </div>
                    {integration.connected ? (
                      <Button variant="ghost" size="sm" className="h-7 text-xs cursor-default">
                        Disconnect
                      </Button>
                    ) : (
                      <Button size="sm" className="h-7 text-xs gap-1.5 cursor-default">
                        <ExternalLink className="h-3 w-3" />
                        Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main Showcase ───────────────────────────────────────────────────────────

export function AppShowcase() {
  const [activeTab, setActiveTab] = useState<DemoTab>('inbox')

  return (
    <div className="rounded-xl border border-border shadow-lg overflow-hidden bg-card">
      {/* Mobile tab bar */}
      <DemoTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* App content */}
      <div className="flex h-[500px] md:h-[600px]">
        <DemoSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-hidden bg-background">
          {activeTab === 'inbox' && <DemoInboxView />}
          {activeTab === 'meetings' && <DemoMeetingsView />}
          {activeTab === 'chat' && <DemoChatView />}
          {activeTab === 'integrations' && <DemoIntegrationsView />}
        </div>
      </div>
    </div>
  )
}
