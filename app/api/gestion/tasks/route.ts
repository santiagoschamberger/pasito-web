import { NextResponse } from 'next/server'

import { db, getRows, handleError, requireUser } from '@/lib/gestion/server'
import type { GestionEvent } from '@/lib/gestion/schema'

// Todas las tareas de los eventos activos, para la vista de equipo.
export async function GET() {
  try {
    await requireUser()
    const { data, error } = await db().from('gestion_events').select('id, name, start_date, status, type').is('archived_at', null).neq('status', 'cerrado').neq('status', 'cancelado')
    if (error) throw error
    const events = (data ?? []) as Pick<GestionEvent, 'id' | 'name' | 'start_date' | 'status' | 'type'>[]
    const tasks = (await getRows(events.map((e) => e.id))).filter((r) => r.kind === 'task')
    return NextResponse.json({ events, tasks }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleError(error)
  }
}
