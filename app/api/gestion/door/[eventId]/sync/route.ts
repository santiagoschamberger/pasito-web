import { NextRequest, NextResponse } from 'next/server'

import { db, getEvent, handleError, HttpError, readJson, requireDoor } from '@/lib/gestion/server'
import { doorAttendees } from '@/lib/gestion/door'
import { syncSources } from '@/lib/gestion/sources'

type PendingCheckin = { id?: unknown; attendee_id?: unknown; action?: unknown; scanned_at?: unknown }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Sube los check-ins guardados en el celular y baja los cambios de las otras puertas.
export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const door = await requireDoor(request, eventId)
    const event = await getEvent(eventId)
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
    let lookup: { eventName: string; retry?: boolean } | null = null
    if (typeof body.lookup === 'string' && body.lookup.length <= 300) {
      const raw = body.lookup.trim()
      const webId = raw.match(/pt1\.([0-9a-f-]{36})\./i)?.[1]
      const value = raw.replace(/[^A-Za-z0-9_-]/g, '')
      const filter = webId ? `origin_ref.eq.web:${webId.toLowerCase()}` : `qr_token.eq.${value},app_code.eq.${value.toUpperCase()}`
      const { data } = await db().from('gestion_attendees').select('event_id, gestion_events(name)').or(filter).neq('event_id', eventId).limit(1).maybeSingle()
      if (data) lookup = { eventName: (data.gestion_events as unknown as { name: string } | null)?.name ?? 'otro evento' }
      else if (webId || /^[A-F0-9]{10}$/i.test(value)) {
        // Entrada web que todavía no está en la lista de ningún evento.
        const { data: ticket } = await db().from('event_tickets').select('event_ticket_tiers(event_slug, position)').or(webId ? `id.eq.${webId.toLowerCase()}` : `short_code.eq.${value.toUpperCase()}`).limit(1).maybeSingle()
        const tier = ticket?.event_ticket_tiers as unknown as { event_slug: string; position: number } | null
        const key = tier ? `${tier.event_slug}:${tier.position}` : null
        if (key && event.web_tiers.includes(key)) {
          // Comprada recién: se trae ya y el celular vuelve a evaluar el QR.
          await syncSources(event).catch((e) => console.error('[gestion] sync', e))
          lookup = { eventName: event.name, retry: true }
        } else if (key) {
          const { data: owner } = await db().from('gestion_events').select('name').contains('web_tiers', [key]).neq('id', eventId).order('start_date').limit(1).maybeSingle()
          lookup = { eventName: owner?.name ?? tier!.event_slug }
        }
      }
    }

    const sinceRaw = typeof body.since === 'string' && !Number.isNaN(Date.parse(body.since)) ? body.since : undefined
    if (!sinceRaw) throw new HttpError(400, 'Falta la marca de sincronización.')
    // Ventas web nuevas e ingresos del escáner viejo, como mucho una vez por minuto.
    if (event.status !== 'cerrado') await syncSources(event, { minIntervalMs: 60_000 }).catch((e) => console.error('[gestion] sync', e))
    // Se relee con 30 s de solapamiento: una transacción de otra puerta que empezó antes
    // de esta marca pero terminó después no se pierde. Aplicar dos veces es inocuo.
    const since = new Date(Date.parse(sinceRaw) - 30_000).toISOString()
    const syncedAt = new Date().toISOString()
    return NextResponse.json({ results, changes: await doorAttendees(eventId, since), syncedAt, lookup }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleError(error)
  }
}
