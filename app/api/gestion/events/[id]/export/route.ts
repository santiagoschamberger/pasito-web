import { NextRequest, NextResponse } from 'next/server'

import { db, getEvent, handleError, logActivity, requireUser } from '@/lib/gestion/server'

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value)
  // Evita inyección de fórmulas al abrir el CSV en Excel / Sheets.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

// Exportar datos personales: solo admins, y queda registrado.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser({ admin: true })
    const { id } = await params
    const event = await getEvent(id)
    const { data, error } = await db().from('gestion_attendees').select('name, email, phone, dni_last3, kind, origin, companions, companions_in, notes, status, checked_in_at').eq('event_id', id).is('deleted_at', null).order('name')
    if (error) throw error
    const header = ['nombre', 'email', 'telefono', 'dni_ult3', 'tipo', 'origen', 'acompanantes', 'acompanantes_ingresaron', 'notas', 'estado', 'ingreso']
    const lines = [header.join(','), ...(data ?? []).map((a) => [a.name, a.email, a.phone, a.dni_last3, a.kind, a.origin, a.companions, a.companions_in, a.notes, a.status, a.checked_in_at].map(csvCell).join(','))]
    await logActivity({ eventId: id, actor: user.email, action: 'export', entity: 'attendee', summary: `exportó la lista de asistentes (${data?.length ?? 0} personas)` })
    const filename = `asistentes-${event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.csv`
    return new NextResponse(`﻿${lines.join('\n')}`, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return handleError(error)
  }
}
