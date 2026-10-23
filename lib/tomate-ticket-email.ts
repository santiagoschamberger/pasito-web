import { buildPasitoLetter } from './email-layout.ts'
import 'server-only'

import QRCode from 'qrcode'
import { Resend } from 'resend'

import { TOMATE_EVENT, tomateMoney, type EventTicket } from '@/lib/tomate-event'
import { createTicketToken } from '@/lib/tomate-ticket-security'

type TicketEmailOrder = {
  id: string
  paymentId: string
  customerEmail: string
  customerName: string | null
  amount: number
  quantity: number
  tickets: EventTicket[]
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character)
}

function ticketUrl(origin: string, ticketId: string): string {
  return `${origin}/evento-pasito/ticket/${createTicketToken(ticketId)}`
}

export async function sendTomateTicketsEmail(params: {
  origin: string
  orders: TicketEmailOrder[]
  kind: 'confirmation' | 'recovery'
  pasitosRewards?: Array<{
    amount: number
    quantity: number
    status: 'credited' | 'pending'
    claimUrl: string
  }>
}): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Falta RESEND_API_KEY.')
  const firstOrder = params.orders[0]
  if (!firstOrder) throw new Error('No hay entradas para enviar.')

  const allTickets = params.orders.flatMap((order) => order.tickets.map((ticket) => ({ ticket, order })))
  const attachments = await Promise.all(allTickets.map(async ({ ticket }, index) => ({
    filename: `entrada-pasito-tomate-${index + 1}.png`,
    content: await QRCode.toBuffer(ticketUrl(params.origin, ticket.id), {
      type: 'png',
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#0C6B45', light: '#FFFFFF' },
    }),
  })))

  const totalAmount = params.orders.reduce((sum, order) => sum + order.amount, 0)
  const letter = buildPasitoLetter({ subject: params.kind === 'confirmation' ? 'Tus entradas para Pasito x TOMATE' : 'Reenvío de entradas · Pasito x TOMATE',
    preview: 'Tus entradas y los QR adjuntos para ingresar al evento.', campaign: 'tomate-entradas',
    paragraphs: ['Hola 👋', params.kind === 'confirmation' ? 'Tu pago está confirmado.' : 'Acá tenés nuevamente tus entradas.', TOMATE_EVENT.name,
      `${TOMATE_EVENT.dateLabel} · ${TOMATE_EVENT.timeLabel}`, TOMATE_EVENT.venueLabel,
      ...(params.kind === 'confirmation' ? [`Total: ${tomateMoney(totalAmount)}`] : []),
      ...allTickets.map(({ticket},index) => `Entrada ${index+1} de ${allTickets.length}. Código: ${ticket.code}. ${ticketUrl(params.origin,ticket.id)}`),
      ...(params.pasitosRewards ?? []).filter(r => r.amount > 0).map(r => r.status === 'credited' ? `${r.amount} Pasitos acreditados para ${r.quantity} entrada(s).` : `${r.amount} Pasitos para repartir. Cargá un ID de soporte por entrada: ${r.claimUrl}`),
      'Guardá este email. El QR está adjunto, es único y se valida una sola vez en el ingreso. Podés llevarlo en el celular; no hace falta imprimirlo.'],
    action: { label: 'Abrir mi entrada', url: ticketUrl(params.origin,allTickets[0].ticket.id) }, preserveActionUrl: true,
    footer: 'Te llega este mail por tus entradas para Pasito x TOMATE.' })

  const unique = params.kind === 'confirmation'
    ? firstOrder.paymentId
    : `${firstOrder.id}-${Math.floor(Date.now() / 120_000)}`
  const { data, error } = await new Resend(apiKey).emails.send({
    from: 'Pasito <noreply@pasito.app>',
    to: firstOrder.customerEmail,
    ...letter,
    attachments,
  }, { idempotencyKey: `tomate-${params.kind}-${unique}` })

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Resend no devolvió un identificador de email.')
  return { id: data.id }
}
