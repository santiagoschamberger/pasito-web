import 'server-only'
import QRCode from 'qrcode'
import { Resend } from 'resend'
import { WALKING_CLUB_UY_EVENT, walkingClubUyMoney } from '@/lib/uruguay-walking-club-event'
import { createTicketToken } from '@/lib/tomate-ticket-security'

export async function sendWalkingClubUyTicketsEmail(params: {
  origin: string; order: { id: string; customer_email: string; amount: number };
  tickets: { id: string; short_code: string; ticket_number: number }[]
}): Promise<{ id: string }> {
  if (!process.env.RESEND_API_KEY) throw new Error('Falta RESEND_API_KEY.')
  const urls = params.tickets.map(ticket => `${params.origin}/walking-club-uy/ticket/${createTicketToken(ticket.id)}`)
  const attachments = await Promise.all(params.tickets.map(async (ticket, index) => ({
    filename: `entrada-walking-club-uy-${ticket.ticket_number}.png`,
    content: await QRCode.toBuffer(urls[index], { type: 'png', width: 720, margin: 2 }),
  })))
  const text = [
    '¡Tus entradas para Pasito Walking Club Uruguay!',
    `${WALKING_CLUB_UY_EVENT.dateLabel} · ${WALKING_CLUB_UY_EVENT.timeLabel}`,
    WALKING_CLUB_UY_EVENT.venueLabel,
    `Total: ${walkingClubUyMoney(params.order.amount)} UYU`, '',
    ...params.tickets.map((ticket, index) => `Entrada ${ticket.ticket_number} · Código: ${ticket.short_code}\n${urls[index]}`),
    '', 'Mostrá el QR al ingresar. Compartí una entrada distinta con cada acompañante.',
    'Si necesitás ayuda, escribinos a hola@pasito.app.',
  ].join('\n')
  const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: 'Pasito <noreply@pasito.app>', to: params.order.customer_email,
    subject: 'Tus entradas · Pasito Walking Club Uruguay', text, attachments,
  }, { idempotencyKey: `walking-club-uy-confirmation-${params.order.id}` })
  if (error || !data?.id) throw new Error(error?.message || 'No se pudo enviar el email.')
  return { id: data.id }
}
