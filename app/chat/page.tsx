import { redirect } from 'next/navigation'

interface ChatPageProps {
  searchParams: Promise<{
    threadId?: string
    meetingId?: string
  }>
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { threadId, meetingId } = await searchParams
  const qs = new URLSearchParams()
  if (threadId) qs.set('threadId', threadId)
  if (meetingId) qs.set('meetingId', meetingId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  redirect(`/dashboard/chat${suffix}`)
}
