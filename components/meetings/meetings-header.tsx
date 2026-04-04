'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2, MessageSquare } from 'lucide-react'
import { GenerateAuditButton } from '@/components/audit/generate-audit-button'

interface MeetingsHeaderProps {
  eventCount: number
}

export function MeetingsHeader({ eventCount }: MeetingsHeaderProps) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)

  async function handleSync() {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/events/seed', { method: 'POST' })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <header className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Meetings</h1>
          {eventCount > 0 && (
            <Badge variant="secondary" className="font-normal">
              {eventCount} upcoming
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard/chat">
              <MessageSquare className="h-4 w-4" />
              Meeting chat
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isSyncing ? 'Syncing...' : 'Sync calendar'}
          </Button>
          {eventCount > 0 && <GenerateAuditButton variant="outline" />}
        </div>
      </div>
    </header>
  )
}
