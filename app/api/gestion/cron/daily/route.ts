import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import { db, getRows, listUsers } from '@/lib/gestion/server'
import { sendDigestEmail } from '@/lib/gestion/email'
import type { GestionEvent } from '@/lib/gestion/schema'
import { daysBetween, effectiveStatus, eventAlerts, todayISO } from '@/lib/gestion/summary'

export const maxDuration = 120

const BASE = 'https://eventos.pasito.app'
const RETENTION_DAYS = 180

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization') ?? ''
  if (!secret || secret.length < 16) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

const short = (iso: string) => new Date(`${iso}T12:00:00-03:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })

// Todos los días hábiles: resumen por mail para cada persona y anonimización
// de listas de asistentes a los 6 meses del evento (Ley 25.326).
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const today = todayISO()
  const { data, error } = await db().from('gestion_events').select('*').is('archived_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const all = (data ?? []) as GestionEvent[]

  // 1) Anonimizar listas viejas: quedan los números, se van los datos personales.
  const old = all.filter((e) => e.start_date && daysBetween(e.end_date || e.start_date, today) > RETENTION_DAYS).map((e) => e.id)
  let anonymized = 0
  if (old.length) {
    const { count } = await db()
      .from('gestion_attendees')
      .update({ name: 'Anónimo', email: null, phone: null, dni_last3: null, notes: null }, { count: 'exact' })
      .in('event_id', old)
      .neq('name', 'Anónimo')
    anonymized = count ?? 0
  }

  // 2) Resumen diario.
  const active = all.filter((e) => e.status !== 'cerrado' && e.status !== 'cancelado')
  const rows = await getRows(active.map((e) => e.id))
  const users = (await listUsers()).filter((u) => u.role !== 'lectura')
  const weekEnd = new Date(Date.parse(`${today}T12:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10)
  let sent = 0
  for (const user of users) {
    const tasks = rows
      .filter((r) => r.kind === 'task' && r.data.owner === user.email && r.data.estado !== 'hecha' && typeof r.data.due === 'string' && r.data.due <= weekEnd)
      .sort((a, b) => String(a.data.due).localeCompare(String(b.data.due)))
      .map((r) => {
        const event = active.find((e) => e.id === r.event_id)
        const overdue = String(r.data.due) < today
        return { text: String(r.data.titulo || 'Tarea'), meta: `${event?.name ?? ''} · ${overdue ? 'vencida ' : ''}${short(String(r.data.due))}`, href: `${BASE}/gestion/eventos/${r.event_id}?tab=task`, tone: overdue ? ('bad' as const) : undefined }
      })
    const mine = active.filter((e) => e.owner_email === user.email)
    const alerts = mine.flatMap((e) => eventAlerts(e, rows.filter((r) => r.event_id === e.id), today))
      .filter((a) => a.level === 'critical')
      .map((a) => ({ text: a.text, meta: a.eventName, href: `${BASE}/gestion/eventos/${a.eventId}`, tone: 'bad' as const }))
    const events = active
      .filter((e) => e.start_date && e.start_date >= today && e.start_date <= weekEnd && (e.owner_email === user.email || rows.some((r) => r.event_id === e.id && r.kind === 'team' && r.data.email === user.email)))
      .map((e) => ({ text: e.name, meta: `${short(e.start_date!)}${e.start_time ? ` · ${e.start_time}` : ''}${effectiveStatus(e, today) === 'en_curso' ? ' · hoy' : ''}`, href: `${BASE}/gestion/eventos/${e.id}` }))
    if (!tasks.length && !alerts.length && !events.length) continue
    try {
      await sendDigestEmail({ to: user.email, name: (user.name || user.email).split(' ')[0], tasks, alerts, events, baseUrl: `${BASE}/gestion` })
      sent += 1
    } catch (cause) {
      console.error('[gestion] digest', user.email, cause)
    }
  }
  return NextResponse.json({ sent, anonymized })
}
