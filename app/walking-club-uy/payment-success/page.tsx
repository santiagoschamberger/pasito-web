import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, ExternalLink } from 'lucide-react'
import { redirect } from 'next/navigation'
import { isUuid } from '@/lib/uruguay-walking-club-event'
import { readIntentToken } from '@/lib/tomate-ticket-security'
import { confirmWalkingClubUyOrder } from '@/lib/uruguay-order-confirmation'
import styles from '../../evento-pasito/tomate.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Tus entradas · Walking Club Uruguay', robots: 'noindex, nofollow' }

export default async function PaymentSuccessPage({ searchParams }: {
  searchParams: Promise<{ intent_id?: string; token?: string }>
}) {
  const { intent_id: intentId, token } = await searchParams
  if (!isUuid(intentId) || !token || readIntentToken(token) !== intentId) redirect('/walking-club-uy')
  let confirmation: Awaited<ReturnType<typeof confirmWalkingClubUyOrder>> | null = null
  let error: string | null = null
  try {
    confirmation = await confirmWalkingClubUyOrder(intentId, process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pasito.app')
  } catch (cause) {
    console.error('[walking-club-uy/payment-success]', cause)
    error = 'Todavía no pudimos confirmar tu pago. Si ya pagaste, no vuelvas a pagar.'
  }
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
        ) : confirmation ? (
          <div className={styles.purchaseSuccess}>
            <span className={styles.successIcon}><Check size={30} /></span>
            <p className={styles.checkoutEyebrow}>Compra confirmada</p>
            <h3>¡Tus entradas ya son tuyas!</h3>
            <p>{!confirmation.emailPending ? 'Te enviamos los QR y códigos por email.' : 'El email quedó pendiente y lo vamos a reintentar automáticamente.'} También podés abrirlos ahora:</p>
            <div className={styles.successTickets}>
              {confirmation.tickets.map((ticket) => (
                <a href={ticket.url} target="_blank" rel="noopener noreferrer" key={ticket.code}>
                  <span>Entrada {ticket.number}</span>
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
