import { NextRequest, NextResponse } from 'next/server'

import { db, handleError, hashToken, HttpError, isAllowedEmail, publicOrigin, randomToken, readJson } from '@/lib/gestion/server'
import { sendLoginEmail } from '@/lib/gestion/email'
import { requestIpHash } from '@/lib/tomate-server'

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<{ email?: unknown; next?: unknown }>(request)
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || email.length > 200) throw new HttpError(400, 'Ingresá tu email.')

    const { data: allowed, error: rateError } = await db().rpc('event_consume_rate_limit', {
      p_scope: 'gestion-login',
      p_key_hash: requestIpHash(request, 'gestion-login'),
      p_limit: 8,
      p_window_seconds: 900,
    })
    if (rateError) throw rateError
    if (!allowed) throw new HttpError(429, 'Demasiados intentos. Esperá 15 minutos.')

    // Entra cualquier cuenta @pasito.app, o alguien invitado a mano por un admin.
    const { data: invited } = await db().from('gestion_users').select('email').eq('email', email).maybeSingle()
    if (!invited && !isAllowedEmail(email)) throw new HttpError(403, 'Usá tu mail @pasito.app o pedile acceso a un admin.')

    const token = randomToken()
    const { error } = await db().from('gestion_login_tokens').insert({
      token_hash: hashToken(token),
      email,
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    })
    if (error) throw error

    const next = typeof body.next === 'string' && body.next.startsWith('/gestion') ? body.next : '/gestion'
    const link = `${publicOrigin(request)}/api/gestion/auth/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`
    if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ ok: true, devLink: link })
    }
    await sendLoginEmail(email, link)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
