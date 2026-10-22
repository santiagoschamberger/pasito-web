import 'server-only'

import { cleanAttendee, insertAttendees } from './attendees'
import { db, getRows } from './server'
import type { GestionEvent } from './schema'

// Fuentes automáticas de asistentes: entradas vendidas en la web (las escribe el
// webhook de Rebill / dLocal en event_ticket_orders) y participantes de la app.
// Se leen de la misma base, así que el sistema queda al día sin pasos manuales.

type WebTicket = {
  ticket_id: string
  short_code: string
  ticket_number: number
  order_quantity: number
  customer_name: string | null
  customer_email: string | null
  checked_in_at: string | null
  ticket_status: 'valid' | 'used' | 'void'
  approved: boolean
  tier_key: string
  revenue: number
  ordered_at: string
}

export type WebSales = { tickets: number; revenue: number; checkedIn: number; refunded: number; capacity: number | null }

const EMPTY_SALES: WebSales = { tickets: 0, revenue: 0, checkedIn: 0, refunded: 0, capacity: null }

async function webTickets(tiers: string[]): Promise<WebTicket[]> {
  if (!tiers.length) return []
  const { data, error } = await db().rpc('gestion_web_tickets', { p_tiers: tiers })
  if (error) throw error
  return (data ?? []) as WebTicket[]
}

const isActive = (t: WebTicket) => t.approved && t.ticket_status !== 'void'

// Ventas por evento, con una sola consulta para todos.
export async function webSalesFor(events: Pick<GestionEvent, 'id' | 'web_tiers'>[]): Promise<Map<string, WebSales>> {
  const result = new Map<string, WebSales>()
  const tiers = [...new Set(events.flatMap((e) => e.web_tiers ?? []))]
  if (!tiers.length) return result
  const [tickets, options] = await Promise.all([
    webTickets(tiers),
    db().rpc('gestion_web_tier_options').then(({ data }) => (data ?? []) as { tier_key: string; capacity: number | null }[]),
  ])
  for (const event of events) {
    if (!event.web_tiers?.length) continue
    const own = tickets.filter((t) => event.web_tiers.includes(t.tier_key))
    const active = own.filter(isActive)
    const capacities = event.web_tiers.map((key) => options.find((o) => o.tier_key === key)?.capacity ?? null)
    result.set(event.id, {
      tickets: active.length,
      revenue: active.reduce((sum, t) => sum + Number(t.revenue || 0), 0),
      checkedIn: active.filter((t) => t.checked_in_at).length,
      refunded: own.filter((t) => !t.approved).length,
      capacity: capacities.every((c) => c === null) ? null : capacities.reduce<number>((sum, c) => sum + (c ?? 0), 0),
    })
  }
  return result
}

export async function webSales(event: Pick<GestionEvent, 'id' | 'web_tiers'>): Promise<WebSales> {
  return (await webSalesFor([event])).get(event.id) ?? EMPTY_SALES
}

async function syncWeb(event: GestionEvent): Promise<number> {
  if (!event.web_tiers?.length) return 0
  const tickets = await webTickets(event.web_tiers)
  const items = tickets.filter(isActive).map((t) =>
    cleanAttendee({
      name: t.customer_name?.trim() || t.customer_email?.split('@')[0] || `Entrada ${t.short_code}`,
      email: t.customer_email,
      origin: 'ticketera',
      origin_ref: `web:${t.ticket_id}`,
      app_code: t.short_code,
      notes: t.order_quantity > 1 ? `Entrada ${t.ticket_number} de ${t.order_quantity}` : null,
    }, 'ticketera'),
  ).filter((i): i is NonNullable<typeof i> => i !== null)
  const { inserted } = await insertAttendees(event.id, items)

  // Conciliación: ingresos hechos con el escáner viejo y entradas reembolsadas.
  const { data: existing, error } = await db()
    .from('gestion_attendees')
    .select('id, origin_ref, status, deleted_at')
    .eq('event_id', event.id)
    .like('origin_ref', 'web:%')
  if (error) throw error
  const byTicket = new Map(tickets.map((t) => [`web:${t.ticket_id}`, t]))
  const now = new Date().toISOString()
  for (const attendee of existing ?? []) {
    const ticket = byTicket.get(attendee.origin_ref as string)
    if (!ticket) continue
    if (!isActive(ticket) && !attendee.deleted_at && attendee.status === 'anotado') {
      await db().from('gestion_attendees').update({ deleted_at: now, updated_at: now, notes: 'Entrada anulada o reembolsada' }).eq('id', attendee.id)
    } else if (isActive(ticket) && ticket.checked_in_at && attendee.status === 'anotado' && !attendee.deleted_at) {
      await db().from('gestion_attendees').update({ status: 'ingreso', checked_in_at: ticket.checked_in_at, checked_in_device: 'escaner-web', updated_at: now }).eq('id', attendee.id)
    }
  }
  return inserted.length
}

async function syncApp(event: GestionEvent): Promise<number> {
  if (!event.pasito_event_ids.length) return 0
  const { data, error } = await db().rpc('gestion_pasito_event_attendees', { p_event_ids: event.pasito_event_ids })
  if (error) throw error
  const items = ((data ?? []) as { user_id: string; display_name: string | null; email: string | null; credential_code: string | null }[])
    .map((person) => cleanAttendee({
      name: person.display_name || person.email?.split('@')[0] || 'Usuario Pasito',
      email: person.email,
      origin: 'app',
      origin_ref: person.user_id,
      app_code: person.credential_code,
    }, 'app'))
    .filter((i): i is NonNullable<typeof i> => i !== null)
  const { inserted } = await insertAttendees(event.id, items)
  return inserted.length
}

async function syncStaff(event: GestionEvent): Promise<number> {
  const items = []
  for (const row of await getRows([event.id])) {
    if (row.kind === 'team' && row.data.persona) {
      items.push(cleanAttendee({ name: row.data.persona, phone: row.data.telefono, kind: 'staff', origin: 'staff', origin_ref: `team:${row.id}`, notes: [row.data.rol, row.data.ubicacion].filter(Boolean).join(' · ') }, 'staff'))
    }
    if (row.kind === 'vendor' && row.data.proveedor) {
      items.push(cleanAttendee({ name: `${row.data.proveedor}${row.data.servicio ? ` (${row.data.servicio})` : ''}`, kind: 'staff', origin: 'staff', origin_ref: `vendor:${row.id}`, notes: row.data.llegada ? `Llega ${row.data.llegada}` : null }, 'staff'))
    }
  }
  const { inserted } = await insertAttendees(event.id, items.filter((i): i is NonNullable<typeof i> => i !== null))
  return inserted.length
}

const lastSync = new Map<string, number>()

// Sincroniza las fuentes automáticas. Con `minIntervalMs` evita repetir en cada request.
export async function syncSources(event: GestionEvent, options: { staff?: boolean; minIntervalMs?: number } = {}) {
  const last = lastSync.get(event.id) ?? 0
  if (options.minIntervalMs && Date.now() - last < options.minIntervalMs) return { web: 0, app: 0, staff: 0 }
  lastSync.set(event.id, Date.now())
  const [web, app, staff] = await Promise.all([syncWeb(event), syncApp(event), options.staff ? syncStaff(event) : Promise.resolve(0)])
  return { web, app, staff }
}
