import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import { db, getEvent, handleError, HttpError, logActivity, readJson, requireDoor } from '@/lib/gestion/server'
import { cleanAttendee, insertAttendees } from '@/lib/gestion/attendees'

// Alta en puerta (solo si el responsable lo habilitó). Requiere señal.
export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const door = await requireDoor(request, eventId)
    const event = await getEvent(eventId)
    if (!event.door_allow_walkins && !door.viaTeam) throw new HttpError(403, 'Las altas en puerta no están habilitadas.')
    const body = await readJson<{ name?: string; notes?: string; dni_last3?: string }>(request)
    const item = cleanAttendee({ name: body.name, notes: body.notes, dni_last3: body.dni_last3, origin: 'puerta' }, 'puerta')
    if (!item) throw new HttpError(400, 'Falta el nombre.')
    const { inserted } = await insertAttendees(eventId, [item])
    const attendee = inserted[0]
    await db().rpc('gestion_apply_checkin', {
      p_id: randomUUID(), p_event_id: eventId, p_attendee_id: attendee.id, p_action: 'ingreso',
      p_scanned_at: new Date().toISOString(), p_device: door.dev, p_door_pin_id: door.pin || null, p_operator: door.op,
    })
    await logActivity({ eventId, actor: `puerta:${door.op}`, action: 'create', entity: 'attendee', entityId: attendee.id, summary: `dio de alta en puerta a ${attendee.name}` })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
