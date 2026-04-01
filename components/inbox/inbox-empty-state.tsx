import Link from 'next/link'
import { Inbox, Calendar, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function InboxEmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Inbox className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Your inbox is clear</CardTitle>
          <CardDescription>
            No pending meeting recommendations right now. We&apos;ll notify you when we have suggestions to optimize your calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-4">
            <p>To get started:</p>
            <ul className="text-left space-y-2">
              <li className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Connect your Google Calendar
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Sync your upcoming meetings
              </li>
            </ul>
          </div>
          <Button asChild>
            <Link href="/dashboard/integrations">Set up integrations</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
