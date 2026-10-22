import { NextRequest, NextResponse } from 'next/server'

import { db, getEvent, getRows, handleError, logActivity, requireUser } from '@/lib/gestion/server'
import { cleanAttendee, insertAttendees } from '@/lib/gestion/attendees'

// Trae a la lista: participantes de los eventos vinculados de la app Pasito,
// el equipo del evento y los proveedores (credenciales de trabajo).
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    const event = await getEvent(id)
    const items: NonNullable<ReturnType<typeof cleanAttendee>>[] = []

    if (event.pasito_event_ids.length) {
      const { data, error } = await db().rpc('gestion_pasito_event_attendees', { p_event_ids: event.pasito_event_ids })
      if (error) throw error
      for (const person of (data ?? []) as { user_id: string; display_name: string | null; email: string | null; credential_code: string | null }[]) {
        const item = cleanAttendee({
          name: person.display_name || person.email?.split('@')[0] || 'Usuario Pasito',
          email: person.email,
          origin: 'app',
          origin_ref: person.user_id,
          app_code: person.credential_code,
        }, 'app')
        if (item) items.push(item)
      }
    }

    for (const row of await getRows([id])) {
      if (row.kind === 'team' && row.data.persona) {
        const item = cleanAttendee({ name: row.data.persona, phone: row.data.telefono, kind: 'staff', origin: 'staff', origin_ref: `team:${row.id}`, notes: [row.data.rol, row.data.ubicacion].filter(Boolean).join(' · ') }, 'staff')
        if (item) items.push(item)
      }
      if (row.kind === 'vendor' && row.data.proveedor) {
        const item = cleanAttendee({ name: `${row.data.proveedor}${row.data.servicio ? ` (${row.data.servicio})` : ''}`, kind: 'staff', origin: 'staff', origin_ref: `vendor:${row.id}`, notes: row.data.llegada ? `Llega ${row.data.llegada}` : null }, 'staff')
        if (item) items.push(item)
      }
    }

    const { inserted, skipped } = await insertAttendees(id, items)
    if (inserted.length) {
      await logActivity({ eventId: id, actor: user.email, action: 'sync', entity: 'attendee', summary: `sincronizó la lista: ${inserted.length} persona(s) nueva(s)` })
    }
    return NextResponse.json({ inserted: inserted.length, skipped })
  } catch (error) {
    return handleError(error)
  }
}
