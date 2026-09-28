'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, Clock3, ExternalLink, Mail, Minus, Plus, ShieldCheck, Ticket } from 'lucide-react'

import {
  WALKING_CLUB_UY_EVENT,
  WALKING_CLUB_UY_TERMS_PATH,
  walkingClubUyEventIsSoldOut,
  walkingClubUyMoney,
  type TicketBreakdown,
  type TicketInventoryTier,
} from '@/lib/uruguay-walking-club-event'
import styles from '../evento-pasito/tomate.module.css'

/**
 * Uruguay Walking Club checkout using dLocal Go Hosted Checkout.
 * 
 * Flow:
 * 1. User selects quantity and accepts terms
 * 2. Reserve tickets via /api/events/walking-club-uy/checkout-intents
 * 3. Display quote with price and timer
 * 4. User clicks "Ir al pago" to initiate payment
 * 5. Backend creates dLocal Go payment and returns redirect URL
 * 6. Redirect user to dLocal Go's hosted checkout page
 * 7. After payment, dLocal Go redirects back to success_url
 * 8. Success page fetches and displays tickets
 */

type Quote = {
  intentId: string
  intentToken: string
  quantity: number
  subtotalAmount: number
  discountAmount: number
  amount: number
  currency: string
  promoCode?: string
  discountPercent?: number
  expiresAt: string
  breakdown: TicketBreakdown[]
}

type Confirmation = {
  emailPending: boolean
  tickets: { code: string; number: number; url: string }[]
}

