'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Clock, Loader2, MessageCircle, ShieldCheck, Ticket, Trophy } from 'lucide-react'

import {
  PASITO_CLUB_BASE_PRICE,
  PASITO_CLUB_EVENT,
  PASITO_CLUB_RACE,
  PASITO_CLUB_RACE_MIN_PACK,
  PASITO_CLUB_TERMS_PATH,
  PASITO_CLUB_TRAININGS,
  isValidEmail,
  normalizeWhatsapp,
  packIncludesRace,
  packSavingsPercent,
  pasitoClubMoney,
  pasitoClubPacks,
  trainingIsUpcoming,
  type DateInventory,
} from '@/lib/pasito-club-event'
import styles from './club.module.css'

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
  .rebill-submit-button:hover { background: #00402e !important; }
`
const LOW_STOCK = 40

type Quote = {
  intentId: string
  intentToken: string
  quantity: number
  amount: number
  currency: string
  packSize: number
  positions: number[]
  includesRace: boolean
  email: string
  phone: string
  expiresAt: string
}

type Confirmation = {
  emailPending: boolean
  email?: string
  tickets: { code: string; label: string; isRace: boolean; url: string }[]
}

let rebillSDKPromise: Promise<void> | null = null

function loadRebillSDK(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  if (!REBILL_PUBLIC_KEY) return Promise.reject(new Error('Falta la clave pública de Rebill.'))
  if (customElements.get('rebill-checkout')) return Promise.resolve()
  if (rebillSDKPromise) return rebillSDKPromise
  rebillSDKPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-rebill-sdk]')
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
      script.dataset.rebillSdk = ''
      document.head.appendChild(script)
    } else if (customElements.get('rebill-checkout')) {
      loaded()
    }
  })
  return rebillSDKPromise
}

function RebillFrame({ product, onSuccess, onError }: {
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
    return <div className={styles.formError} role="alert">No pudimos cargar el pago seguro. Recargá la página e intentá nuevamente.</div>
  }
  return (
    <div className={styles.rebillFrame} aria-busy={!ready}>
      <div ref={hostRef} />
      {!ready && (
        <div className={styles.rebillLoading} role="status">
          <Loader2 className={styles.spin} aria-hidden="true" />
          <span>Preparando pago seguro…</span>
        </div>
      )}
    </div>
  )
}

function paymentErrorMessage(detail: unknown): string {
  const status = String((detail as { data?: { result?: { statusDetail?: string } } })?.data?.result?.statusDetail ?? '')
  if (status === 'card_declined') return 'La tarjeta fue rechazada. Probá con otro medio de pago.'
  if (status === 'insufficient_funds') return 'No hay fondos suficientes para completar el pago.'
  if (status === 'expired_card') return 'La tarjeta está vencida.'
  if (status === 'invalid_card') return 'Revisá los datos de la tarjeta.'
  return 'No se pudo procesar el pago. Revisá los datos e intentá nuevamente.'
}

function formatPhone(e164: string): string {
  const match = e164.match(/^\+549(\d{2})(\d{4})(\d{4})$/)
  return match ? `+54 9 ${match[1]} ${match[2]} ${match[3]}` : e164
}

function trainingLabel(position: number) {
  const training = PASITO_CLUB_TRAININGS.find((item) => item.position === position)
  return training ? `#${training.number} · ${training.shortLabel}` : ''
}

