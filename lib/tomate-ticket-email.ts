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
    contentId: `ticket-${ticket.id}@pasito`,
  })))

  const ticketCards = allTickets.map(({ ticket }, index) => `
    <div style="margin:0 0 22px;padding:22px;border:1px solid #e7eadf;border-radius:18px;background:#fbfcf5;text-align:center;">
      <p style="margin:0 0 5px;color:#687064;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Entrada ${index + 1} de ${allTickets.length}</p>
      <img src="cid:ticket-${ticket.id}@pasito" width="250" height="250" alt="QR de tu entrada" style="display:block;width:250px;height:250px;max-width:100%;margin:14px auto;border-radius:12px;" />
      <p style="margin:4px 0 7px;color:#203d2e;font-size:13px;">Si no pueden escanear el QR, mostrales este código:</p>
      <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#0c6b45;font-size:24px;font-weight:800;letter-spacing:.12em;">${escapeHtml(ticket.code)}</p>
      <a href="${ticketUrl(params.origin, ticket.id)}" style="display:inline-block;margin-top:15px;color:#0c6b45;font-size:13px;font-weight:700;">Abrir entrada</a>
    </div>`).join('')

  const totalAmount = params.orders.reduce((sum, order) => sum + order.amount, 0)
  const greeting = firstOrder.customerName ? `${escapeHtml(firstOrder.customerName)}, ` : ''
  const intro = params.kind === 'confirmation'
    ? `${greeting}tu pago está confirmado. ${allTickets.length === 1 ? 'Esta es tu entrada' : 'Estas son tus entradas'} para ${escapeHtml(TOMATE_EVENT.name)}.`
    : `${greeting}acá tenés nuevamente ${allTickets.length === 1 ? 'tu entrada' : 'tus entradas'} para ${escapeHtml(TOMATE_EVENT.name)}.`
  const rewardCards = (params.pasitosRewards ?? []).filter((reward) => reward.amount > 0).map((reward) => (
    reward.status === 'credited'
      ? `<div style="margin:0 0 24px;padding:18px;border-radius:14px;background:#edf8f1;color:#17382a;">
          <p style="margin:0 0 5px;font-size:15px;font-weight:800;">🎁 ${reward.amount} Pasitos acreditados</p>
          <p style="margin:0;color:#536158;font-size:13px;line-height:1.5;">Ya fueron enviados a las cuentas de Pasito indicadas para ${reward.quantity === 1 ? 'la entrada' : `las ${reward.quantity} entradas`}.</p>
        </div>`
      : `<div style="margin:0 0 24px;padding:18px;border-radius:14px;background:#edf8f1;color:#17382a;">
          <p style="margin:0 0 5px;font-size:15px;font-weight:800;">🎁 Tenés ${reward.amount} Pasitos para repartir</p>
          <p style="margin:0 0 14px;color:#536158;font-size:13px;line-height:1.5;">Cargá un ID de soporte por entrada. Si querés, podés usar el mismo ID para ${reward.quantity === 1 ? 'la entrada' : 'todas'}.</p>
          <a href="${escapeHtml(reward.claimUrl)}" style="display:inline-block;padding:11px 16px;border-radius:999px;background:#0c6b45;color:#fff;font-size:13px;font-weight:800;text-decoration:none;">Repartir mis Pasitos</a>
        </div>`
  )).join('')
  const html = `<!doctype html>
  <html><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#f3f5ed;">
    <div style="max-width:560px;margin:0 auto;padding:38px 22px 48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#183327;">
      <div style="background:#0c6b45;border-radius:24px 24px 0 0;padding:28px;text-align:center;">
        <img src="https://pasito.app/pasitohorizontal.png" alt="Pasito" width="112" style="display:inline-block;filter:brightness(0) invert(1);" />
      </div>
      <div style="background:#fff;border-radius:0 0 24px 24px;padding:30px 24px;">
        <p style="margin:0 0 8px;color:#0c6b45;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Pasito Walking Club × TOMATE</p>
        <h1 style="margin:0 0 14px;font-size:27px;line-height:1.12;">${params.kind === 'confirmation' ? '¡Nos vemos en el Rosedal!' : 'Tus entradas, de nuevo'}</h1>
        <p style="margin:0 0 24px;color:#536158;font-size:15px;line-height:1.6;">${intro}</p>
        <div style="margin:0 0 24px;padding:17px 18px;border-radius:14px;background:#effa7a;color:#17382a;">
          <p style="margin:0 0 5px;font-size:14px;"><strong>${escapeHtml(TOMATE_EVENT.dateLabel)}</strong> · ${escapeHtml(TOMATE_EVENT.timeLabel)}</p>
          <p style="margin:0;font-size:14px;">${escapeHtml(TOMATE_EVENT.venueLabel)}</p>
          ${params.kind === 'confirmation' ? `<p style="margin:7px 0 0;font-size:14px;">Total: <strong>${tomateMoney(totalAmount)}</strong></p>` : ''}
        </div>
        ${rewardCards}
        ${ticketCards}
        <p style="margin:22px 0 0;color:#66736b;font-size:13px;line-height:1.55;">Guardá este email. El QR es único y se valida una sola vez en el ingreso. Podés llevarlo en el celular; no hace falta imprimirlo.</p>
        <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #eef0e8;color:#203d2e;font-size:14px;">Nos vemos en la calle,<br><strong>Pasito</strong></p>
      </div>
    </div>
  </body></html>`

  const unique = params.kind === 'confirmation'
    ? firstOrder.paymentId
    : `${firstOrder.id}-${Math.floor(Date.now() / 120_000)}`
  const { data, error } = await new Resend(apiKey).emails.send({
    from: 'Pasito <noreply@pasito.app>',
    to: firstOrder.customerEmail,
    subject: params.kind === 'confirmation'
      ? `${allTickets.length === 1 ? 'Tu entrada' : 'Tus entradas'} para Pasito x TOMATE`
      : `${allTickets.length === 1 ? 'Reenvío de tu entrada' : 'Reenvío de tus entradas'} · Pasito x TOMATE`,
    html,
    attachments,
  }, { idempotencyKey: `tomate-${params.kind}-${unique}` })

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Resend no devolvió un identificador de email.')
  return { id: data.id }
}
