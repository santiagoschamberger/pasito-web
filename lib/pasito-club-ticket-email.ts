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
    contentId: `club-${ticket.id}@pasito`,
  })))

  const cards = tickets.map((ticket) => `
    <div style="margin:0 0 18px;padding:20px;border:1px solid #e7eadf;border-radius:18px;background:#fbfcf5;text-align:center;">
      <p style="margin:0 0 4px;color:#006d42;font-size:15px;font-weight:800;">${escapeHtml(ticket.label)}</p>
      <img src="cid:club-${ticket.id}@pasito" width="220" height="220" alt="QR de tu entrada" style="display:block;width:220px;height:220px;max-width:100%;margin:12px auto;border-radius:12px;" />
      <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#00402e;font-size:20px;font-weight:800;letter-spacing:.12em;">${escapeHtml(ticket.code)}</p>
      <a href="${pasitoClubTicketUrl(params.origin, ticket.id)}" style="display:inline-block;margin-top:12px;color:#006d42;font-size:13px;font-weight:700;">Abrir entrada</a>
    </div>`).join('')

  const greeting = order.customerName ? `${escapeHtml(order.customerName)}, ` : ''
  const html = `<!doctype html>
  <html lang="es"><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#f3f5ed;">
    <div style="max-width:560px;margin:0 auto;padding:38px 22px 48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#00402e;">
      <div style="background:#006d42;border-radius:24px 24px 0 0;padding:26px;text-align:center;">
        <img src="https://www.pasito.app/pasito-club/logo.png" alt="Pasito Club" width="150" style="display:inline-block;" />
      </div>
      <div style="background:#fff;border-radius:0 0 24px 24px;padding:30px 24px;">
        <h1 style="margin:0 0 12px;font-size:27px;line-height:1.12;">¡Estás adentro!</h1>
        <p style="margin:0 0 22px;color:#536158;font-size:15px;line-height:1.6;">${greeting}tu pago está confirmado. Acá tenés una entrada por cada fecha que elegiste.</p>
        <div style="margin:0 0 24px;padding:16px 18px;border-radius:14px;background:#ebfa61;color:#00402e;">
          <p style="margin:0 0 4px;font-size:14px;"><strong>Miércoles ${escapeHtml(PASITO_CLUB_EVENT.timeLabel)}</strong> · ${escapeHtml(PASITO_CLUB_EVENT.venueLabel)}</p>
          <p style="margin:0;font-size:14px;">Total: <strong>${pasitoClubMoney(order.amount)}</strong></p>
        </div>
        ${cards}
        <p style="margin:20px 0 0;color:#66736b;font-size:13px;line-height:1.55;">Cada QR es único y se valida una sola vez, el día de esa fecha. Mostralo desde el celular; no hace falta imprimirlo.</p>
        <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #eef0e8;font-size:14px;">Nos vemos el miércoles,<br><strong>Pasito Club</strong></p>
      </div>
    </div>
  </body></html>`

  const text = [
    'Pasito Club · ¡Estás adentro!',
    'Tu pago está confirmado. Acá tenés una entrada por cada fecha que elegiste.',
    `Miércoles ${PASITO_CLUB_EVENT.timeLabel} · ${PASITO_CLUB_EVENT.venueLabel}`,
    `Total: ${pasitoClubMoney(order.amount)}`,
    '',
    ...tickets.flatMap((ticket) => [`${ticket.label} · Código: ${ticket.code}`, pasitoClubTicketUrl(params.origin, ticket.id), '']),
    'Cada QR es único y se valida una sola vez. Mostralo desde el celular.',
  ].join('\n')

  const { data, error } = await new Resend(apiKey).emails.send({
    from: 'Pasito Club <noreply@pasito.app>',
    to: order.email,
    subject: 'Tus entradas para Pasito Club',
    html,
    text,
    attachments,
  }, { idempotencyKey: `pasito-club-confirmation-${order.paymentId}` })
  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Resend no devolvió un identificador de email.')
  return { id: data.id }
}
