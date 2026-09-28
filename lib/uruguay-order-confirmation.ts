import 'server-only'
import { WALKING_CLUB_UY_EVENT } from '@/lib/uruguay-walking-club-event'
import { getWalkingClubUySupabase } from '@/lib/uruguay-walking-club-server'
import { getDlocalGoPayment, dlocalGoPaymentMatchesIntent, dlocalGoCustomerName } from '@/lib/uruguay-dlocal'
import { sendWalkingClubUyTicketsEmail } from '@/lib/uruguay-ticket-email'
import { createTicketToken } from '@/lib/tomate-ticket-security'
import { retryEmailDelivery, emailDeliveryErrorMessage } from '@/lib/email-retry'

export async function confirmWalkingClubUyOrder(intentId: string, origin: string, expectedPaymentId?: string) {
  const db = getWalkingClubUySupabase()
  const { data: intent, error: intentError } = await db.from('event_checkout_intents')
    .select('id, amount, currency, payment_provider, payment_provider_id')
    .eq('id', intentId).eq('event_slug', WALKING_CLUB_UY_EVENT.slug).maybeSingle()
  if (intentError) throw intentError
  if (!intent || intent.payment_provider !== 'dlocalgo' || !intent.payment_provider_id
    || intent.payment_provider_id.startsWith('creating:')) throw new Error('El pago aún no fue iniciado.')
  if (expectedPaymentId && expectedPaymentId !== intent.payment_provider_id) throw new Error('El pago no corresponde a la reserva.')

  const payment = await getDlocalGoPayment(intent.payment_provider_id)
  if (!dlocalGoPaymentMatchesIntent(payment, intent)) throw new Error('El pago no coincide con la reserva.')
  if (payment.status !== 'PAID') throw new Error('El pago aún no fue aprobado.')
  const email = payment.payer?.email?.trim().toLowerCase() || ''
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('El pago no incluye un email válido.')

  // The existing atomic ticketing RPC uses a legacy column name. Namespace the
  // provider ID to preserve idempotency without colliding with Rebill payments.
  const { data: result, error } = await db.rpc('event_confirm_ticket_order', {
    p_intent_id: intent.id, p_payment_id: `dlocalgo:${payment.id}`,
    p_amount: intent.amount, p_currency: intent.currency, p_email: email,
    p_customer_name: dlocalGoCustomerName(payment),
  })
  if (error) throw error
  if (!['confirmed', 'duplicate'].includes(result?.status) || !result.orderId) throw new Error('La reserva requiere revisión.')
  const { data: order, error: orderError } = await db.from('event_ticket_orders')
    .update({ dlocalgo_payment_id: payment.id })
    .eq('id', result.orderId).eq('checkout_intent_id', intentId)
    .eq('event_slug', WALKING_CLUB_UY_EVENT.slug)
    .select('id, customer_email, amount, confirmation_email_sent_at').single()
  if (orderError || !order) throw orderError || new Error('No encontramos la orden.')
  const { data: tickets, error: ticketsError } = await db.from('event_tickets')
    .select('id, short_code, ticket_number').eq('order_id', order.id).order('ticket_number')
  if (ticketsError) throw ticketsError
  if (!tickets?.length) throw new Error('No encontramos las entradas.')

  let emailPending = !order.confirmation_email_sent_at
  if (emailPending) {
    try {
      const sent = await retryEmailDelivery(() => sendWalkingClubUyTicketsEmail({ origin, order, tickets }))
      const { error: trackingError } = await db.rpc('event_record_confirmation_email_attempt', {
        p_order_id: order.id, p_attempt_count: sent.attempts, p_email_id: sent.value.id, p_error: null,
      })
      if (trackingError) throw trackingError
      emailPending = false
    } catch (cause) {
      console.error('[walking-club-uy/email]', emailDeliveryErrorMessage(cause))
    }
  }
  return { emailPending, tickets: tickets.map(ticket => ({
    code: ticket.short_code, number: ticket.ticket_number,
    url: `/walking-club-uy/ticket/${createTicketToken(ticket.id)}`,
  })) }
}
