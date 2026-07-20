'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Clock3, Gift, Mail, Minus, Plus, ShieldCheck, Ticket } from 'lucide-react'

import {
  TOMATE_EVENT,
  tomateMoney,
  type TicketBreakdown,
  type TicketInventoryTier,
} from '@/lib/tomate-event'
import styles from './tomate.module.css'

const REBILL_PUBLIC_KEY = process.env.NEXT_PUBLIC_REBILL_PUBLIC_KEY ?? ''
const REBILL_SDK_SRC = 'https://unpkg.com/rebill@1.17.28/dist/rebill/rebill.esm.js'
const CHECKOUT_DISPLAY = JSON.stringify({ checkoutSummary: false, logo: false })
const CHECKOUT_CSS = `
  .rebill-submit-button {
    background: #006d42 !important;
    border-radius: 9999px !important;
    min-height: 52px !important;
    font-weight: 750 !important;
  }
  .rebill-submit-button:hover { background: #005535 !important; }
`

type Quote = {
  intentId: string
  intentToken: string
  quantity: number
  amount: number
  currency: string
  expiresAt: string
  breakdown: TicketBreakdown[]
}

type Confirmation = {
  emailPending: boolean
  pasitosReward?: {
    amount: number
    quantity: number
    status: 'credited' | 'pending'
    claimUrl: string
    claimToken: string
  }
  tickets: { code: string; number: number; url: string }[]
}

let rebillSDKPromise: Promise<void> | null = null

function loadRebillSDK(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  if (!REBILL_PUBLIC_KEY) return Promise.reject(new Error('Falta la clave pública de Rebill.'))
  if (customElements.get('rebill-checkout')) return Promise.resolve()
  if (rebillSDKPromise) return rebillSDKPromise

  rebillSDKPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-tomate-rebill-sdk]')
    const script = existing ?? document.createElement('script')
    const loaded = () => customElements.whenDefined('rebill-checkout').then(() => resolve()).catch(reject)
    const failed = () => {
      rebillSDKPromise = null
      reject(new Error('No se pudo cargar Rebill.'))
    }
    script.addEventListener('load', loaded, { once: true })
    script.addEventListener('error', failed, { once: true })
    if (!existing) {
      script.type = 'module'
      script.src = REBILL_SDK_SRC
      script.dataset.tomateRebillSdk = ''
      document.head.appendChild(script)
    } else if (customElements.get('rebill-checkout')) {
      loaded()
    }
  })
  return rebillSDKPromise
}

function CheckoutFrame({
  product,
  onSuccess,
  onError,
}: {
  product: Record<string, unknown>
  onSuccess: (detail: unknown) => void
  onError: (detail: unknown) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const key = JSON.stringify(product)

  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
  }, [onError, onSuccess])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let active = true
    let checkout: HTMLElement | null = null
    let fallback: number | null = null
    const success = (event: Event) => onSuccessRef.current((event as CustomEvent).detail)
    const error = (event: Event) => onErrorRef.current((event as CustomEvent).detail)
    const markReady = () => {
      if (!active) return
      setReady(true)
      if (fallback) window.clearTimeout(fallback)
    }

    setReady(false)
    setLoadError(false)
    loadRebillSDK().then(() => {
      if (!active) return
      checkout = document.createElement('rebill-checkout')
      checkout.setAttribute('public-key', REBILL_PUBLIC_KEY)
      checkout.setAttribute('instant-product', key)
      checkout.setAttribute('css', CHECKOUT_CSS)
      checkout.setAttribute('display', CHECKOUT_DISPLAY)
      checkout.setAttribute('language', 'es')
      checkout.addEventListener('success', success)
      checkout.addEventListener('error', error)
      checkout.addEventListener('ready', markReady)
      host.appendChild(checkout)
      fallback = window.setTimeout(markReady, 3500)
    }).catch(() => active && setLoadError(true))

    return () => {
      active = false
      if (fallback) window.clearTimeout(fallback)
      checkout?.removeEventListener('success', success)
      checkout?.removeEventListener('error', error)
      checkout?.removeEventListener('ready', markReady)
      checkout?.remove()
    }
  }, [key])

  if (loadError) {
    return <div className={styles.checkoutError}>No pudimos cargar el pago seguro. Recargá la página e intentá nuevamente.</div>
  }

  return (
    <div className={styles.rebillFrame} aria-busy={!ready}>
      <div ref={hostRef} className={styles.rebillHost} />
      {!ready && (
        <div className={styles.rebillLoading} role="status">
          <span className={styles.checkoutSpinner} />
          <span><strong>Preparando pago seguro</strong><small>Conectando con Rebill…</small></span>
        </div>
      )}
    </div>
  )
}

