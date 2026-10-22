import 'server-only'

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getTomateSupabase } from '@/lib/tomate-server'
import type { GestionEvent, GestionRow, TeamUser } from './schema'

export const SESSION_COOKIE = 'gestion_session'
export const DOOR_COOKIE = 'gestion_door'
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60
export const ALLOWED_DOMAIN = 'pasito.app'

export function db(): SupabaseClient {
  return getTomateSupabase()
}

function secret(): string {
  const own = process.env.GESTION_SESSION_SECRET
  if (own && own.length >= 32) return own
  const shared = process.env.EVENT_TICKET_SIGNING_SECRET
  if (!shared || shared.length < 32) throw new Error('Falta GESTION_SESSION_SECRET.')
  // Clave derivada: una sesión de gestión nunca sirve como firma de entradas y viceversa.
  return createHmac('sha256', shared).update('gestion-session-v1').digest('base64url')
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

function seal(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

function unseal<T>(token: string | undefined): T | null {
  if (!token) return null
  const [body, mac] = token.split('.')
  if (!body || !mac) return null
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as T & { exp: number }
    return payload.exp > Date.now() / 1000 ? payload : null
  } catch {
    return null
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url')
}

export function createSessionCookie(email: string) {
  return {
    name: SESSION_COOKIE,
    value: seal({ e: email, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }),
    options: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: SESSION_TTL_SECONDS },
  }
}

export function isAllowedEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+$/.test(email) && email.endsWith(`@${ALLOWED_DOMAIN}`)
}

export type SessionUser = TeamUser & { canEdit: boolean; isAdmin: boolean }

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  const session = unseal<{ e: string }>(jar.get(SESSION_COOKIE)?.value)
  if (!session) return null
  const { data } = await db().from('gestion_users').select('email, name, role, phone').eq('email', session.e).maybeSingle()
  if (!data) return null
  const user = data as TeamUser
  return { ...user, canEdit: user.role !== 'lectura', isAdmin: user.role === 'admin' }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function requireUser(options: { edit?: boolean; admin?: boolean } = {}): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new HttpError(401, 'Iniciá sesión.')
  if (options.edit && !user.canEdit) throw new HttpError(403, 'Tu usuario es de solo lectura.')
  if (options.admin && !user.isAdmin) throw new HttpError(403, 'Solo admins.')
  return user
}

export function handleError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error('[gestion]', error)
  return NextResponse.json({ error: 'Algo falló. Probá de nuevo.' }, { status: 500 })
}

export async function readJson<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new HttpError(400, 'Solicitud inválida.')
  }
}

export async function logActivity(entry: {
  eventId: string | null
  actor: string
  action: string
  entity: string
  entityId?: string
  summary: string
  before?: unknown
  after?: unknown
}) {
  const { error } = await db().from('gestion_activity').insert({
    event_id: entry.eventId,
    actor: entry.actor,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    summary: entry.summary,
    before: entry.before ?? null,
    after: entry.after ?? null,
  })
  if (error) console.error('[gestion] activity log', error)
}

export async function getEvent(id: string): Promise<GestionEvent> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, 'Evento no encontrado.')
  const { data, error } = await db().from('gestion_events').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new HttpError(404, 'Evento no encontrado.')
  return data as GestionEvent
}

export async function getRows(eventIds: string[]): Promise<GestionRow[]> {
  if (!eventIds.length) return []
  const rows: GestionRow[] = []
  // PostgREST corta en 1000 filas por request: paginamos con orden estable.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db()
      .from('gestion_rows')
      .select('id, event_id, kind, data, position, created_by, updated_by, created_at, updated_at')
      .in('event_id', eventIds)
      .is('deleted_at', null)
      .order('position')
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as GestionRow[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

export function assertOpen(event: Pick<GestionEvent, 'status'>) {
  if (event.status === 'cerrado') throw new HttpError(409, 'El evento está cerrado.')
}

export async function listUsers(): Promise<TeamUser[]> {
  const { data, error } = await db().from('gestion_users').select('email, name, role, phone').order('name')
  if (error) throw error
  return (data ?? []) as TeamUser[]
}

// Hosts válidos para armar links en mails (evita que un Host falso robe el token de login).
const PUBLIC_HOSTS = ['eventos.pasito.app', 'www.pasito.app', 'pasito.app']

export function publicOrigin(request: NextRequest): string {
  const host = request.headers.get('host') ?? ''
  if (PUBLIC_HOSTS.includes(host)) return `https://${host}`
  if (/^[a-z0-9-]+-pasito-aa7e95c2\.vercel\.app$/.test(host)) return `https://${host}`
  if (process.env.NODE_ENV !== 'production' && /^localhost(:\d+)?$/.test(host)) return `http://${host}`
  return 'https://eventos.pasito.app'
}

export function newQrToken(): string {
  return randomBytes(16).toString('base64url')
}

// ---- Puerta: sesión con PIN por evento ----

export type DoorSession = { ev: string; pin: string; dev: string; op: string }

export function createDoorCookie(session: DoorSession, validUntil: Date) {
  const exp = Math.floor(validUntil.getTime() / 1000)
  return {
    name: DOOR_COOKIE,
    value: seal({ ...session, exp }),
    options: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: Math.max(exp - Math.floor(Date.now() / 1000), 60) },
  }
}

export function pinHash(eventId: string, pin: string): string {
  return createHmac('sha256', secret()).update(`door:${eventId}:${pin}`).digest('hex')
}

// Valida la sesión de puerta contra la base (así un PIN revocado corta el acceso al sincronizar).
export async function requireDoor(request: NextRequest, eventId: string): Promise<DoorSession & { viaTeam: boolean }> {
  // El equipo logueado puede operar cualquier puerta, aunque quede una cookie de PIN vieja.
  const user = await getSessionUser()
  if (user?.canEdit) return { ev: eventId, pin: '', dev: 'equipo', op: user.email, viaTeam: true }
  const door = unseal<DoorSession>(request.cookies.get(DOOR_COOKIE)?.value)
  if (door && door.ev === eventId) {
    const { data } = await db().from('gestion_door_pins').select('revoked_at, valid_from, valid_until').eq('id', door.pin).maybeSingle()
    const now = Date.now()
    if (data && !data.revoked_at && Date.parse(data.valid_from) <= now && Date.parse(data.valid_until) >= now) {
      return { ...door, viaTeam: false }
    }
    throw new HttpError(401, 'El PIN fue revocado o venció.')
  }
  throw new HttpError(401, 'Ingresá el PIN de puerta.')
}
