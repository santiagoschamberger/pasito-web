import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { CheckCircle2, Clock3, MapPin, ShieldX } from 'lucide-react'

import { PASITO_CLUB_EVENT, PASITO_CLUB_RACE } from '@/lib/pasito-club-event'
import { pasitoClubStore } from '@/lib/pasito-club-server'
import { readTicketToken } from '@/lib/tomate-ticket-security'
import styles from '../../../evento-pasito/ticket/[token]/ticket.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tu entrada · Pasito Club',
  robots: { index: false, follow: false },
}

export default async function PasitoClubTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ticketId = readTicketToken(token)
  if (!ticketId) notFound()

  const found = await pasitoClubStore().loadTicket(ticketId)
  if (!found) notFound()
  const { ticket, paymentStatus } = found
  const isRace = ticket.position === PASITO_CLUB_RACE.position

  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'pasito.app'
  const protocol = requestHeaders.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const qr = await QRCode.toDataURL(`${protocol}://${host}/club/entrada/${token}`, {
    width: 760,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#006d42', light: '#ffffff' },
  })
  const effectiveStatus = paymentStatus === 'approved' ? ticket.status : 'void'

  return (
    <main className={styles.page}>
      <Link href="/club" className={styles.logo} aria-label="Volver a Pasito Club">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pasito-club/logo.svg" alt="Pasito Club" width={140} height={60} />
      </Link>

      <article className={styles.ticket}>
        <header>
          <p>Pasito Club</p>
          <h1>{ticket.label.split(' · ')[0]}</h1>
          <span>{ticket.label.split(' · ')[1] ?? ''}</span>
        </header>

        <div className={styles.qrWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR de la entrada" width="300" height="300" />
          {effectiveStatus !== 'valid' && <div className={styles.qrOverlay} />}
        </div>

        <div className={styles.codeBlock}>
          <small>Código manual</small>
          <strong>{ticket.code}</strong>
        </div>

        {effectiveStatus === 'valid' ? (
          <div className={`${styles.status} ${styles.valid}`}><CheckCircle2 size={19} /> Entrada válida</div>
        ) : effectiveStatus === 'used' ? (
          <div className={`${styles.status} ${styles.used}`}><CheckCircle2 size={19} /> Entrada ya utilizada</div>
        ) : (
          <div className={`${styles.status} ${styles.void}`}><ShieldX size={19} /> Entrada anulada</div>
        )}

        <dl>
          <div>
            <dt><Clock3 size={18} /> Fecha y hora</dt>
            <dd>{isRace ? `${PASITO_CLUB_RACE.longLabel} · 3K o 5K` : `${ticket.label.split(' · ')[1] ?? ''} · ${PASITO_CLUB_EVENT.timeLabel}`}</dd>
          </div>
          <div><dt><MapPin size={18} /> Lugar</dt><dd>{isRace ? 'Te pasamos el punto de largada por WhatsApp' : PASITO_CLUB_EVENT.venueLabel}</dd></div>
        </dl>

        <p className={styles.note}>Mostrá este QR al llegar. Vale para esta fecha y se valida una sola vez.</p>
      </article>

      <Link href="/contacto" className={styles.recover}>Necesito ayuda con mi entrada</Link>
    </main>
  )
}
