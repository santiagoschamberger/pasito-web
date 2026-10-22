import { NextRequest, NextResponse } from 'next/server'

import { db, getEvent, handleError, HttpError, logActivity, publicOrigin, readJson, requireUser } from '@/lib/gestion/server'
import { sendTicketEmail } from '@/lib/gestion/email'

// Manda por mail el link al QR personal. Solo a quienes tienen email y todavía no ingresaron.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    const event = await getEvent(id)
    const body = await readJson<{ attendeeIds?: string[] }>(request)
    if (!Array.isArray(body.attendeeIds) || !body.attendeeIds.length) throw new HttpError(400, 'Elegí a quién mandarle el QR.')
    if (body.attendeeIds.length > 300) throw new HttpError(400, 'Máximo 300 mails por envío.')
    const { data, error } = await db().from('gestion_attendees').select('id, name, email, qr_token').eq('event_id', id).in('id', body.attendeeIds).is('deleted_at', null).not('email', 'is', null)
    if (error) throw error
    const when = event.start_date
      ? `${new Date(`${event.start_date}T12:00:00-03:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}${event.start_time ? `, ${event.start_time}` : ''}`
      : 'Fecha a confirmar'
    const origin = publicOrigin(request)
    let sent = 0
    const failed: string[] = []
    for (const attendee of data ?? []) {
      try {
        await sendTicketEmail({ to: attendee.email, name: attendee.name, eventName: event.name, when, venue: event.venue ?? '', link: `${origin}/gestion/entrada/${attendee.qr_token}` })
        sent += 1
      } catch (cause) {
        console.error('[gestion] send-qr', cause)
        failed.push(attendee.name)
      }
    }
    await logActivity({ eventId: id, actor: user.email, action: 'send', entity: 'attendee', summary: `mandó ${sent} QR por mail` })
    return NextResponse.json({ sent, failed, withoutEmail: body.attendeeIds.length - (data?.length ?? 0) })
  } catch (error) {
    return handleError(error)
  }
}
