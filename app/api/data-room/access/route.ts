import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  consumeDummyPasswordCheck,
  verifyDataRoomPassword,
} from '@/lib/data-room/crypto'
import {
  DATA_ROOM_COOKIE,
  DATA_ROOM_SESSION_HOURS,
  getDataRoomClient,
  getDataRoomClientHash,
  hashSessionToken,
} from '@/lib/data-room/server'

const LOGIN_WINDOW_MINUTES = 15
const MAX_FAILED_ATTEMPTS = 8

function normalizeSlug(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function invalidCredentialsResponse() {
  return NextResponse.json(
    { error: 'La contraseña no es válida o el acceso ya no está disponible.' },
    { status: 401 },
  )
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { slug?: unknown; password?: unknown } | null
  const slug = normalizeSlug(body?.slug)
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!slug || password.length < 4 || password.length > 200) {
    return invalidCredentialsResponse()
  }

  const db = getDataRoomClient()
  const clientHash = getDataRoomClientHash(request.headers)
  const attemptWindow = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000).toISOString()
  const { count: failedAttempts } = await db
    .from('brand_data_room_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'login_failed')
    .eq('client_hash', clientHash)
    .gte('occurred_at', attemptWindow)

  if ((failedAttempts ?? 0) >= MAX_FAILED_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá 15 minutos y volvé a probar.' },
      { status: 429 },
    )
  }

  const now = new Date().toISOString()
  const { data: access } = await db
    .from('brand_data_room_accesses')
    .select('id, slug, password_hash, is_active, expires_at')
    .eq('slug', slug)
    .maybeSingle()

  const accessIsAvailable = Boolean(
    access
    && access.is_active
    && (!access.expires_at || access.expires_at > now),
  )
  const passwordMatches = accessIsAvailable && access
    ? await verifyDataRoomPassword(password, access.password_hash)
    : await consumeDummyPasswordCheck(password).then(() => false)

  if (!access || !accessIsAvailable || !passwordMatches) {
    await db.from('brand_data_room_events').insert({
      access_id: access?.id ?? null,
      event_type: 'login_failed',
      client_hash: clientHash,
    })
    return invalidCredentialsResponse()
  }

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + DATA_ROOM_SESSION_HOURS * 60 * 60_000)
  const { data: session, error: sessionError } = await db
    .from('brand_data_room_sessions')
    .insert({
      access_id: access.id,
      token_hash: hashSessionToken(token),
      client_hash: clientHash,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    console.error('[data-room/access] session insert failed:', sessionError?.message)
    return NextResponse.json({ error: 'No se pudo iniciar la sesión.' }, { status: 500 })
  }

  await db.from('brand_data_room_events').insert({
    access_id: access.id,
    session_id: session.id,
    event_type: 'login_success',
    client_hash: clientHash,
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(DATA_ROOM_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    // The page calls /api/data-room/* after login, so the HttpOnly session
    // cookie must be available to both the private page and its API routes.
    path: '/',
    expires: expiresAt,
  })
  return response
}
