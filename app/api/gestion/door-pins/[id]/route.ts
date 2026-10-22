import { NextRequest, NextResponse } from 'next/server'

import { db, handleError, HttpError, logActivity, requireUser } from '@/lib/gestion/server'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    const { data } = await db().from('gestion_door_pins').update({ revoked_at: new Date().toISOString() }).eq('id', id).select('event_id, label').maybeSingle()
    if (!data) throw new HttpError(404, 'PIN no encontrado.')
    await logActivity({ eventId: data.event_id, actor: user.email, action: 'revoke', entity: 'door_pin', entityId: id, summary: `revocó el PIN de puerta (${data.label})` })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