function checkoutErrorMessage(detail: unknown): string {
  const status = String((detail as { data?: { result?: { statusDetail?: string } } })?.data?.result?.statusDetail ?? '')
  if (status === 'card_declined') return 'La tarjeta fue rechazada. Probá con otro medio de pago.'
  if (status === 'insufficient_funds') return 'No hay fondos suficientes para completar el pago.'
  if (status === 'expired_card') return 'La tarjeta está vencida.'
  if (status === 'invalid_card') return 'Revisá los datos de la tarjeta.'
  return 'No se pudo procesar el pago. Revisá los datos e intentá nuevamente.'
}

export function TicketCheckout() {
  const [quantity, setQuantity] = useState(1)
  const [tiers, setTiers] = useState<TicketInventoryTier[]>([])
  const [quote, setQuote] = useState<Quote | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [paymentReceived, setPaymentReceived] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const refreshAvailability = useCallback(async () => {
    try {
      const response = await fetch('/api/events/tomate/availability', { cache: 'no-store' })
      const payload = await response.json() as { tiers?: TicketInventoryTier[] }
      if (response.ok && payload.tiers) setTiers(payload.tiers)
    } catch {
      // The reservation endpoint remains the authoritative availability check.
    }
  }, [])

  useEffect(() => { void refreshAvailability() }, [refreshAvailability])

  const currentTier = tiers.find((tier) => tier.available === null || tier.available > 0) ?? tiers.at(-1)
  const releaseQuote = useCallback(async (reservation: Quote) => {
    try {
      await fetch(`/api/events/tomate/checkout-intents/${reservation.intentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentToken: reservation.intentToken }),
        keepalive: true,
      })
    } catch {
      // It will be released automatically when the 30-minute hold expires.
    }
  }, [])

  useEffect(() => {
    if (!quote || confirmation || paymentReceived) return
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
  }, [confirmation, paymentReceived, quote, refreshAvailability, releaseQuote])

  const startCheckout = useCallback(async () => {
    setPreparing(true)
    setError(null)
    loadRebillSDK().catch(() => undefined)
    try {
      const response = await fetch('/api/events/tomate/checkout-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      const payload = await response.json().catch(() => ({})) as Quote & { error?: string }
      if (!response.ok || !payload.intentId) throw new Error(payload.error || 'No pudimos reservar las entradas.')
      setQuote(payload)
      setPaymentReceived(false)
      setConfirmation(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos reservar las entradas.')
    } finally {
      setPreparing(false)
    }
  }, [quantity])

  const goBack = useCallback(async () => {
    if (!quote || confirming) return
    await releaseQuote(quote)
    setQuote(null)
    setError(null)
    void refreshAvailability()
  }, [confirming, quote, refreshAvailability, releaseQuote])

  const handleSuccess = useCallback(async (detail: unknown) => {
    if (!quote) return
    const paymentId = (detail as { data?: { result?: { paymentId?: string } } })?.data?.result?.paymentId
    if (!paymentId) {
      setError('El pago se inició, pero no recibimos su identificador. Escribinos para revisarlo.')
      return
    }

    setConfirming(true)
    setError(null)
    try {
      const response = await fetch('/api/events/tomate/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, intentId: quote.intentId }),
      })
      const payload = await response.json().catch(() => ({})) as Confirmation & { error?: string }
      if (!response.ok || !payload.tickets) throw new Error(payload.error || 'No pudimos terminar la confirmación.')
      setConfirmation(payload)
      void refreshAvailability()
    } catch {
      // The payment may be approved while the webhook is still reconciling it.
      // We never invite the buyer to pay a second time.
      setPaymentReceived(true)
    } finally {
      setConfirming(false)
    }
  }, [quote, refreshAvailability])

  const handlePaymentError = useCallback((detail: unknown) => {
    setError(checkoutErrorMessage(detail))
  }, [])

  const product = useMemo(() => quote ? ({
    name: [{ language: 'es', text: TOMATE_EVENT.name }],
    description: [{
      language: 'es',
      text: `${quote.quantity} ${quote.quantity === 1 ? 'entrada' : 'entradas'} · ${TOMATE_EVENT.dateLabel}`,
    }],
    amount: quote.amount,
    currency: quote.currency,
    metadata: {
      eventSlug: TOMATE_EVENT.slug,
      checkoutIntentId: quote.intentId,
      quantity: String(quote.quantity),
    },
  }) : null, [quote])

  const reset = useCallback(() => {
    setQuote(null)
    setConfirmation(null)
    setPaymentReceived(false)
    setError(null)
    setQuantity(1)
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
            <li><ShieldCheck size={20} /> Pago procesado por Rebill</li>
            <li><Mail size={20} /> QR y código directo a tu email</li>
            <li><Ticket size={20} /> Hasta {TOMATE_EVENT.maxTicketsPerOrder} entradas por compra</li>
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
              {confirmation.pasitosReward?.status === 'credited' && (
                <div className={styles.creditedBonus} role="status">
                  <Gift size={20} aria-hidden="true" />
                  <span><strong>{confirmation.pasitosReward.amount} Pasitos acreditados</strong><small>Ya fueron enviados a las cuentas indicadas.</small></span>
                </div>
              )}
              {confirmation.pasitosReward?.status === 'pending' && (
                <div className={styles.creditedBonus} role="status">
                  <Gift size={20} aria-hidden="true" />
                  <span><strong>{confirmation.pasitosReward.amount} Pasitos para repartir</strong><small>Cargá un ID de soporte por entrada desde el link que te enviamos.</small></span>
                  <a href={confirmation.pasitosReward.claimUrl}>Repartir Pasitos</a>
                </div>
              )}
              <button type="button" className={styles.checkoutPrimary} onClick={reset}>Comprar otra entrada</button>
              <a className={styles.recoveryLink} href="/evento-pasito/entradas">¿Necesitás reenviar tus entradas?</a>
            </div>
          ) : paymentReceived ? (
            <div className={styles.purchaseSuccess} data-testid="payment-received">
              <span className={styles.successIcon}><Check size={30} /></span>
              <p className={styles.checkoutEyebrow}>Pago recibido</p>
              <h3>Estamos terminando de confirmarlo.</h3>
              <p>No vuelvas a pagar. El webhook de Rebill completa la compra y te envía las entradas al email usado en el pago.</p>
              <a className={styles.checkoutPrimary} href="/contacto">Contactar a Pasito</a>
            </div>
          ) : quote && product ? (
            <div data-testid="checkout-payment">
              <button type="button" className={styles.checkoutBack} onClick={() => void goBack()} disabled={confirming}>
                <ArrowLeft size={17} /> Cambiar cantidad
              </button>
              <div className={styles.quoteHeader}>
                <div>
                  <p className={styles.checkoutEyebrow}>{quote.quantity} {quote.quantity === 1 ? 'entrada' : 'entradas'}</p>
                  <h3>{tomateMoney(quote.amount)}</h3>
                </div>
                <span><Clock3 size={15} /> {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}</span>
              </div>
              <div className={styles.quoteBreakdown}>
                {quote.breakdown.map((line) => (
                  <div key={line.tierId}>
                    <span>{line.quantity} × {line.name}</span>
                    <strong>{tomateMoney(line.quantity * line.unitPrice)}</strong>
                  </div>
                ))}
              </div>
              {error && <div className={styles.checkoutError} role="alert">{error}</div>}
              {confirming && <div className={styles.confirmingMessage}>Confirmando el pago y creando tus QR…</div>}
              <CheckoutFrame product={product} onSuccess={handleSuccess} onError={handlePaymentError} />
              <p className={styles.paymentFinePrint}>El precio queda congelado en esta reserva. Nunca guardamos los datos de tu tarjeta.</p>
            </div>
          ) : (
            <div data-testid="checkout-quantity">
              <p className={styles.checkoutEyebrow}>Elegí la cantidad</p>
              <h3>{currentTier ? `Entradas a ${tomateMoney(currentTier.unitPrice)}` : 'Reservá tus entradas'}</h3>
              {currentTier && currentTier.capacity !== null && currentTier.available !== null && (
                <p className={styles.availabilityCopy}>Cupos limitados: quedan {currentTier.available} entradas disponibles a este valor.</p>
              )}
              <div className={styles.quantityPicker} aria-label="Cantidad de entradas">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity === 1} aria-label="Restar una entrada"><Minus size={22} /></button>
                <span><strong>{quantity}</strong><small>{quantity === 1 ? 'entrada' : 'entradas'}</small></span>
                <button type="button" onClick={() => setQuantity((value) => Math.min(TOMATE_EVENT.maxTicketsPerOrder, value + 1))} disabled={quantity === TOMATE_EVENT.maxTicketsPerOrder} aria-label="Sumar una entrada"><Plus size={22} /></button>
              </div>
              {error && <div className={styles.checkoutError} role="alert">{error}</div>}
              <button type="button" className={styles.checkoutPrimary} onClick={() => void startCheckout()} disabled={preparing}>
                {preparing ? 'Reservando precio…' : 'Continuar al pago'}
              </button>
              <p className={styles.paymentFinePrint}>Vas a ver el total exacto antes de pagar.</p>
              <a className={styles.recoveryLink} href="/evento-pasito/entradas">Ya compré y necesito mis entradas</a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
