import { NextRequest, NextResponse } from 'next/server'

import { getTomateSupabase, requestIpHash } from '@/lib/tomate-server'
import { createCheckinSession, passwordMatches, readCheckinSession, TOMATE_CHECKIN_COOKIE } from '@/lib/tomate-ticket-security'

export async function GET(request: NextRequest) {
  const session = readCheckinSession(request.cookies.get(TOMATE_CHECKIN_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ authenticated: false }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  }
  return NextResponse.json({ authenticated: true, operator: session.operator }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

export async function POST(request: NextRequest) {
  let body: { operator?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  const operator = typeof body.operator === 'string' ? body.operator.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (operator.length < 2 || operator.length > 80 || password.length > 200) {
    return NextResponse.json({ error: 'Completá tu nombre y la clave del equipo.' }, { status: 400 })
  }

  try {
    const { data: allowed, error } = await getTomateSupabase().rpc('event_consume_rate_limit', {
      p_scope: 'tomate-checkin-login',
      p_key_hash: requestIpHash(request, 'tomate-checkin-login'),
      p_limit: 10,
      p_window_seconds: 900,
    })
    if (error) throw error
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos. Esperá 15 minutos.' }, { status: 429 })
    if (!passwordMatches(password)) {
      return NextResponse.json({ error: 'La clave no es correcta.' }, { status: 401 })
    }

    const response = NextResponse.json({ authenticated: true, operator })
    response.cookies.set(TOMATE_CHECKIN_COOKIE, createCheckinSession(operator), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 12 * 60 * 60,
    })
    return response
  } catch (error) {
    console.error('[tomate/check-in] No se pudo iniciar sesión:', error)
    return NextResponse.json({ error: 'No pudimos validar la sesión.' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false })
  response.cookies.set(TOMATE_CHECKIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return response
}
