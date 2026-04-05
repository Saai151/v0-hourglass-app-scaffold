import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, fetchGoogleEmail, GOOGLE_SCOPES } from '@/lib/google/auth'
import { verifyStateToken } from '@/lib/google/state'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const errorParam = searchParams.get('error')
  const grantedScope = searchParams.get('scope') || ''

  // User denied consent or Google returned an error
  if (errorParam || !code || !stateParam) {
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/integrations?error=${errorParam || 'missing_params'}`,
    )
  }

  // Check if user granted the calendar scope
  if (!grantedScope.includes('calendar.readonly')) {
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/integrations?error=missing_calendar_scope`,
    )
  }

  // Verify CSRF state
  const statePayload = verifyStateToken(stateParam)
  if (!statePayload) {
    return NextResponse.redirect(`${BASE_URL}/dashboard/integrations?error=invalid_state`)
  }

  // Verify the logged-in user matches the state
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user || user.id !== statePayload.userId) {
    return NextResponse.redirect(`${BASE_URL}/dashboard/integrations?error=auth_mismatch`)
  }

  try {
    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Fetch the user's Google email
    const googleEmail = await fetchGoogleEmail(tokens.access_token)

    // Store the connection
    await supabase.from('connected_accounts').upsert(
      {
        user_id: user.id,
        provider: 'google_calendar',
        account_email: googleEmail,
        status: 'connected',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(tokens.expiry_date).toISOString(),
        scopes: GOOGLE_SCOPES,
        metadata: {},
      },
      { onConflict: 'user_id,provider' },
    )

    return NextResponse.redirect(`${BASE_URL}/dashboard/integrations?connected=google_calendar`)
  } catch (err) {
    console.error('Google Calendar OAuth callback error:', err)
    return NextResponse.redirect(`${BASE_URL}/dashboard/integrations?error=token_exchange_failed`)
  }
}
