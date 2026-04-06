import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAuthUrl } from '@/lib/google/auth'
import { createStateToken } from '@/lib/google/state'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  }

  const state = createStateToken({ userId: user.id, returnPath: '/dashboard/integrations' })
  const authUrl = generateAuthUrl(state)

  // Mark the connection as pending
  await supabase.from('connected_accounts').upsert(
    {
      user_id: user.id,
      provider: 'google_calendar',
      status: 'pending',
    },
    { onConflict: 'user_id,provider' },
  )

  return NextResponse.redirect(authUrl)
}
