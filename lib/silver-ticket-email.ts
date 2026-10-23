import { buildPasitoLetter } from './email-layout.ts'
import 'server-only'

import QRCode from 'qrcode'
import { Resend } from 'resend'

import { SILVER_EVENT, silverMoney, type EventTicket } from '@/lib/silver-event'
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
  return `${origin}/silver/ticket/${createTicketToken(ticketId)}`
}

export async function sendSilverTicketsEmail(params: {
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
  if (!allTickets.length) throw new Error('No hay entradas para enviar.')
  const attachments = await Promise.all(allTickets.map(async ({ ticket }, index) => ({
    filename: `entrada-silver-walk-${index + 1}.png`,
    content: await QRCode.toBuffer(ticketUrl(params.origin, ticket.id), {
      type: 'png',
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#0C6B45', light: '#FFFFFF' },
    }),
  })))

  const totalAmount = params.orders.reduce((sum, order) => sum + order.amount, 0)
  const text = [
    SILVER_EVENT.name,
    'Organizan Pasito + Kiwell en colaboración',
    '',
    params.kind === 'confirmation' ? 'Tu pago está confirmado.' : 'Acá tenés nuevamente tus entradas.',
    `${SILVER_EVENT.dateLabel} · ${SILVER_EVENT.timeLabel}`,
    SILVER_EVENT.venueLabel,
    ...(params.kind === 'confirmation' ? [`Total: ${silverMoney(totalAmount)}`] : []),
    '',
    ...allTickets.flatMap(({ ticket }, index) => [
      `Entrada ${index + 1} de ${allTickets.length} · Código: ${ticket.code}`,
      `Abrir entrada y QR: ${ticketUrl(params.origin, ticket.id)}`,
      '',
    ]),
    'Guardá este email. Podés mostrar el QR desde tu celular; no hace falta imprimirlo.',
    ...(allTickets.length > 1 ? ['Si venís con acompañantes, compartí una entrada distinta con cada persona.'] : []),
    'Nos vemos en Augusta,',
    'Pasito + Kiwell',
  ].join('\n')

  const letter = buildPasitoLetter({ subject: params.kind === 'confirmation' ? 'Tus entradas para Silver Walks by Nutren' : 'Reenvío de entradas · Silver Walks by Nutren',
    preview: 'Los QR están adjuntos; también podés abrir cada entrada.', campaign: 'silver-entradas',
    paragraphs: [firstOrder.customerName?.trim() ? `Hola ${firstOrder.customerName.trim()} 👋` : 'Hola 👋', ...text.split('\n').filter(p => p.trim() && !['Nos vemos en Augusta,','Pasito + Kiwell'].includes(p)),
      ...(params.pasitosRewards ?? []).filter(r => r.amount > 0).map(r => r.status === 'credited' ? `${r.amount} Pasitos acreditados para ${r.quantity} entrada(s).` : `${r.amount} Pasitos para repartir: ${r.claimUrl}`)],
    action: { label: 'Abrir mi entrada', url: ticketUrl(params.origin, allTickets[0].ticket.id) }, preserveActionUrl: true,
    footer: 'Te llega este mail por tus entradas para Silver Walks by Nutren. Organizan Pasito + Kiwell.' })
  const unique = params.kind === 'confirmation'
    ? firstOrder.paymentId
    : `${firstOrder.id}-${Math.floor(Date.now() / 120_000)}`
  const { data, error } = await new Resend(apiKey).emails.send({
    from: 'Pasito <noreply@pasito.app>',
    to: firstOrder.customerEmail,
    ...letter,
    attachments,
  }, { idempotencyKey: `silver-${params.kind}-${unique}` })

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Resend no devolvió un identificador de email.')
  return { id: data.id }
}
