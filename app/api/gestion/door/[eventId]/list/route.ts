import { NextRequest, NextResponse } from 'next/server'

import { db, getEvent, handleError, requireDoor } from '@/lib/gestion/server'
import { doorAttendees } from '@/lib/gestion/door'
import { syncSources } from '@/lib/gestion/sources'

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const door = await requireDoor(request, eventId)
    const event = await getEvent(eventId)
    // Entradas web vendidas a último momento entran a la lista antes de descargarla.
    if (event.status !== 'cerrado') await syncSources(event, { minIntervalMs: 10_000 }).catch((e) => console.error('[gestion] sync', e))
    const { data: owner } = event.owner_email
      ? await db().from('gestion_users').select('name, phone').eq('email', event.owner_email).maybeSingle()
      : { data: null }
    const syncedAt = new Date().toISOString()
    return NextResponse.json(
      {
        event: {
          id: event.id,
          name: event.name,
          capacity: event.capacity,
          allowWalkins: event.door_allow_walkins,
          allowReentry: event.door_allow_reentry,
          ownerName: owner?.name ?? null,
          ownerPhone: owner?.phone ?? null,
        },
        operator: door.op,
        attendees: await doorAttendees(eventId),
        syncedAt,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return handleError(error)
  }
}
