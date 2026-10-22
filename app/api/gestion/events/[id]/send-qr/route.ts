import { NextRequest, NextResponse } from 'next/server'

import { assertOpen, db, getEvent, handleError, HttpError, logActivity, publicOrigin, readJson, requireUser } from '@/lib/gestion/server'
import { sendTicketEmails } from '@/lib/gestion/email'

// Manda por mail el link al QR personal. Por defecto saltea a quien ya lo recibió.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    const event = await getEvent(id)
    assertOpen(event)
    const body = await readJson<{ attendeeIds?: string[]; resend?: boolean }>(request)
    if (!Array.isArray(body.attendeeIds) || !body.attendeeIds.length) throw new HttpError(400, 'Elegí a quién mandarle el QR.')
    if (body.attendeeIds.length > 500) throw new HttpError(400, 'Máximo 500 mails por envío.')
    let query = db().from('gestion_attendees').select('id, name, email, qr_token').eq('event_id', id).in('id', body.attendeeIds).is('deleted_at', null).not('email', 'is', null)
    if (!body.resend) query = query.is('qr_sent_at', null)
    const { data, error } = await query
    if (error) throw error
    const when = event.start_date
      ? `${new Date(`${event.start_date}T12:00:00-03:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}${event.start_time ? `, ${event.start_time}` : ''}`
      : 'Fecha a confirmar'
    const origin = publicOrigin(request)
    const targets = data ?? []
    const { sent, failed } = await sendTicketEmails(targets.map((a) => ({ to: a.email as string, name: a.name, eventName: event.name, when, venue: event.venue ?? '', link: `${origin}/gestion/entrada/${a.qr_token}` })))
    const sentIds = targets.filter((a) => sent.includes(a.email as string)).map((a) => a.id)
    for (let i = 0; i < sentIds.length; i += 500) {
      await db().from('gestion_attendees').update({ qr_sent_at: new Date().toISOString() }).in('id', sentIds.slice(i, i + 500))
    }
    await logActivity({ eventId: id, actor: user.email, action: 'send', entity: 'attendee', summary: `mandó ${sent.length} QR por mail` })
    return NextResponse.json({ sent: sent.length, failed: failed.length, skipped: body.attendeeIds.length - targets.length })
  } catch (error) {
    return handleError(error)
  }
}
