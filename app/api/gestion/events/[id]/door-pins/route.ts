import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import { db, getEvent, handleError, HttpError, logActivity, pinHash, readJson, requireUser } from '@/lib/gestion/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const { data, error } = await db().from('gestion_door_pins').select('id, label, valid_from, valid_until, revoked_at, created_by, created_at').eq('event_id', id).order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ pins: data ?? [] })
  } catch (error) {
    return handleError(error)
  }
}

const DAY = 24 * 3600 * 1000

// Ventana por defecto: desde el día anterior al evento (para la prueba de puerta)
// hasta las 6 AM del día siguiente al fin. Sin fecha: 24 horas desde ahora.
function defaultWindow(startDate: string | null, endDate: string | null): { from: Date; until: Date } {
  const now = Date.now()
  if (!startDate) return { from: new Date(now), until: new Date(now + DAY) }
  const from = Math.max(now, Date.parse(`${startDate}T00:00:00-03:00`) - DAY)
  const until = Date.parse(`${endDate || startDate}T06:00:00-03:00`) + DAY
  return { from: new Date(from), until: new Date(Math.max(until, from + 6 * 3600 * 1000)) }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    const event = await getEvent(id)
    const body = await readJson<{ label?: string; valid_from?: string; valid_until?: string }>(request)
    const label = (body.label ?? '').trim().slice(0, 60) || 'Puerta'
    const fallback = defaultWindow(event.start_date, event.end_date)
    const validFrom = body.valid_from ? new Date(body.valid_from) : fallback.from
    const validUntil = body.valid_until ? new Date(body.valid_until) : fallback.until
    if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime()) || validUntil <= validFrom) throw new HttpError(400, 'Ventana horaria inválida.')
    if (validUntil.getTime() - validFrom.getTime() > 7 * 24 * 3600 * 1000) throw new HttpError(400, 'Un PIN dura como máximo 7 días.')
    const pin = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const { data, error } = await db()
      .from('gestion_door_pins')
      .insert({ event_id: id, label, pin_hash: pinHash(id, pin), valid_from: validFrom.toISOString(), valid_until: validUntil.toISOString(), created_by: user.email })
      .select('id, label, valid_from, valid_until, revoked_at, created_by, created_at')
      .single()
    if (error) throw error
    await logActivity({ eventId: id, actor: user.email, action: 'create', entity: 'door_pin', entityId: data.id, summary: `creó un PIN de puerta (${label})` })
    // El PIN se muestra una sola vez: en la base queda solo el hash.
    return NextResponse.json({ pin, record: data })
  } catch (error) {
    return handleError(error)
  }
}
