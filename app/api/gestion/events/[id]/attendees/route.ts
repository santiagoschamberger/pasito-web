import { NextRequest, NextResponse } from 'next/server'

import { assertOpen, db, getEvent, handleError, HttpError, logActivity, readJson, requireUser } from '@/lib/gestion/server'
import { ATTENDEE_COLUMNS, cleanAttendee, insertAttendees, type AttendeeInput } from '@/lib/gestion/attendees'
import { syncSources, webSales } from '@/lib/gestion/sources'

type Params = { params: Promise<{ id: string }> }

async function all<T>(query: (from: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const event = await getEvent(id)
    // Entradas web (Rebill) y app al día cada vez que se abre la lista.
    if (user.canEdit && event.status !== 'cerrado') await syncSources(event, { minIntervalMs: 15_000 }).catch((e) => console.error('[gestion] sync', e))
    const attendees = await all<Record<string, unknown>>((from) =>
      db().from('gestion_attendees').select(ATTENDEE_COLUMNS).eq('event_id', id).is('deleted_at', null).order('name').order('id').range(from, from + 999))
    const arrivals = await all<{ scanned_at: string }>((from) =>
      db().from('gestion_checkins').select('scanned_at').eq('event_id', id).eq('action', 'ingreso').eq('duplicate', false).order('id').range(from, from + 999))
    const { count: duplicates } = await db().from('gestion_checkins').select('id', { count: 'exact', head: true }).eq('event_id', id).eq('duplicate', true)
    // Solo lectura: sin contacto ni QR (el QR es la entrada).
    const visible = user.canEdit ? attendees : attendees.map(({ email: _e, phone: _p, qr_token: _q, ...rest }) => ({ ...rest, email: null, phone: null, qr_token: '' }))
    return NextResponse.json(
      { attendees: visible, arrivals: arrivals.map((c) => c.scanned_at), duplicates: duplicates ?? 0, web: await webSales(event) },
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
    assertOpen(await getEvent(id))
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
