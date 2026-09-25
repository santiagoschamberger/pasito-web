'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Clock, Mail, Minus, Plus, ShieldCheck, Ticket } from 'lucide-react'

import {
  SILVER_EVENT,
  SILVER_TICKET_TIERS,
  SILVER_EVENT_TERMS_PATH,
  silverEventIsSoldOut,
  silverMoney,
  type TicketBreakdown,
  type TicketInventoryTier,
} from '@/lib/silver-event'
import styles from './silver.module.css'

const REBILL_PUBLIC_KEY = process.env.NEXT_PUBLIC_SILVER_REBILL_PUBLIC_KEY ?? ''
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

let rebillSDKPromise: Promise<void> | null = null

function loadRebillSDK(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  if (!REBILL_PUBLIC_KEY) return Promise.reject(new Error('Falta la clave pública de Rebill.'))
  if (customElements.get('rebill-checkout')) return Promise.resolve()
  if (rebillSDKPromise) return rebillSDKPromise

  rebillSDKPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-silver-rebill-sdk]')
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
      script.dataset.silverRebillSdk = ''
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

export function SilverTicketCheckout({ initialTiers = [] }: { initialTiers?: TicketInventoryTier[] }) {
  const [quantity, setQuantity] = useState(1)
  const [promoCode, setPromoCode] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [tiers, setTiers] = useState<TicketInventoryTier[]>(initialTiers)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [paymentReceived, setPaymentReceived] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [verificationAttempt, setVerificationAttempt] = useState(0)
  const [inactivePayment, setInactivePayment] = useState<'refunded' | 'inactive' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [freeEmail, setFreeEmail] = useState('')
  const [freeName, setFreeName] = useState('')
  const [claimingFree, setClaimingFree] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const refreshAvailability = useCallback(async () => {
    try {
      const response = await fetch('/api/events/silver/availability', { cache: 'no-store' })
      const payload = await response.json() as { tiers?: TicketInventoryTier[] }
      if (response.ok && payload.tiers) setTiers(payload.tiers)
    } catch {
      // The reservation endpoint remains the authoritative availability check.
    }
  }, [])

  useEffect(() => {
    if (initialTiers.length === 0) void refreshAvailability()
  }, [initialTiers.length, refreshAvailability])

  const soldOut = silverEventIsSoldOut(tiers)
  const currentTier = tiers.find((tier) => tier.available === null || tier.available > 0)
  const releaseQuote = useCallback(async (reservation: Quote) => {
    try {
      await fetch(`/api/events/silver/checkout-intents/${reservation.intentId}`, {
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
      const response = await fetch('/api/events/silver/checkout-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, promoCode, termsAccepted }),
      })
      const payload = await response.json().catch(() => ({})) as Quote & { error?: string }
      if (!response.ok || !payload.intentId) throw new Error(payload.error || 'No pudimos reservar las entradas.')
      setQuote(payload)
      setPaymentReceived(false)
      setPaymentId(null)
      setInactivePayment(null)
      setConfirmation(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos reservar las entradas.')
      void refreshAvailability()
    } finally {
      setPreparing(false)
    }
  }, [promoCode, quantity, refreshAvailability, termsAccepted])

  const goBack = useCallback(async () => {
    if (!quote || confirming) return
    await releaseQuote(quote)
    setQuote(null)
    setError(null)
    void refreshAvailability()
  }, [confirming, quote, refreshAvailability, releaseQuote])

  const handleSuccess = useCallback((detail: unknown) => {
    if (!quote) return
    const id = (detail as { data?: { result?: { paymentId?: unknown } } })?.data?.result?.paymentId
    setPaymentId(typeof id === 'string' && id.trim() ? id.trim() : null)
    // Stop the reservation countdown and remove payment controls even when an
    // approved bank transfer has no ID in the SDK success payload.
    setPaymentReceived(true)
    setError(null)
  }, [quote])

  useEffect(() => {
    if (!paymentReceived || !quote || confirmation || inactivePayment) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    setConfirming(true)

    const verify = async () => {
      try {
        const confirmDirectly = attempts === 0 && paymentId
        const response = await fetch(`/api/events/silver/orders/${confirmDirectly ? 'confirm' : 'status'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(confirmDirectly
            ? { paymentId, intentId: quote.intentId }
            : { intentToken: quote.intentToken }),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
        })
        const payload = await response.json() as Confirmation & { status?: string; refunded?: boolean }
        if (controller.signal.aborted) return
        if (response.ok && payload.tickets?.length) {
          setConfirmation(payload)
          setConfirming(false)
          void refreshAvailability()
          return
        }
        if (response.ok && payload.status === 'inactive') {
          setInactivePayment(payload.refunded ? 'refunded' : 'inactive')
          setConfirming(false)
          return
        }
      } catch {
        // The verified webhook can finish after the browser callback or a
        // transient network failure. Keep recovering the same reservation.
      }
      if (controller.signal.aborted) return
      attempts += 1
      if (attempts < 30) timer = setTimeout(() => void verify(), 2000)
      else setConfirming(false)
    }
    void verify()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [paymentReceived, paymentId, quote, confirmation, inactivePayment, verificationAttempt, refreshAvailability])

  const handlePaymentError = useCallback((detail: unknown) => {
    setError(checkoutErrorMessage(detail))
  }, [])

  const claimFreeTickets = useCallback(async () => {
    if (!quote || quote.amount !== 0 || claimingFree) return
    setClaimingFree(true)
    setError(null)
    try {
      const response = await fetch('/api/events/silver/orders/confirm-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentToken: quote.intentToken,
          email: freeEmail,
          customerName: freeName,
        }),
      })
      const payload = await response.json().catch(() => ({})) as Confirmation & { error?: string }
      if (!response.ok || !payload.tickets?.length) {
        throw new Error(payload.error || 'No pudimos confirmar las entradas gratuitas.')
      }
      setConfirmation(payload)
      setPaymentReceived(true)
      void refreshAvailability()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos confirmar las entradas gratuitas.')
    } finally {
      setClaimingFree(false)
    }
  }, [claimingFree, freeEmail, freeName, quote, refreshAvailability])

  const product = useMemo(() => quote ? ({
    name: [{ language: 'es', text: SILVER_EVENT.name }],
    description: [{
      language: 'es',
      text: `${quote.quantity} ${quote.quantity === 1 ? 'entrada' : 'entradas'} · ${SILVER_EVENT.dateLabel}`,
    }],
    amount: quote.amount,
    currency: quote.currency,
    metadata: {
      eventSlug: SILVER_EVENT.slug,
      checkoutIntentId: quote.intentId,
      quantity: String(quote.quantity),
      promoCode: quote.promoCode ?? '',
    },
  }) : null, [quote])

  const reset = useCallback(() => {
    setQuote(null)
    setConfirmation(null)
    setPaymentReceived(false)
    setPaymentId(null)
    setInactivePayment(null)
    setError(null)
    setQuantity(1)
    setPromoCode('')
    setTermsAccepted(false)
    setFreeEmail('')
    setFreeName('')
    setClaimingFree(false)
    void refreshAvailability()
  }, [refreshAvailability])

  return (
    <section className={styles.checkoutSection} id="comprar" aria-labelledby="checkout-title">
      <div className={styles.checkoutBackdrop} aria-hidden="true" />
      <div className={`${styles.container} ${styles.checkoutLayout}`}>
        <div className={styles.checkoutIntro}>
          <h2 id="checkout-title">Tu próximo<br /><span>buen plan.</span></h2>
          <p>Elegí cuántas entradas querés y confirmá el valor antes de pagar.</p>
          <ul>
            <li><ShieldCheck size={20} /> Pago procesado por Rebill</li>
            <li><Mail size={20} /> QR y código directo a tu email</li>
            <li><Ticket size={20} /> Hasta {SILVER_EVENT.maxTicketsPerOrder} entradas por compra</li>
          </ul>
        </div>

        <div className={styles.checkoutCard}>
          {confirmation ? (
            <div className={styles.purchaseSuccess} data-testid="purchase-success">
              <span className={styles.successIcon}><Check size={30} /></span>
              <p className={styles.checkoutEyebrow}>Compra confirmada</p>
              <h3>¡Tus entradas ya son tuyas!</h3>
              <p>{confirmation.emailPending ? 'El envío del email quedó pendiente. Guardá tus entradas desde los enlaces de abajo.' : 'Te enviamos los QR y códigos por email.'} También podés abrirlos ahora:</p>
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
          ) : paymentReceived ? (
            <div className={styles.purchaseSuccess} data-testid="payment-received" aria-live="polite">
              <span className={styles.successIcon}>{inactivePayment ? <Ticket size={30} /> : <Clock size={30} />}</span>
              <p className={styles.checkoutEyebrow}>Estado de tu compra</p>
              <h3>{inactivePayment === 'refunded' ? 'El pago fue reembolsado.' : inactivePayment ? 'Esta compra no está activa.' : confirming ? 'Estamos verificando tu pago…' : 'Estamos terminando de confirmarlo.'}</h3>
              <p>{inactivePayment ? 'Las entradas de esta compra ya no están habilitadas. Si necesitás ayuda, escribinos.' : 'No vuelvas a pagar. Estamos verificando la operación. Tus entradas aparecerán acá cuando se confirme la compra.'}</p>
              {!confirming && !inactivePayment && <button type="button" className={styles.checkoutPrimary} onClick={() => setVerificationAttempt(value => value + 1)}>Volver a verificar</button>}
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
                  <h3>{silverMoney(quote.amount)}</h3>
                </div>
                <span><Clock size={15} /> {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}</span>
              </div>
              <div className={styles.quoteBreakdown}>
                {quote.breakdown.map((line) => (
                  <div key={line.tierId}>
                    <span>{line.quantity} × {line.name}</span>
                    <strong>{silverMoney(line.quantity * line.unitPrice)}</strong>
                  </div>
                ))}
                {quote.discountAmount > 0 && (
                  <div className={styles.quoteDiscount}>
                    <span>{quote.promoCode} · {quote.discountPercent}% de descuento</span>
                    <strong>−{silverMoney(quote.discountAmount)}</strong>
                  </div>
                )}
              </div>
              {error && <div className={styles.checkoutError} role="alert">{error}</div>}
              {quote.amount === 0 ? (
                <div className={styles.freeClaim} data-testid="checkout-free">
                  <p className={styles.paymentFinePrint}>
                    Con {quote.promoCode || 'este código'} el total es $0. No hace falta pagar con tarjeta.
                  </p>
                  <label className={styles.promoField}>
                    <span>Email para recibir las entradas</span>
                    <input
                      type="email"
                      value={freeEmail}
                      onChange={(event) => setFreeEmail(event.target.value)}
                      placeholder="tu@email.com"
                      autoComplete="email"
                      required
                    />
                  </label>
                  <label className={styles.promoField}>
                    <span>Nombre (opcional)</span>
                    <input
                      type="text"
                      value={freeName}
                      onChange={(event) => setFreeName(event.target.value)}
                      placeholder="Tu nombre"
                      autoComplete="name"
                      maxLength={120}
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.checkoutPrimary}
                    onClick={() => void claimFreeTickets()}
                    disabled={claimingFree || !freeEmail.trim()}
                  >
                    {claimingFree ? 'Confirmando entradas…' : 'Confirmar entradas gratis'}
                  </button>
                </div>
              ) : (
                <>
                  {confirming && <div className={styles.confirmingMessage}>Confirmando el pago y creando tus QR…</div>}
                  <CheckoutFrame product={product} onSuccess={handleSuccess} onError={handlePaymentError} />
                  <p className={styles.paymentFinePrint}>El precio queda congelado en esta reserva. Nunca guardamos los datos de tu tarjeta.</p>
                </>
              )}
            </div>
          ) : soldOut ? (
            <div className={styles.checkoutSoldOut} data-testid="checkout-sold-out" role="status">
              <p className={styles.checkoutEyebrow}>Entradas</p>
              <h3>Entradas agotadas</h3>
              <p>Se agotaron las entradas para este encuentro de Silver Walks.</p>
            </div>
          ) : (
            <div data-testid="checkout-quantity">
              <p className={styles.checkoutEyebrow}>Elegí la cantidad</p>
              <h3>Entrada general</h3>
              <div className={styles.quantityPicker} aria-label="Cantidad de entradas">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity === 1} aria-label="Restar una entrada"><Minus size={22} /></button>
                <span><strong>{quantity}</strong><small>{quantity === 1 ? 'entrada' : 'entradas'}</small></span>
                <button type="button" onClick={() => setQuantity((value) => Math.min(SILVER_EVENT.maxTicketsPerOrder, value + 1))} disabled={quantity === SILVER_EVENT.maxTicketsPerOrder} aria-label="Sumar una entrada"><Plus size={22} /></button>
              </div>
              <div className={styles.orderTotal}><span>Total{promoCode ? ' sin descuento' : ''}</span><strong>{silverMoney(quantity * (currentTier?.unitPrice ?? SILVER_TICKET_TIERS[0].unitPrice))}</strong></div>
              <label className={styles.promoField}>
                <span>Código de descuento (opcional)</span>
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
                  <a href={SILVER_EVENT_TERMS_PATH} target="_blank" rel="noopener noreferrer">términos y condiciones del evento</a>.
                </span>
              </label>
              {error && <div className={styles.checkoutError} role="alert">{error}</div>}
              <button type="button" className={styles.checkoutPrimary} onClick={() => void startCheckout()} disabled={preparing || !termsAccepted}>
                {preparing ? 'Preparando tu reserva…' : 'Continuar al pago'}
              </button>
              <p className={styles.paymentFinePrint}>Vas a ver el total exacto antes de pagar.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
