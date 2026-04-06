import { google } from 'googleapis'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConnectedAccount } from '@/lib/types'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

const CALLBACK_PATH = '/api/integrations/google-calendar/callback'

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${base}${CALLBACK_PATH}`
}

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri(),
  )
}

export function generateAuthUrl(state: string): string {
  const client = createOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    state,
  })
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuth2Client()
  const { tokens } = await client.getToken(code)
  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    expiry_date: tokens.expiry_date!,
  }
}

export async function getAuthenticatedClient(
  supabase: SupabaseClient,
  account: ConnectedAccount,
) {
  const client = createOAuth2Client()
  client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  })

  // Refresh if expired or within 5 minute buffer
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0
  const needsRefresh = Date.now() > expiresAt - 5 * 60 * 1000

  if (needsRefresh && account.refresh_token) {
    const { credentials } = await client.refreshAccessToken()
    client.setCredentials(credentials)

    await supabase
      .from('connected_accounts')
      .update({
        access_token: credentials.access_token,
        token_expires_at: credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : null,
      })
      .eq('id', account.id)
  }

  return client
}

export async function revokeToken(token: string) {
  const client = createOAuth2Client()
  await client.revokeToken(token)
}

export async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const client = createOAuth2Client()
  client.setCredentials({ access_token: accessToken })
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const { data } = await oauth2.userinfo.get()
  return data.email!
}
