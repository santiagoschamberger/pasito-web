import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { CheckCircle2, Clock3, MapPin, ShieldX } from 'lucide-react'

import { TOMATE_EVENT } from '@/lib/tomate-event'
import { getTomateSupabase } from '@/lib/tomate-server'
import { readTicketToken } from '@/lib/tomate-ticket-security'
import styles from './ticket.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tu entrada · Pasito x TOMATE',
  robots: { index: false, follow: false },
}

type TicketRow = {
  id: string
  order_id: string
  short_code: string
  ticket_number: number
  status: 'valid' | 'used' | 'void'
  checked_in_at: string | null
}

export default async function TomateTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ticketId = readTicketToken(token)
  if (!ticketId) notFound()

  const db = getTomateSupabase()
  const { data: rawTicket, error: ticketError } = await db
    .from('event_tickets')
    .select('id, order_id, short_code, ticket_number, status, checked_in_at')
    .eq('id', ticketId)
    .maybeSingle()
  if (ticketError || !rawTicket) notFound()
  const ticket = rawTicket as TicketRow

  const { data: order, error: orderError } = await db
    .from('event_ticket_orders')
    .select('event_slug, payment_status, quantity')
    .eq('id', ticket.order_id)
    .maybeSingle()
  if (orderError || !order || order.event_slug !== TOMATE_EVENT.slug) notFound()

  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'pasito.app'
  const protocol = requestHeaders.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const ticketUrl = `${protocol}://${host}/evento-pasito/ticket/${token}`
  const qr = await QRCode.toDataURL(ticketUrl, {
    width: 760,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#006d42', light: '#ffffff' },
  })
  const effectiveStatus = order.payment_status === 'approved' ? ticket.status : 'void'

  return (
    <main className={styles.page}>
      <Link href="/evento-pasito" className={styles.logo} aria-label="Volver al evento">
        <Image src="/brand/logo-green.svg" alt="Pasito" width={112} height={27} priority />
      </Link>

      <article className={styles.ticket}>
        <header>
          <p>Pasito Walking Club × TOMATE</p>
          <h1>Tu entrada</h1>
          <span>#{ticket.ticket_number} de {order.quantity}</span>
        </header>

        <div className={styles.qrWrap}>
          {/* The generated data URL is local and avoids any third-party QR service. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR de la entrada" width="300" height="300" />
          {effectiveStatus !== 'valid' && <div className={styles.qrOverlay} />}
        </div>

        <div className={styles.codeBlock}>
          <small>Código manual</small>
          <strong>{ticket.short_code}</strong>
        </div>

        {effectiveStatus === 'valid' ? (
          <div className={`${styles.status} ${styles.valid}`}><CheckCircle2 size={19} /> Entrada válida</div>
        ) : effectiveStatus === 'used' ? (
          <div className={`${styles.status} ${styles.used}`}><CheckCircle2 size={19} /> Entrada ya utilizada</div>
        ) : (
          <div className={`${styles.status} ${styles.void}`}><ShieldX size={19} /> Entrada anulada</div>
        )}

        <dl>
          <div><dt><Clock3 size={18} /> Fecha y hora</dt><dd>{TOMATE_EVENT.dateLabel}<br />{TOMATE_EVENT.timeLabel}</dd></div>
          <div><dt><MapPin size={18} /> Lugar</dt><dd>{TOMATE_EVENT.venueLabel}</dd></div>
        </dl>

        <p className={styles.note}>Mostrá este QR al ingresar. Es único y puede validarse una sola vez. No hace falta imprimirlo.</p>
      </article>

      <Link href="/evento-pasito/entradas" className={styles.recover}>Reenviar todas mis entradas por email</Link>
    </main>
  )
}
