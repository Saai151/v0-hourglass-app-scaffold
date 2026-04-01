import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface MeetingsHeaderProps {
  eventCount: number
}

export function MeetingsHeader({ eventCount }: MeetingsHeaderProps) {
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
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Sync calendar
        </Button>
      </div>
    </header>
  )
}
