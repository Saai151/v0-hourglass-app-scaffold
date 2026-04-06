import Link from 'next/link'
import { Calendar, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function MeetingsEmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>No upcoming meetings</CardTitle>
          <CardDescription>
            Connect your calendar to see your upcoming meetings and get AI-powered recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/integrations">
              <Link2 className="h-4 w-4 mr-2" />
              Connect Google Calendar
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
