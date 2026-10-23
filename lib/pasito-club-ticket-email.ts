import { buildPasitoLetter } from './email-layout.ts'
import 'server-only'

import QRCode from 'qrcode'
import { Resend } from 'resend'

import { PASITO_CLUB_EVENT, PASITO_CLUB_RACE, pasitoClubMoney } from '@/lib/pasito-club-event'
import type { ClubOrderBundle, ClubTicket } from '@/lib/pasito-club-server'
import { createTicketToken } from '@/lib/tomate-ticket-security'

export function pasitoClubTicketUrl(origin: string, ticketId: string): string {
  return `${origin}/club/entrada/${createTicketToken(ticketId)}`
}

export function pasitoClubTicketLinks(origin: string, tickets: ClubTicket[]) {
  return tickets.map((ticket) => ({
    code: ticket.code,
    label: ticket.label,
    isRace: ticket.position === PASITO_CLUB_RACE.position,
    url: pasitoClubTicketUrl(origin, ticket.id),
  }))
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character)
}

export async function sendPasitoClubTicketsEmail(params: { origin: string; bundle: ClubOrderBundle }): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Falta RESEND_API_KEY.')
  const { order, tickets } = params.bundle
  if (!tickets.length) throw new Error('No hay entradas para enviar.')

  const attachments = await Promise.all(tickets.map(async (ticket, index) => ({
    filename: `pasito-club-${index + 1}.png`,
    content: await QRCode.toBuffer(pasitoClubTicketUrl(params.origin, ticket.id), {
      type: 'png',
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#006d42', light: '#FFFFFF' },
    }),
  })))

  const letter = buildPasitoLetter({ subject: 'Tus entradas para Pasito Club', preview: 'Tus entradas y los QR adjuntos para cada fecha.', campaign: 'club-entradas',
    paragraphs: ['Hola 👋', 'Tu pago está confirmado. Acá tenés una entrada por cada fecha que elegiste.',
      `Miércoles ${PASITO_CLUB_EVENT.timeLabel} · ${PASITO_CLUB_EVENT.venueLabel}`,
      `Total: ${pasitoClubMoney(order.amount)}`,
      ...tickets.map(t => `${t.label}. Código: ${t.code}. ${pasitoClubTicketUrl(params.origin,t.id)}`),
      'Los QR están adjuntos. Guardá una entrada distinta para cada fecha.'],
    action: { label: 'Abrir mi entrada', url: pasitoClubTicketUrl(params.origin,tickets[0].id) }, preserveActionUrl: true,
    footer: 'Te llega este mail por tus entradas para Pasito Club.' })
  const { data, error } = await new Resend(apiKey).emails.send({
    from: 'Pasito Club <noreply@pasito.app>',
    to: order.email,
    ...letter,
    attachments,
  }, { idempotencyKey: `pasito-club-confirmation-${order.paymentId}` })
  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Resend no devolvió un identificador de email.')
  return { id: data.id }
}
