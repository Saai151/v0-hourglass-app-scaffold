'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type {
  CalendarEvent,
  MeetingAudit,
  MeetingDocument,
  MeetingSummary,
} from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, FileText, MessageSquare, Upload } from 'lucide-react'

interface MeetingWorkspaceProps {
  event: CalendarEvent
  audit?: Pick<MeetingAudit, 'verdict' | 'status'> | null
  documents: MeetingDocument[]
  summary?: MeetingSummary | null
}

async function readResponsePayload(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {
      error: text,
    }
  }
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MeetingWorkspace({
  event,
  audit,
  documents,
  summary,
}: MeetingWorkspaceProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState<'transcript' | 'notes'>('transcript')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(eventId: string) {
    if (!content.trim()) {
      setError('Add some meeting text first.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/meetings/${eventId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          document_type: documentType,
          content: content.trim(),
        }),
      })

      const payload = await readResponsePayload(response)
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === 'string'
            ? payload.error
            : 'Failed to upload meeting document'
        )
      }

      setTitle('')
      setContent('')
      setDocumentType('transcript')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Upload failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file) return

    const text = await file.text()
    setContent(text)
    if (!title) {
      setTitle(file.name.replace(/\.[^.]+$/, ''))
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/dashboard/meetings" className="text-sm text-muted-foreground hover:text-foreground">
                Meetings
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">Workspace</span>
            </div>
            <h1 className="text-2xl font-semibold">{event.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(event.start_time), 'EEEE, MMM d • h:mm a')} to{' '}
              {format(new Date(event.end_time), 'h:mm a')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {audit && (
              <Badge variant="outline">
                Audit: {audit.verdict} ({audit.status})
              </Badge>
            )}
            <Button asChild variant="outline">
              <Link href={`/dashboard/chat?meetingId=${event.id}`}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask about this meeting
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Meeting Context
                </CardTitle>
                <CardDescription>Calendar metadata already tracked by Hourglass.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Organizer:</span> {event.organizer_email || 'Unknown'}</p>
                <p><span className="font-medium text-foreground">Attendees:</span> {event.attendees?.map((attendee) => attendee.name || attendee.email).join(', ') || 'None listed'}</p>
                <p><span className="font-medium text-foreground">Description:</span> {event.description || 'No description provided.'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meeting Summary</CardTitle>
                <CardDescription>
                  Generated from the uploaded notes and transcripts for this meeting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {summary ? (
                  <>
                    <p className="text-sm text-muted-foreground">{summary.summary}</p>
                    <SectionList title="Decisions" items={summary.decisions} />
                    <SectionList title="Action items" items={summary.action_items} />
                    <SectionList title="Open questions" items={summary.open_questions} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No meeting summary yet. Upload a transcript or notes to generate one.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uploaded Documents</CardTitle>
                <CardDescription>
                  Each document is stored and chunked so the chat assistant can retrieve it later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {documents.length > 0 ? (
                  documents.map((document) => (
                    <div key={document.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{document.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {document.document_type} • {format(new Date(document.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <Badge variant="secondary">{document.document_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">
                        {document.content.length > 280
                          ? `${document.content.slice(0, 280).trim()}...`
                          : document.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No meeting documents uploaded yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Add Meeting Notes
                </CardTitle>
                <CardDescription>
                  Paste text directly or load a plain-text transcript file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="document-title">
                    Title <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    id="document-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Sprint planning transcript"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to auto-generate a title from the meeting name and document type.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="document-type">
                    Type
                  </label>
                  <select
                    id="document-type"
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value as 'transcript' | 'notes')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="transcript">Transcript</option>
                    <option value="notes">Notes</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="document-file">
                    Load from file <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    id="document-file"
                    type="file"
                    accept=".txt,.md,.rtf"
                    onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="document-content">
                    Content
                  </label>
                  <Textarea
                    id="document-content"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    className="min-h-[280px]"
                    placeholder="Paste the meeting transcript or notes here..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Pasting notes here is enough. You only need a file if you want to import one.
                  </p>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button
                  onClick={() => handleSubmit(event.id)}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Saving...' : 'Save and summarize'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
