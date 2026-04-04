import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addDays, setHours, setMinutes } from 'date-fns'

/**
 * POST /api/events/seed
 *
 * Seeds realistic mock calendar events for the authenticated user.
 * Designed so that every Hourglass verdict type gets exercised.
 *
 * This is a development / demo endpoint. In production, events come
 * from the Google Calendar sync pipeline instead.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = user.email ?? 'you@company.com'
  const now = new Date()

  // Helper: create a date at a specific hour on a future day
  const at = (daysFromNow: number, hour: number, minute = 0) =>
    setMinutes(setHours(addDays(now, daysFromNow), hour), minute).toISOString()

  const mockEvents = [
    {
      provider_event_id: 'seed-weekly-standup',
      title: 'Weekly Team Standup',
      description:
        'Share updates on current sprint work. Each person gives a 2-minute status update.',
      organizer_email: userEmail,
      attendees: [
        { email: userEmail, name: 'You' },
        { email: 'alice@company.com', name: 'Alice Chen' },
        { email: 'bob@company.com', name: 'Bob Patel' },
        { email: 'carol@company.com', name: 'Carol Wu' },
        { email: 'dave@company.com', name: 'Dave Kim' },
        { email: 'eve@company.com', name: 'Eve Johansson' },
        { email: 'frank@company.com', name: 'Frank Liu' },
        { email: 'grace@company.com', name: 'Grace Okafor' },
      ],
      start_time: at(1, 9, 0),
      end_time: at(1, 9, 30),
      meeting_url: 'https://meet.google.com/abc-defg-hij',
      is_external: false,
    },
    {
      provider_event_id: 'seed-q2-planning',
      title: 'Q2 Planning: OKR Alignment & Roadmap',
      description:
        'Review Q1 results and finalize Q2 OKRs. Decision needed on resource allocation for the infra migration vs. new feature work. VP of Eng will attend.',
      organizer_email: 'vp-eng@company.com',
      attendees: [
        { email: userEmail, name: 'You' },
        { email: 'vp-eng@company.com', name: 'Sarah Martinez (VP Eng)' },
        { email: 'alice@company.com', name: 'Alice Chen' },
        { email: 'pm-lead@company.com', name: 'James Park (PM Lead)' },
      ],
      start_time: at(2, 14, 0),
      end_time: at(2, 15, 0),
      meeting_url: 'https://meet.google.com/klm-nopq-rst',
      is_external: false,
    },
    {
      provider_event_id: 'seed-design-review',
      title: 'Design Review: Homepage Redesign',
      description:
        'Walk through the latest Figma mockups for the homepage. Collect feedback from eng on feasibility.',
      organizer_email: 'design-lead@company.com',
      attendees: [
        { email: userEmail, name: 'You' },
        { email: 'design-lead@company.com', name: 'Priya Sharma' },
        { email: 'fe-lead@company.com', name: 'Tom Nguyen' },
      ],
      start_time: at(2, 10, 0),
      end_time: at(2, 11, 0),
      meeting_url: 'https://meet.google.com/uvw-xyza-bcd',
      is_external: false,
    },
    {
      provider_event_id: 'seed-1on1-alex',
      title: '1:1 with Alex (Direct Report)',
      description: 'Weekly check-in. Career growth discussion and blocker review.',
      organizer_email: userEmail,
      attendees: [
        { email: userEmail, name: 'You' },
        { email: 'alex@company.com', name: 'Alex Rivera' },
      ],
      start_time: at(1, 14, 0),
      end_time: at(1, 14, 30),
      is_external: false,
    },
    {
      provider_event_id: 'seed-vendor-demo',
      title: 'Vendor Demo: DataSync Analytics Platform',
      description:
        'Sales demo from DataSync. They want to show their analytics product. No decision needed — just evaluating.',
      organizer_email: 'sales@datasync.io',
      attendees: [
        { email: userEmail, name: 'You' },
        { email: 'sales@datasync.io', name: 'Jordan Lee (DataSync)' },
        { email: 'ae@datasync.io', name: 'Morgan Blake (DataSync)' },
        { email: 'procurement@company.com', name: 'Raj Gupta (Procurement)' },
      ],
      start_time: at(3, 11, 0),
      end_time: at(3, 12, 0),
      meeting_url: 'https://zoom.us/j/123456789',
      is_external: true,
    },
    {
      provider_event_id: 'seed-marketing-sync',
      title: 'Recurring: Cross-Team Marketing Sync',
      description: '',
      organizer_email: 'marketing@company.com',
      attendees: [
        { email: userEmail, name: 'You' },
        { email: 'marketing@company.com', name: 'Lisa Tran' },
        { email: 'content@company.com', name: 'Mike Davis' },
        { email: 'brand@company.com', name: 'Nina Rossi' },
        { email: 'social@company.com', name: 'Omar Hassan' },
        { email: 'events@company.com', name: 'Pat Kelly' },
      ],
      start_time: at(3, 16, 0),
      end_time: at(3, 17, 0),
      meeting_url: 'https://meet.google.com/efg-hijk-lmn',
      is_external: false,
    },
    {
      provider_event_id: 'seed-allhands',
      title: 'Company All-Hands (Monthly)',
      description:
        'CEO shares company updates, metrics, and Q&A. Recording will be available afterward.',
      organizer_email: 'ceo@company.com',
      attendees: Array.from({ length: 45 }, (_, i) => ({
        email: `employee${i + 1}@company.com`,
        name: `Employee ${i + 1}`,
      })),
      start_time: at(4, 10, 0),
      end_time: at(4, 11, 0),
      meeting_url: 'https://meet.google.com/opq-rstu-vwx',
      is_external: false,
    },
  ]

  // Upsert so re-running the seed is idempotent
  const results = []
  for (const event of mockEvents) {
    const { data, error } = await supabase
      .from('calendar_events')
      .upsert(
        {
          user_id: user.id,
          ...event,
          attendees: event.attendees,
          raw_payload: {},
        },
        { onConflict: 'user_id,provider_event_id' }
      )
      .select('id, title')
      .single()

    results.push(
      error
        ? { title: event.title, error: error.message }
        : { title: data.title, id: data.id }
    )
  }

  return NextResponse.json({
    seeded: results.filter((r) => !('error' in r)).length,
    results,
  })
}
