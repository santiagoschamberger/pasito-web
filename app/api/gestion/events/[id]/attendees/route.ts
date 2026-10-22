import { NextRequest, NextResponse } from 'next/server'

import { db, getEvent, handleError, HttpError, logActivity, readJson, requireUser } from '@/lib/gestion/server'
import { ATTENDEE_COLUMNS, cleanAttendee, insertAttendees, type AttendeeInput } from '@/lib/gestion/attendees'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    await getEvent(id)
    const attendees = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db().from('gestion_attendees').select(ATTENDEE_COLUMNS).eq('event_id', id).is('deleted_at', null).order('name').range(from, from + 999)
      if (error) throw error
      attendees.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    const { data: checkins } = await db().from('gestion_checkins').select('scanned_at, action, duplicate').eq('event_id', id).eq('action', 'ingreso').eq('duplicate', false)
    const { count: duplicates } = await db().from('gestion_checkins').select('id', { count: 'exact', head: true }).eq('event_id', id).eq('duplicate', true)
    return NextResponse.json(
      { attendees, arrivals: (checkins ?? []).map((c) => c.scanned_at), duplicates: duplicates ?? 0 },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    await getEvent(id)
    const body = await readJson<{ attendees?: AttendeeInput[]; origin?: string }>(request)
    if (!Array.isArray(body.attendees) || !body.attendees.length) throw new HttpError(400, 'No hay personas para cargar.')
    if (body.attendees.length > 10_000) throw new HttpError(400, 'Máximo 10.000 personas por carga.')
    const origin = body.origin === 'ticketera' || body.origin === 'invitado' ? body.origin : 'manual'
    const clean = body.attendees.map((a) => cleanAttendee(a, origin)).filter((a): a is NonNullable<typeof a> => a !== null)
    if (!clean.length) throw new HttpError(400, 'Ninguna fila tiene nombre.')
    const { inserted, skipped } = await insertAttendees(id, clean)
    await logActivity({ eventId: id, actor: user.email, action: 'create', entity: 'attendee', summary: `cargó ${inserted.length} persona(s) a Asistentes${skipped ? ` (${skipped} ya estaban)` : ''}` })
    return NextResponse.json({ inserted, skipped, invalid: body.attendees.length - clean.length })
  } catch (error) {
    return handleError(error)
  }
}
