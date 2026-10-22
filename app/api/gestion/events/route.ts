import { NextRequest, NextResponse } from 'next/server'

import { db, getRows, handleError, HttpError, logActivity, readJson, requireUser } from '@/lib/gestion/server'
import { EVENT_TYPES, type EventType, type GestionEvent, type RowData, type RowKind } from '@/lib/gestion/schema'
import { webSalesFor } from '@/lib/gestion/sources'
import { checklistProgress, duplicateSeeds, effectiveStatus, eventAlerts, moneySummary, taskCounts, TEMPLATES } from '@/lib/gestion/summary'

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const archived = request.nextUrl.searchParams.get('archived') === '1'
    let query = db().from('gestion_events').select('*').order('start_date', { ascending: true, nullsFirst: false })
    query = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null)
    const { data, error } = await query
    if (error) throw error
    const events = (data ?? []) as GestionEvent[]
    const [rows, sales] = await Promise.all([getRows(events.map((e) => e.id)), webSalesFor(events)])
    const cards = events.map((event) => {
      const own = rows.filter((r) => r.event_id === event.id)
      const web = sales.get(event.id) ?? null
      const money = moneySummary(own, web)
      const alerts = eventAlerts(event, own)
      return {
        ...event,
        effective_status: effectiveStatus(event),
        result_projected: money.resultProjected,
        web,
        tasks: taskCounts(own),
        checklist: checklistProgress(own),
        alerts_critical: alerts.filter((a) => a.level === 'critical').length,
        alerts_warning: alerts.filter((a) => a.level === 'warning').length,
      }
    })
    return NextResponse.json({ events: cards }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser({ edit: true })
    const body = await readJson<{ name?: string; type?: string; start_date?: string; duplicateFrom?: string }>(request)
    const name = (body.name ?? '').trim().slice(0, 140)
    if (!name) throw new HttpError(400, 'Poné un nombre.')

    let type: EventType = EVENT_TYPES.some((t) => t.value === body.type) ? (body.type as EventType) : 'otro'
    let seeds: { kind: RowKind; data: RowData }[] = TEMPLATES[type]
    let extra: Partial<GestionEvent> = {}
    if (body.duplicateFrom) {
      const { data: source } = await db().from('gestion_events').select('*').eq('id', body.duplicateFrom).maybeSingle()
      if (!source) throw new HttpError(404, 'No encontramos el evento a duplicar.')
      const src = source as GestionEvent
      type = src.type
      extra = { venue: src.venue, city: src.city, capacity: src.capacity, owner_email: src.owner_email, objective: src.objective }
      seeds = duplicateSeeds(await getRows([src.id]))
    }

    const start = body.start_date && /^\d{4}-\d{2}-\d{2}$/.test(body.start_date) ? body.start_date : null
    const { data, error } = await db()
      .from('gestion_events')
      .insert({ name, type, start_date: start, owner_email: user.email, created_by: user.email, ...extra })
      .select('*')
      .single()
    if (error) throw error
    const event = data as GestionEvent

    if (seeds.length) {
      const { error: rowsError } = await db().from('gestion_rows').insert(
        seeds.map((seed, index) => ({ event_id: event.id, kind: seed.kind, data: seed.data, position: index, created_by: user.email })),
      )
      if (rowsError) throw rowsError
    }
    await logActivity({
      eventId: event.id,
      actor: user.email,
      action: 'create',
      entity: 'event',
      entityId: event.id,
      summary: body.duplicateFrom ? `duplicó un evento anterior como "${name}"` : `creó el evento "${name}"`,
    })
    return NextResponse.json({ event })
  } catch (error) {
    return handleError(error)
  }
}
