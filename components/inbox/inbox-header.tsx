import { Badge } from '@/components/ui/badge'

interface InboxHeaderProps {
  pendingCount: number
}

export function InboxHeader({ pendingCount }: InboxHeaderProps) {
  return (
    <header className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Inbox</h1>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="font-normal">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Review AI recommendations for your meetings
        </p>
      </div>
    </header>
  )
}
