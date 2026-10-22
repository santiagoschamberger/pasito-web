import 'server-only'

import { db, newQrToken } from './server'
import { ATTENDEE_KINDS, type Attendee, type AttendeeKind, type AttendeeOrigin } from './schema'

export const ATTENDEE_COLUMNS =
  'id, event_id, name, email, phone, dni_last3, kind, origin, origin_ref, app_code, companions, companions_in, notes, qr_token, status, checked_in_at, checked_in_device, created_at'

export type AttendeeInput = {
  name?: unknown
  email?: unknown
  phone?: unknown
  dni_last3?: unknown
  kind?: unknown
  origin?: unknown
  origin_ref?: unknown
  app_code?: unknown
  companions?: unknown
  notes?: unknown
}

const str = (value: unknown, max: number) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null)
const ORIGINS: AttendeeOrigin[] = ['app', 'ticketera', 'invitado', 'staff', 'puerta', 'manual']

export function cleanAttendee(input: AttendeeInput, fallbackOrigin: AttendeeOrigin = 'manual') {
  const name = str(input.name, 120)
  if (!name) return null
  const dni = typeof input.dni_last3 === 'string' || typeof input.dni_last3 === 'number' ? String(input.dni_last3).replace(/\D/g, '').slice(-3) : ''
  const companions = Math.min(Math.max(Math.trunc(Number(input.companions) || 0), 0), 20)
  return {
    name,
    email: str(input.email, 200)?.toLowerCase() ?? null,
    phone: str(input.phone, 40),
    dni_last3: dni || null,
    kind: (ATTENDEE_KINDS.some((k) => k.value === input.kind) ? input.kind : 'general') as AttendeeKind,
    origin: (ORIGINS.includes(input.origin as AttendeeOrigin) ? input.origin : fallbackOrigin) as AttendeeOrigin,
    origin_ref: str(input.origin_ref, 200),
    app_code: str(input.app_code, 200),
    companions,
    notes: str(input.notes, 500),
  }
}

// Inserta asistentes salteando los que ya existen con el mismo origen + referencia.
export async function insertAttendees(eventId: string, items: NonNullable<ReturnType<typeof cleanAttendee>>[]) {
  const withRef = items.filter((i) => i.origin_ref)
  const existing = new Set<string>()
  if (withRef.length) {
    for (let i = 0; i < withRef.length; i += 500) {
      const chunk = withRef.slice(i, i + 500)
      const { data } = await db()
        .from('gestion_attendees')
        .select('origin, origin_ref')
        .eq('event_id', eventId)
        .in('origin_ref', chunk.map((c) => c.origin_ref as string))
      for (const row of data ?? []) existing.add(`${row.origin}:${row.origin_ref}`)
    }
  }
  const fresh = items.filter((i) => !i.origin_ref || !existing.has(`${i.origin}:${i.origin_ref}`))
  const inserted: Attendee[] = []
  for (let i = 0; i < fresh.length; i += 500) {
    const chunk = fresh.slice(i, i + 500).map((item) => ({ ...item, event_id: eventId, qr_token: newQrToken() }))
    const { data, error } = await db().from('gestion_attendees').insert(chunk).select(ATTENDEE_COLUMNS)
    if (error) throw error
    inserted.push(...((data ?? []) as Attendee[]))
  }
  return { inserted, skipped: items.length - fresh.length }
}
