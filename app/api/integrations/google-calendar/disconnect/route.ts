import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revokeToken } from '@/lib/google/auth'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: account } = await supabase
    .from('connected_accounts')
    .select('id, access_token')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Not connected' }, { status: 400 })
  }

  // Best-effort token revocation
  if (account.access_token) {
    try {
      await revokeToken(account.access_token)
    } catch {
      // Google may reject if token is already expired — that's fine
    }
  }

  await supabase
    .from('connected_accounts')
    .update({
      status: 'disconnected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
    })
    .eq('id', account.id)

  return NextResponse.json({ success: true })
}
