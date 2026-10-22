import { NextRequest, NextResponse } from 'next/server'

import { db, getEvent, getRows, handleError, HttpError, logActivity, readJson, requireUser } from '@/lib/gestion/server'
import { EVENT_EDITABLE_FIELDS, EVENT_STATUSES, EVENT_TYPES, STATUS_LABEL, type GestionEvent } from '@/lib/gestion/schema'
import { closeBlockers } from '@/lib/gestion/summary'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const event = await getEvent(id)
    const [rows, activity, pasitoEvents] = await Promise.all([
      getRows([id]),
      db().from('gestion_activity').select('id, event_id, actor, action, entity, summary, created_at').eq('event_id', id).order('created_at', { ascending: false }).limit(60),
      event.pasito_event_ids.length
        ? db().from('partner_events').select('id, title, start_at, max_participants, participant_count').in('id', event.pasito_event_ids)
        : Promise.resolve({ data: [] }),
    ])
    return NextResponse.json(
      { event, rows, activity: activity.data ?? [], pasitoEvents: pasitoEvents.data ?? [] },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return handleError(error)
  }
}

function cleanField(field: string, value: unknown): unknown {
  if (value === '' || value === undefined) value = null
  switch (field) {
    case 'name':
      if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, 'El nombre no puede quedar vacío.')
      return value.trim().slice(0, 140)
    case 'type':
      if (!EVENT_TYPES.some((t) => t.value === value)) throw new HttpError(400, 'Tipo inválido.')
      return value
    case 'status':
      if (!EVENT_STATUSES.some((s) => s.value === value)) throw new HttpError(400, 'Estado inválido.')
      return value
    case 'start_date':
    case 'end_date':
      if (value !== null && !(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))) throw new HttpError(400, 'Fecha inválida.')
      return value
    case 'capacity': {
      if (value === null) return null
      const n = Number(value)
      if (!Number.isInteger(n) || n < 0 || n > 1_000_000) throw new HttpError(400, 'Capacidad inválida.')
      return n
    }
    case 'drive_url':
      if (value !== null && !(typeof value === 'string' && /^https:\/\//.test(value))) throw new HttpError(400, 'El link tiene que empezar con https://')
      return value
    case 'pasito_event_ids':
      if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || !/^[0-9a-f-]{36}$/i.test(v))) throw new HttpError(400, 'Eventos inválidos.')
      return [...new Set(value)]
    case 'door_allow_walkins':
    case 'door_allow_reentry':
      return value === true
    default:
      if (value !== null && (typeof value !== 'string' || value.length > 5000)) throw new HttpError(400, 'Valor inválido.')
      return typeof value === 'string' ? value.trim() : value
  }
}

const FIELD_LABEL: Record<string, string> = {
  name: 'el nombre', type: 'el tipo', status: 'el estado', start_date: 'la fecha', end_date: 'la fecha de fin', start_time: 'el horario',
  venue: 'el lugar', city: 'la ciudad', capacity: 'la capacidad', owner_email: 'el responsable', drive_url: 'el link de Drive',
  objective: 'el objetivo', notes: 'las notas', pasito_event_ids: 'los eventos vinculados de la app',
  door_allow_walkins: 'las altas en puerta', door_allow_reentry: 'los reingresos',
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    const event = await getEvent(id)
    const body = await readJson<Record<string, unknown>>(request)

    if (body.archive !== undefined) {
      if (!user.isAdmin && event.owner_email !== user.email) throw new HttpError(403, 'Solo el responsable o un admin puede archivar.')
      const archived_at = body.archive ? new Date().toISOString() : null
      await db().from('gestion_events').update({ archived_at }).eq('id', id)
      await logActivity({ eventId: id, actor: user.email, action: 'archive', entity: 'event', entityId: id, summary: body.archive ? 'archivó el evento' : 'restauró el evento' })
      return NextResponse.json({ event: { ...event, archived_at } })
    }

    if (event.status === 'cerrado' && !(body.status && body.status !== 'cerrado' && user.isAdmin)) {
      throw new HttpError(409, 'El evento está cerrado. Un admin puede reabrirlo.')
    }

    const updates: Partial<Record<string, unknown>> = {}
    for (const field of EVENT_EDITABLE_FIELDS) {
      if (field in body) updates[field] = cleanField(field, body[field])
    }
    if (!Object.keys(updates).length) throw new HttpError(400, 'Nada para guardar.')

    if (updates.status === 'cerrado') {
      const blockers = closeBlockers(await getRows([id]))
      if (blockers.length) return NextResponse.json({ error: 'Todavía no se puede cerrar.', blockers }, { status: 409 })
    }

    const { data, error } = await db().from('gestion_events').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
    if (error) throw error
    const before = event as unknown as Record<string, unknown>
    for (const [field, value] of Object.entries(updates)) {
      const summary = field === 'status'
        ? `cambió el estado a ${STATUS_LABEL[value as GestionEvent['status']]}`
        : `cambió ${FIELD_LABEL[field] ?? field}`
      await logActivity({ eventId: id, actor: user.email, action: 'update', entity: 'event', entityId: id, summary, before: { [field]: before[field] }, after: { [field]: value } })
    }
    return NextResponse.json({ event: data })
  } catch (error) {
    return handleError(error)
  }
}
