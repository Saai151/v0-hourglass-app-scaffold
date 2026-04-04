import { updateSession } from './lib/supabase/update-session'
import { type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * - api routes for webhooks that don't need auth
     */
    '/((?!_next/static|_next/image|favicon.ico|api/whatsapp|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
