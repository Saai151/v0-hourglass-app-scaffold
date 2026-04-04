import { NextResponse } from 'next/server'
import {
  isMissingMeetingChatSchemaError,
  missingMeetingChatSchemaResponse,
} from '@/lib/meetings/errors'
import { createClient } from '@/lib/supabase/server'
import { buildDocumentChunks, summarizeMeeting } from '@/lib/meetings/service'
import type { CalendarEvent, MeetingDocumentUpsertRequest } from '@/lib/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function getAuthedEvent(eventId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      supabase,
      user: null,
      event: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: event, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single()

  if (error || !event) {
    return {
      supabase,
      user,
      event: null,
      response: NextResponse.json({ error: 'Meeting not found' }, { status: 404 }),
    }
  }

  return {
    supabase,
    user,
    event: event as CalendarEvent,
    response: null,
  }
}

export async function GET(_: Request, { params }: RouteParams) {
  const { id } = await params
  const { supabase, event, response } = await getAuthedEvent(id)

  if (response || !event) {
    return response!
  }

  const [{ data: documents, error: documentsError }, { data: summary, error: summaryError }] = await Promise.all([
    supabase
      .from('meeting_documents')
      .select('*')
      .eq('calendar_event_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('meeting_summaries')
      .select('*')
      .eq('calendar_event_id', id)
      .maybeSingle(),
  ])

  if (isMissingMeetingChatSchemaError(documentsError) || isMissingMeetingChatSchemaError(summaryError)) {
    return missingMeetingChatSchemaResponse()
  }

  return NextResponse.json({
    event,
    documents: documents ?? [],
    summary,
  })
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params
  const { supabase, user, event, response } = await getAuthedEvent(id)

  if (response || !user || !event) {
    return response!
  }

  const body = (await request.json().catch(() => null)) as MeetingDocumentUpsertRequest | null
  const title = body?.title?.trim()
  const content = body?.content?.trim()
  const documentType = body?.document_type

  if (!title || !content || !documentType || !['transcript', 'notes'].includes(documentType)) {
    return NextResponse.json(
      { error: 'title, content, and a valid document_type are required' },
      { status: 400 }
    )
  }

  const { data: document, error: insertError } = await supabase
    .from('meeting_documents')
    .insert({
      user_id: user.id,
      calendar_event_id: id,
      title,
      document_type: documentType,
      content,
      source_metadata: body?.source_metadata ?? {},
    })
    .select()
    .single()

  if (insertError || !document) {
    if (isMissingMeetingChatSchemaError(insertError)) {
      return missingMeetingChatSchemaResponse()
    }
    return NextResponse.json({ error: insertError?.message ?? 'Failed to save document' }, { status: 500 })
  }

  const chunks = buildDocumentChunks(document.id, id, user.id, {
    title,
    documentType,
    content,
    sourceMetadata: body?.source_metadata,
  })

  if (chunks.length > 0) {
    const { error: chunkError } = await supabase.from('meeting_chunks').insert(chunks)
    if (chunkError) {
      if (isMissingMeetingChatSchemaError(chunkError)) {
        return missingMeetingChatSchemaResponse()
      }
      return NextResponse.json({ error: chunkError.message }, { status: 500 })
    }
  }

  const { data: documents, error: documentsError } = await supabase
    .from('meeting_documents')
    .select('id, title, document_type, content')
    .eq('calendar_event_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (documentsError || !documents) {
    if (isMissingMeetingChatSchemaError(documentsError)) {
      return missingMeetingChatSchemaResponse()
    }
    return NextResponse.json(
      { error: documentsError?.message ?? 'Failed to reload meeting documents' },
      { status: 500 }
    )
  }

  const summary = await summarizeMeeting(event, documents)
  const { data: upsertedSummary, error: summaryError } = await supabase
    .from('meeting_summaries')
    .upsert({
      user_id: user.id,
      calendar_event_id: id,
      ...summary,
    }, {
      onConflict: 'calendar_event_id',
    })
    .select()
    .single()

  if (summaryError || !upsertedSummary) {
    if (isMissingMeetingChatSchemaError(summaryError)) {
      return missingMeetingChatSchemaResponse()
    }
    return NextResponse.json(
      { error: summaryError?.message ?? 'Failed to save meeting summary' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      document,
      summary: upsertedSummary,
      chunk_count: chunks.length,
    },
    { status: 201 }
  )
}
