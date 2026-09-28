import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Check, ExternalLink } from 'lucide-react'
import { redirect } from 'next/navigation'

import { WALKING_CLUB_UY_EVENT, isUuid } from '@/lib/uruguay-walking-club-event'
import { getWalkingClubUySupabase } from '@/lib/uruguay-walking-club-server'
import { getDlocalGoPayment, normalizeDlocalGoStatus, isDlocalGoPaymentAmountValid, dlocalGoCustomerName } from '@/lib/uruguay-dlocal'
import styles from '../../evento-pasito/tomate.module.css'

export const metadata: Metadata = {
  title: 'Confirmación de Pago - Pasito Walking Club Uruguay',
  robots: 'noindex',
}

type TicketRow = {
  id: string
  code: string
  ticket_number: number
}

type OrderRow = {
  id: string
  dlocalgo_payment_id: string
  customer_email: string
  customer_name: string | null
  quantity: number
  amount: number
  confirmation_email_sent_at: string | null
}

type IntentRow = {
  id: string
  amount: number
  quantity: number
  customer_email: string | null
  payment_provider_id: string | null
}

async function confirmPaymentIfNeeded(intentId: string): Promise<{
  order: OrderRow | null
  tickets: TicketRow[]
  error?: string
}> {
  const db = getWalkingClubUySupabase()

  // Check if order already exists
  const { data: existingOrders } = await db
    .from('event_ticket_orders')
    .select('id, dlocalgo_payment_id, customer_email, customer_name, quantity, amount, confirmation_email_sent_at')
    .eq('event_slug', WALKING_CLUB_UY_EVENT.slug)
    .or(`payment_metadata->checkoutIntentId.eq.${intentId},dlocalgo_payment_id.not.is.null`)

  if (existingOrders && existingOrders.length > 0) {
    const order = existingOrders[0] as unknown as OrderRow
    const { data: tickets } = await db
      .from('event_tickets')
      .select('id, code, ticket_number')
      .eq('order_id', order.id)
      .order('ticket_number')

    return { order, tickets: tickets as TicketRow[] || [] }
  }

  // Get intent details
  const { data: intent, error: intentError } = await db
    .from('event_checkout_intents')
    .select('id, amount, quantity, customer_email, payment_provider_id')
    .eq('id', intentId)
    .eq('event_slug', WALKING_CLUB_UY_EVENT.slug)
    .maybeSingle()

  if (intentError || !intent) {
    return { order: null, tickets: [], error: 'No encontramos esa reserva.' }
  }

  const typedIntent = intent as unknown as IntentRow
  if (!typedIntent.payment_provider_id) {
    return { order: null, tickets: [], error: 'El pago aún no fue iniciado.' }
  }

  // Verify payment with dLocal Go
  try {
    const payment = await getDlocalGoPayment(typedIntent.payment_provider_id)
    const status = normalizeDlocalGoStatus(payment.status)

    if (status !== 'approved') {
      return { order: null, tickets: [], error: 'El pago aún no fue aprobado.' }
    }

    if (!isDlocalGoPaymentAmountValid(payment.amount, typedIntent.amount)) {
      return { order: null, tickets: [], error: 'El monto del pago no coincide.' }
    }

    // Create order
    const customerName = dlocalGoCustomerName(payment) || null
    const { data: orderData, error: orderError } = await db.rpc('event_confirm_order', {
      p_event_slug: WALKING_CLUB_UY_EVENT.slug,
      p_payment_id: typedIntent.payment_provider_id,
      p_intent_id: intentId,
      p_customer_email: payment.payer?.email || typedIntent.customer_email || '',
      p_customer_name: customerName,
    })

    if (orderError) throw orderError

    const orderId = (orderData as { order_id?: string })?.order_id
    if (!orderId) {
      return { order: null, tickets: [], error: 'No pudimos crear la orden.' }
    }

    const { data: newOrder } = await db
      .from('event_ticket_orders')
      .select('id, dlocalgo_payment_id, customer_email, customer_name, quantity, amount, confirmation_email_sent_at')
      .eq('id', orderId)
      .single()

    const { data: newTickets } = await db
      .from('event_tickets')
      .select('id, code, ticket_number')
      .eq('order_id', orderId)
      .order('ticket_number')

    return { 
      order: newOrder as unknown as OrderRow, 
      tickets: newTickets as TicketRow[] || [] 
    }
  } catch (error) {
    console.error('[payment-success] Error confirming payment:', error)
    return { order: null, tickets: [], error: 'No pudimos verificar el pago. Escribinos para resolverlo.' }
  }
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ intent_id?: string }>
}) {
  const params = await searchParams
  const intentId = params.intent_id

  if (!intentId || !isUuid(intentId)) {
    redirect('/walking-club-uy')
  }

  const { order, tickets, error } = await confirmPaymentIfNeeded(intentId)

  return (
    <main className={styles.page}>
      <div className={styles.container} style={{ maxWidth: '600px', margin: '80px auto', padding: '0 20px' }}>
        {error ? (
          <div className={styles.purchaseSuccess}>
            <span className={styles.successIcon} style={{ background: '#fef2f2', color: '#dc2626' }}>
              <ExternalLink size={30} />
            </span>
            <p className={styles.checkoutEyebrow}>Error</p>
            <h3>{error}</h3>
            <p>Si completaste el pago y ves este mensaje, escribinos a hola@pasito.app con tu email de compra.</p>
            <Link href="/walking-club-uy" className={styles.checkoutPrimary}>
              Volver al evento
            </Link>
          </div>
        ) : order ? (
          <div className={styles.purchaseSuccess}>
            <span className={styles.successIcon}><Check size={30} /></span>
            <p className={styles.checkoutEyebrow}>Compra confirmada</p>
            <h3>¡Tus entradas ya son tuyas!</h3>
            <p>{order.confirmation_email_sent_at ? 'Te enviamos los QR y códigos por email.' : 'El email quedó pendiente y lo vamos a reintentar automáticamente.'} También podés abrirlos ahora:</p>
            <div className={styles.successTickets}>
              {tickets.map((ticket) => (
                <a href={`/walking-club-uy/ticket/${ticket.id}`} target="_blank" rel="noopener noreferrer" key={ticket.code}>
                  <span>Entrada {ticket.ticket_number}</span>
                  <strong>{ticket.code}</strong>
                </a>
              ))}
            </div>
            <Link href="/walking-club-uy" className={styles.checkoutPrimary}>
              Volver al evento
            </Link>
          </div>
        ) : (
          <div className={styles.purchaseSuccess}>
            <span className={styles.successIcon}><Check size={30} /></span>
            <p className={styles.checkoutEyebrow}>Procesando pago</p>
            <h3>Estamos verificando tu pago.</h3>
            <p>Esto puede tardar unos segundos. Recargá la página si no ves tus entradas.</p>
            <Link href="/walking-club-uy" className={styles.checkoutPrimary}>
              Volver al evento
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