export function TicketCheckout({ initialTiers = [] }: { initialTiers?: TicketInventoryTier[] }) {
  const [quantity, setQuantity] = useState(1)
  const [promoCode, setPromoCode] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [tiers, setTiers] = useState<TicketInventoryTier[]>(initialTiers)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const refreshAvailability = useCallback(async () => {
    try {
      const response = await fetch('/api/events/walking-club-uy/availability', { cache: 'no-store' })
      const payload = await response.json() as { tiers?: TicketInventoryTier[] }
      if (response.ok && payload.tiers) setTiers(payload.tiers)
    } catch {
      // The reservation endpoint remains the authoritative availability check.
    }
  }, [])

  useEffect(() => {
    if (initialTiers.length === 0) void refreshAvailability()
  }, [initialTiers.length, refreshAvailability])

  const soldOut = walkingClubUyEventIsSoldOut(tiers)
  const currentTier = tiers.find((tier) => tier.available === null || tier.available > 0)
  
  const releaseQuote = useCallback(async (reservation: Quote) => {
    try {
      await fetch(`/api/events/walking-club-uy/checkout-intents/${reservation.intentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentToken: reservation.intentToken }),
        keepalive: true,
      })
    } catch {
      // It will be released automatically when the 5-minute hold expires.
    }
  }, [])

  useEffect(() => {
    if (!quote || confirmation) return
    const update = () => {
      const seconds = Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - Date.now()) / 1000))
      setRemainingSeconds(seconds)
      if (seconds === 0) {
        void releaseQuote(quote)
        setQuote(null)
        setError('La reserva venció. Elegí la cantidad nuevamente para actualizar el precio.')
        void refreshAvailability()
      }
    }
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [confirmation, quote, refreshAvailability, releaseQuote])

  const startCheckout = useCallback(async () => {
    setPreparing(true)
    setError(null)
    try {
      const response = await fetch('/api/events/walking-club-uy/checkout-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, promoCode, termsAccepted }),
      })
      const payload = await response.json().catch(() => ({})) as Quote & { error?: string }
      if (!response.ok || !payload.intentId) throw new Error(payload.error || 'No pudimos reservar las entradas.')
      setQuote(payload)
      setConfirmation(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos reservar las entradas.')
      void refreshAvailability()
    } finally {
      setPreparing(false)
    }
  }, [promoCode, quantity, refreshAvailability, termsAccepted])

  const goBack = useCallback(async () => {
    if (!quote || redirecting) return
    await releaseQuote(quote)
    setQuote(null)
    setError(null)
    void refreshAvailability()
  }, [quote, redirecting, refreshAvailability, releaseQuote])

  const proceedToPayment = useCallback(async () => {
    if (!quote) return
    setRedirecting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/events/walking-club-uy/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId: quote.intentId, intentToken: quote.intentToken }),
      })
      const payload = await response.json() as { redirectUrl?: string; error?: string }
      
      if (!response.ok || !payload.redirectUrl) {
        throw new Error(payload.error || 'No pudimos crear el pago.')
      }
      
      // Redirect to dLocal Go hosted checkout
      window.location.href = payload.redirectUrl
    } catch (cause) {
      setRedirecting(false)
      setError(cause instanceof Error ? cause.message : 'No pudimos iniciar el pago.')
    }
  }, [quote])

  const reset = useCallback(() => {
    setQuote(null)
    setConfirmation(null)
    setRedirecting(false)
    setError(null)
    setQuantity(1)
    setPromoCode('')
    setTermsAccepted(false)
    void refreshAvailability()
  }, [refreshAvailability])

  return (
    <section className={styles.checkoutSection} id="comprar" aria-labelledby="checkout-title">
      <div className={styles.checkoutBackdrop} aria-hidden="true" />
      <div className={`${styles.container} ${styles.checkoutLayout}`}>
        <div className={styles.checkoutIntro}>
          <h2 id="checkout-title">Tu lugar,<br /><span>en dos minutos.</span></h2>
          <p>Elegí cuántas entradas querés y confirmá el valor disponible antes de pagar.</p>
          <ul>
            <li><ShieldCheck size={20} /> Pago procesado por Dlocal</li>
            <li><Mail size={20} /> QR y código directo a tu email</li>
            <li><Ticket size={20} /> Hasta {WALKING_CLUB_UY_EVENT.maxTicketsPerOrder} entradas por compra</li>
          </ul>
        </div>

        <div className={styles.checkoutCard}>
          {confirmation ? (
            <div className={styles.purchaseSuccess} data-testid="purchase-success">
              <span className={styles.successIcon}><Check size={30} /></span>
              <p className={styles.checkoutEyebrow}>Compra confirmada</p>
              <h3>¡Tus entradas ya son tuyas!</h3>
              <p>{confirmation.emailPending ? 'El email quedó pendiente y lo vamos a reintentar automáticamente.' : 'Te enviamos los QR y códigos por email.'} También podés abrirlos ahora:</p>
              <div className={styles.successTickets}>
                {confirmation.tickets.map((ticket) => (
                  <a href={ticket.url} target="_blank" rel="noopener noreferrer" key={ticket.code}>
                    <span>Entrada {ticket.number}</span>
                    <strong>{ticket.code}</strong>
                  </a>
                ))}
              </div>
              <button type="button" className={styles.checkoutPrimary} onClick={reset}>Comprar otra entrada</button>
            </div>
          ) : quote ? (
            <div data-testid="checkout-payment">
              <button type="button" className={styles.checkoutBack} onClick={() => void goBack()} disabled={redirecting}>
                <ArrowLeft size={17} /> Cambiar cantidad
              </button>
              <div className={styles.quoteHeader}>
                <div>
                  <p className={styles.checkoutEyebrow}>{quote.quantity} {quote.quantity === 1 ? 'entrada' : 'entradas'}</p>
                  <h3>{walkingClubUyMoney(quote.amount)}</h3>
                </div>
                <span><Clock3 size={15} /> {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}</span>
              </div>
              <div className={styles.quoteBreakdown}>
                {quote.breakdown.map((line) => (
                  <div key={line.tierId}>
                    <span>{line.quantity} × {line.name}</span>
                    <strong>{walkingClubUyMoney(line.quantity * line.unitPrice)}</strong>
                  </div>
                ))}
                {quote.discountAmount > 0 && (
                  <div className={styles.quoteDiscount}>
                    <span>{quote.promoCode} · {quote.discountPercent}% de descuento</span>
                    <strong>−{walkingClubUyMoney(quote.discountAmount)}</strong>
                  </div>
                )}
              </div>
              {error && <div className={styles.checkoutError} role="alert">{error}</div>}
              <button 
                type="button" 
                className={styles.checkoutPrimary} 
                onClick={() => void proceedToPayment()} 
                disabled={redirecting}
              >
                {redirecting ? 'Redirigiendo a dLocal Go…' : 'Ir al pago'}
                {!redirecting && <ExternalLink size={19} style={{ marginLeft: '8px' }} />}
              </button>
              <p className={styles.paymentFinePrint}>El precio queda congelado en esta reserva. Vas a completar el pago en la página segura de dLocal Go.</p>
            </div>
          ) : soldOut ? (
            <div className={styles.checkoutSoldOut} data-testid="checkout-sold-out" role="status">
              <p className={styles.checkoutEyebrow}>Entradas</p>
              <h3>SOLD OUT</h3>
              <p>Se agotaron las entradas para Pasito Walking Club.</p>
              <p>Gracias a todos los que van a ser parte.</p>
            </div>
          ) : (
            <div data-testid="checkout-quantity">
              <p className={styles.checkoutEyebrow}>Elegí la cantidad</p>
              <h3>{currentTier ? `Entradas a ${walkingClubUyMoney(currentTier.unitPrice)}` : 'Reservá tus entradas'}</h3>
              {currentTier && currentTier.capacity !== null && currentTier.available !== null && (
                <p className={styles.availabilityCopy}>Disponibilidad ahora: quedan {currentTier.available}. Las reservas sin pagar se liberan a los 5 minutos.</p>
              )}
              <div className={styles.quantityPicker} aria-label="Cantidad de entradas">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity === 1} aria-label="Restar una entrada"><Minus size={22} /></button>
                <span><strong>{quantity}</strong><small>{quantity === 1 ? 'entrada' : 'entradas'}</small></span>
                <button type="button" onClick={() => setQuantity((value) => Math.min(WALKING_CLUB_UY_EVENT.maxTicketsPerOrder, value + 1))} disabled={quantity === WALKING_CLUB_UY_EVENT.maxTicketsPerOrder} aria-label="Sumar una entrada"><Plus size={22} /></button>
              </div>
              <label className={styles.promoField}>
                <span>Código de descuento</span>
                <input
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                  placeholder="Ingresá tu código"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={40}
                />
              </label>
              <label className={styles.termsAcceptance}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  required
                />
                <span>
                  Acepto los{' '}
                  <a href={WALKING_CLUB_UY_TERMS_PATH} target="_blank" rel="noopener noreferrer">términos y condiciones del evento</a>.
                </span>
              </label>
              {error && <div className={styles.checkoutError} role="alert">{error}</div>}
              <button type="button" className={styles.checkoutPrimary} onClick={() => void startCheckout()} disabled={preparing || !termsAccepted}>
                {preparing ? 'Reservando precio…' : 'Continuar al pago'}
              </button>
              <p className={styles.paymentFinePrint}>Vas a ver el total exacto antes de pagar.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
