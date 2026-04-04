'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import type {
  MeetingChatMessage,
  MeetingChatThread,
  MeetingCitation,
} from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { MessageSquarePlus, Send } from 'lucide-react'

interface MeetingChatProps {
  threads: MeetingChatThread[]
  activeThread: MeetingChatThread | null
  initialMessages: MeetingChatMessage[]
  focusedMeeting?: {
    id: string
    title: string
  } | null
}

function CitationList({ citations }: { citations: MeetingCitation[] }) {
  if (!citations.length) return null

  return (
    <div className="mt-3 space-y-2">
      {citations.map((citation, index) => (
        <div key={`${citation.meeting_id}-${index}`} className="rounded-md border bg-muted/40 px-3 py-2">
          <p className="text-xs font-medium">
            {citation.meeting_title}
            {citation.document_title ? ` • ${citation.document_title}` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{citation.excerpt}</p>
        </div>
      ))}
    </div>
  )
}

export function MeetingChat({
  threads,
  activeThread,
  initialMessages,
  focusedMeeting,
}: MeetingChatProps) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [threadList, setThreadList] = useState(threads)
  const [currentThread, setCurrentThread] = useState(activeThread)
  const [messages, setMessages] = useState(initialMessages)

  const title = currentThread
    ? currentThread.title
    : focusedMeeting
      ? `New chat about ${focusedMeeting.title}`
      : 'Cross-meeting chat'

  async function handleSubmit() {
    if (!message.trim()) return

    const pendingMessage = message.trim()
    setIsSubmitting(true)
    setError(null)
    setMessages((current) => [
      ...current,
      {
        id: `temp-user-${Date.now()}`,
        thread_id: currentThread?.id || 'pending',
        user_id: 'me',
        role: 'user',
        content: pendingMessage,
        citations: [],
        retrieval_context: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    setMessage('')

    try {
      const response = await fetch('/api/meetings/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: pendingMessage,
          thread_id: currentThread?.id,
          meeting_id: currentThread?.calendar_event_id ?? focusedMeeting?.id,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send message')
      }

      const nextThread = payload.thread as MeetingChatThread
      const assistantMessage = payload.message as MeetingChatMessage

      setCurrentThread(nextThread)
      setThreadList((current) => {
        const withoutCurrent = current.filter((thread) => thread.id !== nextThread.id)
        return [nextThread, ...withoutCurrent]
      })
      setMessages((current) => [
        current.filter((entry) => !entry.id.startsWith('temp-user-')).concat([
          {
            id: `user-${Date.now()}`,
            thread_id: nextThread.id,
            user_id: 'me',
            role: 'user',
            content: pendingMessage,
            citations: [],
            retrieval_context: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          assistantMessage,
        ]),
      ].flat())
      router.replace(`/dashboard/chat?threadId=${nextThread.id}`)
    } catch (submitError) {
      setMessages((current) => current.filter((entry) => !entry.id.startsWith('temp-user-')))
      setMessage(pendingMessage)
      setError(submitError instanceof Error ? submitError.message : 'Failed to send message')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full">
      <aside className="hidden lg:flex w-80 border-r bg-card flex-col">
        <div className="border-b px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Chats</h2>
              <p className="text-sm text-muted-foreground">Ask across all meeting notes</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/chat">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                New
              </Link>
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {threadList.map((thread) => (
              <Link
                key={thread.id}
                href={`/dashboard/chat?threadId=${thread.id}`}
                className={cn(
                  'block rounded-lg border p-3 transition-colors hover:border-primary/40',
                  currentThread?.id === thread.id && 'border-primary bg-primary/5'
                )}
              >
                <p className="font-medium text-sm">{thread.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(thread.updated_at), { addSuffix: true })}
                </p>
                <Badge variant="secondary" className="mt-2">
                  {thread.scope === 'single_meeting' ? 'Single meeting' : 'Cross meeting'}
                </Badge>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {focusedMeeting && !currentThread
                  ? `The first message will stay scoped to ${focusedMeeting.title}.`
                  : 'The assistant searches your uploaded meeting notes and summaries.'}
              </p>
            </div>
            {focusedMeeting && (
              <Button asChild variant="outline">
                <Link href={`/dashboard/meetings/${focusedMeeting.id}`}>
                  Open meeting workspace
                </Link>
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length > 0 ? (
              messages.map((entry) => (
                <Card
                  key={entry.id}
                  className={cn(
                    entry.role === 'assistant' ? 'bg-card' : 'bg-primary/5 border-primary/20'
                  )}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm capitalize">{entry.role}</CardTitle>
                    <CardDescription>
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                    {entry.role === 'assistant' && (
                      <CitationList citations={(entry.citations as MeetingCitation[]) || []} />
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Start a meeting chat</CardTitle>
                  <CardDescription>
                    Ask things like “What decisions did we make last sprint retro?” or
                    “Which meetings mention onboarding blockers?”
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>

        <div className="border-t bg-card px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-3">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask a question about your meetings..."
              className="min-h-[110px]"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Results are grounded in uploaded notes, transcripts, and generated meeting summaries.
              </p>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Thinking...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
