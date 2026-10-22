import { NextRequest, NextResponse } from 'next/server'

import { assertOpen, getEvent, handleError, logActivity, requireUser } from '@/lib/gestion/server'
import { syncSources } from '@/lib/gestion/sources'

// Trae a la lista: entradas web (Rebill), participantes de la app, equipo y proveedores.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    const event = await getEvent(id)
    assertOpen(event)
    const result = await syncSources(event, { staff: true })
    const inserted = result.web + result.app + result.staff
    if (inserted) await logActivity({ eventId: id, actor: user.email, action: 'sync', entity: 'attendee', summary: `sincronizó la lista: ${inserted} persona(s) nueva(s)` })
    return NextResponse.json({ inserted, ...result })
  } catch (error) {
    return handleError(error)
  }
}
