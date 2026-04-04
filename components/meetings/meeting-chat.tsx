'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'
import { DefaultChatTransport, isToolUIPart } from 'ai'
import type { MeetingChatThread } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { MessageSquarePlus, Send, Loader2, Database } from 'lucide-react'

interface MeetingChatProps {
  threads: MeetingChatThread[]
  activeThread: MeetingChatThread | null
  initialMessages: UIMessage[]
  focusedMeeting?: {
    id: string
    title: string
  } | null
}

function ToolCallIndicator({ part }: { part: { state: string } }) {
  const isLoading = part.state !== 'output-available'
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Database className="h-3.5 w-3.5" />
      )}
      {isLoading ? 'Searching meetings...' : 'Meeting data retrieved'}
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
  const [input, setInput] = useState('')
  const didNavigate = useRef(false)

  const threadId = activeThread?.id
  const meetingId = activeThread?.calendar_event_id ?? focusedMeeting?.id

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/meetings/chat?${new URLSearchParams({
          ...(threadId ? { threadId } : {}),
          ...(meetingId ? { meetingId } : {}),
        }).toString()}`,
      }),
    [threadId, meetingId],
  )

  const { messages, sendMessage, status } = useChat({
    id: threadId ?? undefined,
    transport,
    messages: initialMessages,
    onFinish: () => {
      if (!activeThread && !didNavigate.current) {
        didNavigate.current = true
        router.refresh()
      }
    },
  })

  const isStreaming = status === 'streaming' || status === 'submitted'

  const title = activeThread
    ? activeThread.title
    : focusedMeeting
      ? `New chat about ${focusedMeeting.title}`
      : 'Cross-meeting chat'

  function handleSubmit() {
    const text = input.trim()
    if (!text || isStreaming) return
    sendMessage({ text })
    setInput('')
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
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
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/dashboard/chat?threadId=${thread.id}`}
                className={cn(
                  'block rounded-lg border p-3 transition-colors hover:border-primary/40',
                  activeThread?.id === thread.id && 'border-primary bg-primary/5',
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

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <header className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {focusedMeeting && !activeThread
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length > 0 ? (
              messages.map((message) => (
                <Card
                  key={message.id}
                  className={cn(
                    message.role === 'assistant' ? 'bg-card' : 'bg-primary/5 border-primary/20',
                  )}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm capitalize">{message.role}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {message.parts.map((part, i) => {
                      if (part.type === 'text') {
                        return (
                          <p key={i} className="text-sm whitespace-pre-wrap">
                            {part.text}
                          </p>
                        )
                      }
                      if (isToolUIPart(part)) {
                        return <ToolCallIndicator key={i} part={part} />
                      }
                      return null
                    })}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Start a meeting chat</CardTitle>
                  <CardDescription>
                    Ask things like &ldquo;What decisions did we make last sprint retro?&rdquo; or
                    &ldquo;Which meetings mention onboarding blockers?&rdquo;
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
              <Card className="bg-card">
                <CardContent className="py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t bg-card px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Ask a question about your meetings..."
              className="min-h-[110px]"
              disabled={isStreaming}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Results are grounded in uploaded notes, transcripts, and generated meeting summaries.
              </p>
              <Button onClick={handleSubmit} disabled={isStreaming || !input.trim()}>
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isStreaming ? 'Thinking...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
