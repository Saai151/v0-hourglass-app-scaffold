import { NextResponse } from 'next/server'

const MISSING_TABLE_CODES = new Set(['PGRST205', '42P01'])

function extractMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return null
}

export function isMissingMeetingChatSchemaError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const code = 'code' in error ? (error as { code?: unknown }).code : null
  const message = extractMessage(error)

  return (
    (typeof code === 'string' && MISSING_TABLE_CODES.has(code)) ||
    Boolean(message?.includes("Could not find the table 'public.meeting_chat_threads'")) ||
    Boolean(message?.includes("Could not find the table 'public.meeting_chat_messages'")) ||
    Boolean(message?.includes("Could not find the table 'public.meeting_documents'")) ||
    Boolean(message?.includes("Could not find the table 'public.meeting_chunks'")) ||
    Boolean(message?.includes("Could not find the table 'public.meeting_summaries'"))
  )
}

export function missingMeetingChatSchemaResponse() {
  return NextResponse.json(
    {
      error:
        'Meeting chat is not enabled in Supabase yet. Apply `scripts/002_add_meeting_chat_schema.sql` in your Supabase SQL editor, then try again.',
    },
    { status: 503 }
  )
}
