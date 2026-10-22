import { NextResponse } from 'next/server'

import { db, getRows, handleError, requireUser } from '@/lib/gestion/server'
import type { GestionEvent } from '@/lib/gestion/schema'
import { webSalesFor } from '@/lib/gestion/sources'
import { checklistProgress, effectiveStatus, eventAlerts, moneySummary, taskCounts, todayISO } from '@/lib/gestion/summary'

export async function GET() {
  try {
    const user = await requireUser()
    const { data, error } = await db().from('gestion_events').select('*').is('archived_at', null).order('start_date', { ascending: true, nullsFirst: false })
    if (error) throw error
    const events = ((data ?? []) as GestionEvent[]).filter((e) => e.status !== 'cerrado' && e.status !== 'cancelado')
    const [rows, sales] = await Promise.all([getRows(events.map((e) => e.id)), webSalesFor(events)])
    const today = todayISO()

    const myTasks = rows
      .filter((r) => r.kind === 'task' && r.data.owner === user.email && r.data.estado !== 'hecha')
      .map((r) => ({ ...r, eventName: events.find((e) => e.id === r.event_id)?.name ?? '' }))
      .sort((a, b) => String(a.data.due || '9999').localeCompare(String(b.data.due || '9999')))

    const alerts = events.flatMap((event) => eventAlerts(event, rows.filter((r) => r.event_id === event.id), today))

    const upcoming = events.map((event) => {
      const own = rows.filter((r) => r.event_id === event.id)
      return {
        ...event,
        effective_status: effectiveStatus(event, today),
        result_projected: moneySummary(own, sales.get(event.id)).resultProjected,
        web: sales.get(event.id) ?? null,
        tasks: taskCounts(own, today),
        alerts_critical: eventAlerts(event, own, today).filter((a) => a.level === 'critical').length,
        alerts_warning: eventAlerts(event, own, today).filter((a) => a.level === 'warning').length,
        checklist: checklistProgress(own),
      }
    })

    return NextResponse.json({ user, today, myTasks, alerts, upcoming }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleError(error)
  }
}
