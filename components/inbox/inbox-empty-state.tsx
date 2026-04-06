'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Inbox, Calendar, Link2, Database, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GenerateAuditButton } from '@/components/audit/generate-audit-button'

export function InboxEmptyState() {
  const router = useRouter()
  const [isSeeding, setIsSeeding] = useState(false)

  async function handleSeedDemo() {
    setIsSeeding(true)
    try {
      const res = await fetch('/api/events/seed', { method: 'POST' })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-full">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Inbox className="h-6 w-6 text-muted-foreground" />
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
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or try a demo</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleSeedDemo}
              disabled={isSeeding}
            >
              {isSeeding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              {isSeeding ? 'Loading demo meetings...' : 'Load demo meetings'}
            </Button>
            <GenerateAuditButton variant="secondary" size="default" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
