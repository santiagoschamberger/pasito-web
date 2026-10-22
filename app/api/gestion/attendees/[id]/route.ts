import { NextRequest, NextResponse } from 'next/server'

import { assertOpen, db, getEvent, handleError, HttpError, logActivity, readJson, requireUser } from '@/lib/gestion/server'
import { ATTENDEE_COLUMNS, cleanAttendee } from '@/lib/gestion/attendees'

type Params = { params: Promise<{ id: string }> }

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, 'No encontrado.')
  const { data } = await db().from('gestion_attendees').select(ATTENDEE_COLUMNS).eq('id', id).maybeSingle()
  if (!data) throw new HttpError(404, 'No encontrado.')
  return data as { id: string; event_id: string; name: string; status: string }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    const current = await load(id)
    assertOpen(await getEvent(current.event_id))
    const body = await readJson<Record<string, unknown>>(request)
    if (body.restore) {
      await db().from('gestion_attendees').update({ deleted_at: null }).eq('id', id)
      return NextResponse.json({ ok: true })
    }
    // Corrección manual del estado (por ejemplo, un check-in hecho por error).
    if (body.status === 'anotado' || body.status === 'ingreso') {
      await db().from('gestion_attendees').update({
        status: body.status,
        checked_in_at: body.status === 'ingreso' ? new Date().toISOString() : null,
        checked_in_device: body.status === 'ingreso' ? `manual:${user.email}` : null,
        companions_in: body.status === 'anotado' ? 0 : undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      await logActivity({ eventId: current.event_id, actor: user.email, action: 'update', entity: 'attendee', entityId: id, summary: `marcó a ${current.name} como ${body.status === 'ingreso' ? 'ingresado' : 'no ingresado'}` })
    } else {
      const clean = cleanAttendee({ ...current, ...body })
      if (!clean) throw new HttpError(400, 'Falta el nombre.')
      const { origin: _origin, origin_ref: _ref, ...editable } = clean
      await db().from('gestion_attendees').update({ ...editable, updated_at: new Date().toISOString() }).eq('id', id)
    }
    return NextResponse.json({ attendee: await load(id) })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    const current = await load(id)
    assertOpen(await getEvent(current.event_id))
    await db().from('gestion_attendees').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    await logActivity({ eventId: current.event_id, actor: user.email, action: 'delete', entity: 'attendee', entityId: id, summary: `sacó a ${current.name} de la lista` })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
