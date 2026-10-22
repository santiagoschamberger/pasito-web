import { NextRequest, NextResponse } from 'next/server'

import { db, handleError, HttpError, readJson, requireDoor } from '@/lib/gestion/server'
import { doorAttendees } from '@/lib/gestion/door'

type PendingCheckin = { id?: unknown; attendee_id?: unknown; action?: unknown; scanned_at?: unknown }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Sube los check-ins guardados en el celular y baja los cambios de las otras puertas.
export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const door = await requireDoor(request, eventId)
    const body = await readJson<{ checkins?: PendingCheckin[]; since?: string; lookup?: string }>(request)
    const checkins = Array.isArray(body.checkins) ? body.checkins.slice(0, 500) : []
    const results: { id: string; status: string }[] = []
    for (const c of checkins) {
      if (typeof c.id !== 'string' || !UUID.test(c.id) || typeof c.attendee_id !== 'string' || !UUID.test(c.attendee_id)) continue
      const action = c.action === 'salida' || c.action === 'acompanante' ? c.action : 'ingreso'
      const scannedAt = typeof c.scanned_at === 'string' && !Number.isNaN(Date.parse(c.scanned_at)) ? c.scanned_at : new Date().toISOString()
      const { data, error } = await db().rpc('gestion_apply_checkin', {
        p_id: c.id,
        p_event_id: eventId,
        p_attendee_id: c.attendee_id,
        p_action: action,
        p_scanned_at: scannedAt,
        p_device: door.dev,
        p_door_pin_id: door.pin || null,
        p_operator: door.op,
      })
      if (error) throw error
      results.push({ id: c.id, status: (data as { status: string }).status })
    }

    // QR que no está en la lista local: ¿es de otro evento?
    let lookup: { eventName: string } | null = null
    if (typeof body.lookup === 'string' && body.lookup.length <= 200) {
      const value = body.lookup.trim()
      const { data } = await db().from('gestion_attendees').select('event_id, gestion_events(name)').or(`qr_token.eq.${value.replace(/[^A-Za-z0-9_-]/g, '')},app_code.eq.${value.replace(/[^A-Za-z0-9_-]/g, '')}`).neq('event_id', eventId).limit(1).maybeSingle()
      if (data) lookup = { eventName: (data.gestion_events as unknown as { name: string } | null)?.name ?? 'otro evento' }
    }

    const since = typeof body.since === 'string' && !Number.isNaN(Date.parse(body.since)) ? body.since : undefined
    if (!since) throw new HttpError(400, 'Falta la marca de sincronización.')
    const syncedAt = new Date().toISOString()
    return NextResponse.json({ results, changes: await doorAttendees(eventId, since), syncedAt, lookup }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleError(error)
  }
}
