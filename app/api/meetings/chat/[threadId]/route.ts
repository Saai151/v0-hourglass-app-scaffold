import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Delete messages first (foreign key), then the thread
  await supabase
    .from('meeting_chat_messages')
    .delete()
    .eq('thread_id', threadId)
    .eq('user_id', user.id)

  const { error } = await supabase
    .from('meeting_chat_threads')
    .delete()
    .eq('id', threadId)
    .eq('user_id', user.id)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(null, { status: 204 })
}
