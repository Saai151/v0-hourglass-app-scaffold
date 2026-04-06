import { Skeleton } from '@/components/ui/skeleton'

/** Skeleton for the conversation pane only — thread list lives in layout and stays mounted. */
export default function ChatLoading() {
  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <header className="border-b bg-card px-6 py-4 shrink-0 space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </header>
      <div className="flex-1 overflow-hidden p-6 space-y-4">
        <Skeleton className="h-32 w-full max-w-4xl mx-auto rounded-lg" />
        <Skeleton className="h-24 w-full max-w-4xl mx-auto rounded-lg" />
      </div>
      <div className="border-t bg-card px-6 py-4 shrink-0 space-y-3">
        <Skeleton className="h-[110px] w-full max-w-4xl mx-auto rounded-md" />
        <div className="max-w-4xl mx-auto flex justify-end">
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>
  )
}