export function PasitoClubCheckout({ mockCheckout = false }: { mockCheckout?: boolean }) {
  const packs = pasitoClubPacks()
  const defaultPack = packs.find((pack) => pack.featured) ?? packs[0]
  const [packSize, setPackSize] = useState(defaultPack.size)
  const [selected, setSelected] = useState<number[]>([])
  const [touchedDates, setTouchedDates] = useState(false)
  const [inventory, setInventory] = useState<DateInventory[]>([])
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; phone?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [paymentReceived, setPaymentReceived] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [verificationAttempt, setVerificationAttempt] = useState(0)
  const [inactivePayment, setInactivePayment] = useState<'refunded' | 'inactive' | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const refreshAvailability = useCallback(async () => {
    try {
      const response = await fetch('/api/pasito-club/availability', { cache: 'no-store' })
      const payload = await response.json() as { dates?: DateInventory[] }
      if (response.ok && payload.dates) setInventory(payload.dates)
    } catch {
      // The reservation endpoint remains the authoritative capacity check.
    }
  }, [])

  useEffect(() => {
    void refreshAvailability()
  }, [refreshAvailability])

  const dates = useMemo(() => PASITO_CLUB_TRAININGS.map((training) => {
    const live = inventory.find((item) => item.position === training.position)
    const available = live?.available ?? null
    const upcoming = trainingIsUpcoming(training)
    return { training, available, upcoming, selectable: upcoming && (available === null || available > 0) }
  }), [inventory])
  const selectableCount = dates.filter((date) => date.selectable).length

  // Until the buyer edits the dates, keep the earliest available ones picked.
  useEffect(() => {
    if (touchedDates) return
    setSelected(dates.filter((date) => date.selectable).slice(0, packSize).map((date) => date.training.position))
  }, [dates, packSize, touchedDates])

  const pack = packs.find((item) => item.size === packSize) ?? defaultPack
  const datesReady = selected.length === pack.size

  const toggleDate = (position: number) => {
    setTouchedDates(true)
    setError(null)
    setSelected((current) => {
      if (current.includes(position)) return current.filter((item) => item !== position)
      if (current.length >= pack.size) return pack.size === 1 ? [position] : current
      return [...current, position].sort((a, b) => a - b)
    })
  }

  const choosePack = (size: number) => {
    setPackSize(size)
    setError(null)
    setSelected((current) => {
      const keep = current.filter((position) => dates.find((date) => date.training.position === position)?.selectable)
      if (keep.length >= size) return keep.slice(0, size)
      const extra = dates.filter((date) => date.selectable && !keep.includes(date.training.position))
        .slice(0, size - keep.length).map((date) => date.training.position)
      return [...keep, ...extra].sort((a, b) => a - b)
    })
  }

  const releaseQuote = useCallback(async (reservation: Quote) => {
    try {
      await fetch(`/api/pasito-club/checkout-intents/${reservation.intentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentToken: reservation.intentToken }),
        keepalive: true,
      })
    } catch {
      // Holds expire on their own after 10 minutes.
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
        setError('Tu reserva venció. Volvé a confirmar tus fechas.')
        void refreshAvailability()
      }
    }
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [confirmation, paymentReceived, quote, refreshAvailability, releaseQuote])

  const scrollToCard = () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const startCheckout = async () => {
    const nextErrors: typeof fieldErrors = {}
    if (!isValidEmail(email.trim())) nextErrors.email = 'Revisá tu email.'
    if (!normalizeWhatsapp(phone)) nextErrors.phone = 'Poné código de área + número, ej. 11 2345 6789.'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    if (!datesReady) {
      setError(`Elegí ${pack.size} ${pack.size === 1 ? 'fecha' : 'fechas'}.`)
      return
    }
    setPreparing(true)
    setError(null)
    if (!mockCheckout) loadRebillSDK().catch(() => undefined)
    try {
      const response = await fetch('/api/pasito-club/checkout-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packSize: pack.size, positions: selected, email: email.trim(), phone, termsAccepted }),
      })
      const payload = await response.json().catch(() => ({})) as Quote & { error?: string; soldOutPositions?: number[] }
      if (!response.ok || !payload.intentId) {
        if (payload.soldOutPositions?.length) {
          setTouchedDates(true)
          setSelected((current) => current.filter((position) => !payload.soldOutPositions!.includes(position)))
        }
        throw new Error(payload.error || 'No pudimos reservar tu lugar.')
      }
      setQuote(payload)
      setPaymentReceived(false)
      setPaymentId(null)
      setInactivePayment(null)
      setConfirmation(null)
      requestAnimationFrame(scrollToCard)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos reservar tu lugar.')
      void refreshAvailability()
    } finally {
      setPreparing(false)
    }
  }

  const goBack = async () => {
    if (!quote || confirming) return
    await releaseQuote(quote)
    setQuote(null)
    setError(null)
    void refreshAvailability()
  }

  const handleSuccess = useCallback((detail: unknown) => {
    const id = (detail as { data?: { result?: { paymentId?: unknown } } })?.data?.result?.paymentId
    setPaymentId(typeof id === 'string' && id.trim() ? id.trim() : null)
    setPaymentReceived(true)
    setError(null)
  }, [])

  const simulatePayment = () => {
    setPaymentId(`e2e_pay_mock_${Date.now()}`)
    setPaymentReceived(true)
  }

  useEffect(() => {
    if (!paymentReceived || !quote || confirmation || inactivePayment) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    setConfirming(true)
    const verify = async () => {
      try {
        const confirmDirectly = attempts === 0 && paymentId
        const response = await fetch(`/api/pasito-club/orders/${confirmDirectly ? 'confirm' : 'status'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(confirmDirectly ? { paymentId, intentId: quote.intentId } : { intentToken: quote.intentToken }),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
        })
        const payload = await response.json() as Confirmation & { status?: string; refunded?: boolean }
        if (controller.signal.aborted) return
        if (response.ok && payload.tickets?.length) {
          setConfirmation(payload)
          setConfirming(false)
          void refreshAvailability()
          requestAnimationFrame(scrollToCard)
          return
        }
        if (response.ok && payload.status === 'inactive') {
          setInactivePayment(payload.refunded ? 'refunded' : 'inactive')
          setConfirming(false)
          return
        }
      } catch {
        // The webhook can confirm after the browser callback; keep polling.
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

  const product = useMemo(() => quote ? ({
    name: [{ language: 'es', text: `Pasito Club · Pack ${quote.packSize}` }],
    description: [{
      language: 'es',
      text: `${quote.positions.map(trainingLabel).join(', ')}${quote.includesRace ? ` + ${PASITO_CLUB_RACE.name}` : ''}`,
    }],
    amount: quote.amount,
    currency: quote.currency,
    metadata: {
      eventSlug: PASITO_CLUB_EVENT.slug,
      checkoutIntentId: quote.intentId,
      quantity: String(quote.quantity),
      packSize: String(quote.packSize),
    },
  }) : null, [quote])

  const reset = () => {
    setQuote(null)
    setConfirmation(null)
    setPaymentReceived(false)
    setPaymentId(null)
    setInactivePayment(null)
    setError(null)
    setTouchedDates(false)
    void refreshAvailability()
  }

  if (confirmation) {
    return (
      <div ref={cardRef} className={`${styles.checkoutCard} ${styles.successCard}`} data-testid="club-success" aria-live="polite">
        <span className={styles.successBadge} aria-hidden="true"><Check /></span>
        <p className={styles.eyebrowDark}>Compra confirmada</p>
        <h3 className={styles.successTitle}>¡Estás adentro!</h3>
        <div className={styles.whatsappNotice}>
          <MessageCircle aria-hidden="true" />
          <div>
            <strong>Te vamos a sumar al grupo de WhatsApp de Pasito Club</strong>
            <span>Con el número {quote ? formatPhone(quote.phone) : 'que nos dejaste'}. Ahí compartimos toda la info de cada encuentro.</span>
          </div>
        </div>
        <p className={styles.successText}>
          {confirmation.emailPending
            ? 'Guardá tus entradas desde acá abajo; el email puede demorar un poco.'
            : `Te mandamos las entradas a ${confirmation.email ?? quote?.email ?? 'tu email'}. También las podés abrir ahora:`}
        </p>
        <ul className={styles.ticketList}>
          {confirmation.tickets.map((ticket) => (
            <li key={ticket.code}>
              <a href={ticket.url} target="_blank" rel="noopener noreferrer" className={ticket.isRace ? styles.ticketRace : undefined}>
                <span>{ticket.isRace ? <Trophy aria-hidden="true" /> : <Ticket aria-hidden="true" />}{ticket.label}</span>
                <strong>{ticket.code}</strong>
              </a>
            </li>
          ))}
        </ul>
        <button type="button" className={styles.secondaryButton} onClick={reset}>Comprar para otra persona</button>
      </div>
    )
  }

  if (paymentReceived) {
    return (
      <div ref={cardRef} className={`${styles.checkoutCard} ${styles.successCard}`} aria-live="polite">
        <span className={styles.successBadge} aria-hidden="true">{inactivePayment ? <Ticket /> : <Clock />}</span>
        <h3 className={styles.successTitle}>
          {inactivePayment === 'refunded' ? 'El pago fue reembolsado.' : inactivePayment ? 'Esta compra no está activa.' : 'Estamos confirmando tu pago…'}
        </h3>
        <p className={styles.successText}>
          {inactivePayment ? 'Si necesitás ayuda, escribinos.' : 'No vuelvas a pagar. Tus entradas aparecen acá apenas se confirme.'}
        </p>
        {!confirming && !inactivePayment && (
          <button type="button" className={styles.primaryButton} onClick={() => setVerificationAttempt((value) => value + 1)}>Volver a verificar</button>
        )}
        <a className={styles.secondaryButton} href="/contacto">Contactar a Pasito</a>
      </div>
    )
  }

  if (quote && product) {
    return (
      <div ref={cardRef} className={styles.checkoutCard} data-testid="club-payment">
        <button type="button" className={styles.backButton} onClick={() => void goBack()} disabled={confirming}>
          <ArrowLeft aria-hidden="true" /> Cambiar pack o fechas
        </button>
        <div className={styles.quoteHeader}>
          <div>
            <p className={styles.eyebrowDark}>Pack {quote.packSize} {quote.packSize === 1 ? 'encuentro' : 'encuentros'}</p>
            <h3 className={styles.quoteTotal}>{pasitoClubMoney(quote.amount)}</h3>
          </div>
          <span className={styles.timer}><Clock aria-hidden="true" /> {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}</span>
        </div>
        <ul className={styles.quoteLines}>
          {quote.positions.map((position) => <li key={position}><Ticket aria-hidden="true" /> {trainingLabel(position)} · {PASITO_CLUB_EVENT.timeLabel}</li>)}
          {quote.includesRace && <li className={styles.quoteRace}><Trophy aria-hidden="true" /> {PASITO_CLUB_RACE.name} · {PASITO_CLUB_RACE.shortLabel} · incluida</li>}
        </ul>
        <p className={styles.quoteContact}>Entradas a <strong>{quote.email}</strong> · WhatsApp <strong>{formatPhone(quote.phone)}</strong></p>
        {error && <div className={styles.formError} role="alert">{error}</div>}
        {mockCheckout ? (
          <div className={styles.mockPayment}>
            <p>Modo prueba local: no se conecta con Rebill ni se cobra nada.</p>
            <button type="button" className={styles.primaryButton} onClick={simulatePayment}>Simular pago aprobado</button>
          </div>
        ) : (
          <RebillFrame product={product} onSuccess={handleSuccess} onError={(detail) => setError(paymentErrorMessage(detail))} />
        )}
        <p className={styles.finePrint}><ShieldCheck aria-hidden="true" /> Pago seguro con Rebill. Tus cupos quedan guardados mientras corre el reloj.</p>
      </div>
    )
  }

  return (
    <div ref={cardRef} className={styles.checkoutCard} data-testid="club-checkout">
      <fieldset className={styles.step}>
        <legend><span>1</span> Elegí tu pack</legend>
        <div className={styles.packGrid}>
          {packs.map((item) => {
            const savings = packSavingsPercent(item)
            const active = item.size === packSize
            const disabled = item.size > selectableCount
            const race = packIncludesRace(item.size)
            return (
              <button
                key={item.size}
                type="button"
                className={`${styles.packCard} ${active ? styles.packActive : ''}`}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => choosePack(item.size)}
              >
                {item.featured && <span className={styles.packFlag}>El más elegido</span>}
                <span className={styles.packBody}>
                  <span className={styles.packTop}>
                    <span className={styles.packSize}>{item.size}<small>{item.size === 1 ? 'encuentro' : 'encuentros'}</small></span>
                    {savings > 0 && <span className={styles.packSavings}>−{savings}%</span>}
                  </span>
                  <span className={styles.packPricing}>
                    <span className={styles.packPrice}>{pasitoClubMoney(item.price)}</span>
                    <span className={styles.packUnit}>{pasitoClubMoney(Math.round(item.price / item.size))} c/u</span>
                  </span>
                </span>
                <span className={`${styles.packPerk} ${race ? styles.packPerkRace : ''}`}>
                  {race ? <><Trophy aria-hidden="true" /> Carrera incluida</> : 'Solo entrenamientos'}
                </span>
              </button>
            )
          })}
        </div>
        {!packIncludesRace(pack.size) && (
          <p className={styles.upsell}>
            Con {PASITO_CLUB_RACE_MIN_PACK} encuentros o más, la <strong>Carrera Pasito Club</strong> (3K o 5K, con kit) viene incluida.
          </p>
        )}
      </fieldset>

      <fieldset className={styles.step}>
        <legend><span>2</span> Elegí tus miércoles <em>{selected.length}/{pack.size}</em></legend>
        <div className={styles.dateGrid}>
          {dates.map(({ training, available, upcoming, selectable }) => {
            const isSelected = selected.includes(training.position)
            const full = selected.length >= pack.size && !isSelected && pack.size > 1
            return (
              <button
                key={training.position}
                type="button"
                className={`${styles.dateChip} ${isSelected ? styles.dateSelected : ''}`}
                aria-pressed={isSelected}
                disabled={!selectable || full}
                onClick={() => toggleDate(training.position)}
              >
                <span className={styles.dateNumber}>#{training.number}</span>
                <span className={styles.dateLabel}>{training.shortLabel}</span>
                <span className={styles.dateMeta}>
                  {!upcoming ? 'Ya pasó' : available === 0 ? 'Agotado' : available !== null && available <= LOW_STOCK ? `Quedan ${available}` : training.hasAfter ? 'After' : `${PASITO_CLUB_EVENT.capacityPerDate} cupos`}
                </span>
                {isSelected && <Check className={styles.dateCheck} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className={styles.step}>
        <legend><span>3</span> Tus datos</legend>
        <label className={styles.field}>
          <span>Email <small>(te mandamos las entradas)</small></span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="tu@mail.com"
            value={email}
            maxLength={254}
            onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: undefined })) }}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && <em role="alert">{fieldErrors.email}</em>}
        </label>
        <label className={styles.field}>
          <span>WhatsApp <small>(te sumamos al grupo del club)</small></span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="11 2345 6789"
            value={phone}
            maxLength={24}
            onChange={(event) => { setPhone(event.target.value); setFieldErrors((current) => ({ ...current, phone: undefined })) }}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          {fieldErrors.phone && <em role="alert">{fieldErrors.phone}</em>}
        </label>
        <label className={styles.terms}>
          <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
          <span>Acepto las <a href={PASITO_CLUB_TERMS_PATH} target="_blank" rel="noopener noreferrer">bases y condiciones</a> de Pasito Club.</span>
        </label>
      </fieldset>

      {error && <div className={styles.formError} role="alert">{error}</div>}
      <button
        type="button"
        className={styles.primaryButton}
        onClick={() => void startCheckout()}
        disabled={preparing || !termsAccepted || !datesReady}
      >
        {preparing ? <><Loader2 className={styles.spin} aria-hidden="true" /> Guardando tus cupos…</> : `Continuar al pago · ${pasitoClubMoney(pack.price)}`}
      </button>
      <p className={styles.finePrint}>
        Precio de lista {pasitoClubMoney(PASITO_CLUB_BASE_PRICE)} por encuentro. Guardamos tus cupos 10 minutos mientras pagás.
      </p>
    </div>
  )
}
