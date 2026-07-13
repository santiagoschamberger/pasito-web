'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  EMPTY_SHIPPING_ADDRESS,
  formatShippingAddress,
  normalizeShippingAddress,
  type ShippingAddress,
} from '@/lib/store-shipping'
import styles from './tienda.module.css'

/* ────────────────────────────────────────────────────────────────────────
 * Config — todo lo editable en un solo lugar.
 * El public key es publicable (seguro en el cliente) y se configura por entorno
 * con NEXT_PUBLIC_REBILL_PUBLIC_KEY.
 * OJO: PRICE / SHIPPING / CURRENCY deben coincidir con app/api/orders/route.ts
 * ──────────────────────────────────────────────────────────────────────── */
const REBILL_PUBLIC_KEY = process.env.NEXT_PUBLIC_REBILL_PUBLIC_KEY ?? ''

// Loader de los web components de Rebill vía CDN (no toca package.json).
const REBILL_SDK_SRC = 'https://unpkg.com/rebill@1.17.28/dist/rebill/rebill.esm.js'

const PRODUCT_NAME = 'Remera Pasito'
const PRICE = 35000 // ⬅️ precio unitario
const SHIPPING = 2000 // ⬅️ costo de envío a domicilio
const CURRENCY = 'ARS' // ARS | USD | BRL | CLP | COP | MXN

// Referencias de los productos persistentes en Rebill. El checkout sigue
// usando instant-product porque el total depende de cantidad + entrega, pero
// guardamos la referencia correcta en cada pago para poder reconciliarlo.
const REBILL_PRODUCT_REFERENCE = {
  retiro: 'prd_936db4129964428d9377bda54608d012',
  envio: 'prd_916d9bf2683e40b4abf1c2a9c94e3145',
} as const

const SIZES = ['S', 'M', 'L', 'XL'] as const
type Size = (typeof SIZES)[number]

type Print = { id: string; label: string; hex: string }
type Base = {
  id: string
  label: string
  hex: string
  ring: string
  dark: boolean
  print: Print // la estampa la define el color (no se elige)
  images?: string[] // fotos reales (1ª = principal). Si no hay, se dibuja el mockup.
}

// Remera blanca → estampa verde. Remera negra → estampa blanca.
const BASES: Base[] = [
  {
    id: 'blanca',
    label: 'Blanca',
    hex: '#F7F7F4',
    ring: '#C9C9C1',
    dark: false,
    print: { id: 'verde', label: 'Verde', hex: '#0C6B45' },
    images: ['/tienda/remera-blanca.png', '/tienda/remera-blanca-frente.jpg'],
  },
  {
    id: 'negra',
    label: 'Negra',
    hex: '#1B1B1B',
    ring: '#1B1B1B',
    dark: true,
    print: { id: 'blanca', label: 'Blanca', hex: '#F7F7F4' },
    images: ['/tienda/remera-negra.jpg', '/tienda/remera-negra-frente.jpg'],
  },
]

type Delivery = 'retiro' | 'envio'
const DELIVERY_OPTIONS: { id: Delivery; label: string; note: string; cost: number }[] = [
  { id: 'retiro', label: 'Retiro en Gallo 1645', note: 'Lun a vie · 11 a 15 h', cost: 0 },
  { id: 'envio', label: 'Envío a domicilio', note: 'Despacho en 5–6 días hábiles', cost: SHIPPING },
]

const ARGENTINA_PROVINCES = [
  'Buenos Aires',
  'Ciudad Autónoma de Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
] as const

type StockMap = Record<string, Record<string, number>>

// Si Supabase no responde, no inventamos disponibilidad ni dejamos avanzar al
// pago. El stock comunicado siempre tiene que ser el stock real.
const EMPTY_STOCK: StockMap = {}

const MAX_PER_ORDER = 10

/* ──────────────────────────────────────────────────────────────────────── */

const stockFor = (stock: StockMap, baseId: string, size: Size) => stock[baseId]?.[size] ?? 0
const firstAvailableSize = (stock: StockMap, baseId: string): Size =>
  SIZES.find((s) => stockFor(stock, baseId, s) > 0) ?? SIZES[0]

const money = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(n)

function rebillErrorMessage(detail: unknown) {
  const statusDetail = String((detail as { data?: { result?: { statusDetail?: string } } })?.data?.result?.statusDetail ?? '')
  if (statusDetail === 'card_declined') return 'La tarjeta fue rechazada. Probá con otro medio de pago.'
  if (statusDetail === 'insufficient_funds') return 'No hay fondos suficientes para completar el pago.'
  if (statusDetail === 'expired_card') return 'La tarjeta está vencida. Probá con otra tarjeta.'
  if (statusDetail === 'invalid_card') return 'Revisá los datos de la tarjeta e intentá nuevamente.'
  return 'No se pudo procesar el pago. Revisá los datos e intentá nuevamente.'
}

// Estilos aplicados dentro del shadow DOM del checkout de Rebill.
const CHECKOUT_CSS = `
  .rebill-submit-button {
    background: #0C6B45 !important;
    border-radius: 9999px !important;
    font-weight: 600 !important;
  }
  .rebill-submit-button:hover { background: #0a5a3a !important; }
`

// Ocultamos el panel de resumen interno de Rebill (mostramos el nuestro arriba)
// y el logo → checkout de una sola columna, limpio y sin recortes.
const CHECKOUT_DISPLAY = JSON.stringify({ checkoutSummary: false, logo: false })

let rebillSDKPromise: Promise<void> | null = null

function loadRebillSDK(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  if (!REBILL_PUBLIC_KEY) return Promise.reject(new Error('Falta configurar la clave publica de Rebill.'))
  if (customElements.get('rebill-checkout')) return Promise.resolve()
  if (rebillSDKPromise) return rebillSDKPromise

  rebillSDKPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-rebill-sdk]')
    const script = existing ?? document.createElement('script')

    const finishLoading = () => {
      customElements.whenDefined('rebill-checkout').then(() => resolve()).catch(reject)
    }
    const failLoading = () => {
      rebillSDKPromise = null
      reject(new Error('No se pudo cargar el checkout de Rebill.'))
    }

    script.addEventListener('load', finishLoading, { once: true })
    script.addEventListener('error', failLoading, { once: true })

    if (!existing) {
      script.type = 'module'
      script.src = REBILL_SDK_SRC
      script.setAttribute('data-rebill-sdk', '')
      document.head.appendChild(script)
      return
    }

    // El script puede haber cargado entre el primer chequeo y los listeners.
    if (customElements.get('rebill-checkout')) finishLoading()
  })

  return rebillSDKPromise
}

function Tshirt({ base }: { base: Base }) {
  const stroke = base.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)'
  const collar = base.dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.14)'
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      role="img"
      aria-label={`Remera ${base.label} con estampa ${base.print.label}`}
    >
      <defs>
        <filter id="tee-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.8" floodColor="rgba(0,0,0,0.18)" />
        </filter>
      </defs>
      <path
        d="M25,18 L38,10 Q50,19 62,10 L75,18 L89,31 L79,42 L72,37 L72,88 Q50,92 28,88 L28,37 L21,42 L11,31 Z"
        fill={base.hex}
        stroke={stroke}
        strokeWidth="0.8"
        filter="url(#tee-shadow)"
        strokeLinejoin="round"
      />
      {/* Cuello */}
      <path d="M38,10 Q50,19 62,10" fill="none" stroke={collar} strokeWidth="1.4" strokeLinecap="round" />
      {/* Estampa */}
      <text
        x="50"
        y="61"
        textAnchor="middle"
        fill={base.print.hex}
        fontFamily='"Paytone One", ui-sans-serif, system-ui, sans-serif'
        fontSize="8.5"
        style={{ letterSpacing: '0.6px' }}
      >
        PASITO
      </text>
    </svg>
  )
}

/** Muestra la foto real del producto si existe; si no, dibuja el mockup. */
function ShirtVisual({ base, src }: { base: Base; src?: string }) {
  const image = src ?? base.images?.[0]
  if (image) {
    return (
      <img
        src={image}
        alt={`Remera ${base.label} con estampa ${base.print.label}`}
        className={styles.productImage}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        draggable={false}
      />
    )
  }
  return (
    <div className="grid h-full w-full place-items-center p-[12%]">
      <Tshirt base={base} />
    </div>
  )
}

function CheckoutFrame({
  instantProduct,
  onSuccess,
  onError,
  onReady,
  isReady,
}: {
  instantProduct: Record<string, unknown>
  onSuccess: (detail: unknown) => void
  onError: (detail: unknown) => void
  onReady: () => void
  isReady: boolean
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const key = JSON.stringify(instantProduct)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let active = true
    let el: HTMLElement | null = null
    let handleSuccess: ((e: Event) => void) | null = null
    let handleError: ((e: Event) => void) | null = null
    let handleReady: (() => void) | null = null
    let readyFallback: number | null = null
    let hasReportedReady = false

    setLoadError(false)
    loadRebillSDK()
      .then(() => {
        if (!active) return

        el = document.createElement('rebill-checkout')
        el.setAttribute('public-key', REBILL_PUBLIC_KEY)
        el.setAttribute('instant-product', key)
        el.setAttribute('css', CHECKOUT_CSS)
        el.setAttribute('display', CHECKOUT_DISPLAY)
        el.setAttribute('language', 'es')

        handleSuccess = (e: Event) => onSuccess((e as CustomEvent).detail)
        handleError = (e: Event) => onError((e as CustomEvent).detail)
        const reportReady = () => {
          if (hasReportedReady) return
          hasReportedReady = true
          if (readyFallback) window.clearTimeout(readyFallback)
          onReady()
        }
        handleReady = reportReady
        el.addEventListener('success', handleSuccess)
        el.addEventListener('error', handleError)
        el.addEventListener('ready', handleReady)
        host.appendChild(el)
        // Algunas versiones previas del componente no emiten `ready` aunque
        // el formulario ya esté visible. El fallback evita que el estado de
        // carga quede bloqueado, sin alterar los eventos de pago de Rebill.
        readyFallback = window.setTimeout(reportReady, 3500)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })

    return () => {
      active = false
      if (el && handleSuccess) el.removeEventListener('success', handleSuccess)
      if (el && handleError) el.removeEventListener('error', handleError)
      if (el && handleReady) el.removeEventListener('ready', handleReady)
      if (readyFallback) window.clearTimeout(readyFallback)
      el?.remove()
    }
  }, [key, onSuccess, onError, onReady])

  if (loadError) {
    return <p className="rounded-2xl px-4 py-3 text-sm" style={{ background: '#FDECEC', color: '#B42318' }}>No pudimos cargar el checkout seguro. Probá de nuevo en unos segundos.</p>
  }

  return (
    <div className={styles.checkoutFrame} aria-busy={!isReady}>
      <div className={styles.checkoutHost} ref={hostRef} />
      {!isReady && (
        <div className={styles.checkoutLoading} role="status" aria-live="polite">
          <span className={styles.checkoutSpinner} aria-hidden="true" />
          <span>
            <strong>Preparando pago seguro</strong>
            <small>Conectando con Rebill. Puede tardar unos segundos.</small>
          </span>
        </div>
      )}
    </div>
  )
}

/** Swatch circular de color base. */
function Swatch({
  hex,
  ring,
  label,
  selected,
  onClick,
}: {
  hex: string
  ring: string
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      className="relative h-10 w-10 rounded-full transition-transform duration-150 hover:scale-105"
      style={{
        background: hex,
        border: '1px solid rgba(0,0,0,0.12)',
        boxShadow: selected ? `0 0 0 2px #fff, 0 0 0 4px ${ring}` : 'none',
      }}
    />
  )
}

export function StoreClient({ stock }: { stock?: StockMap }) {
  const inventory = stock ?? EMPTY_STOCK
  const inventoryKnown = stock !== undefined
  const [base, setBase] = useState<Base>(BASES[0])
  const [imgIdx, setImgIdx] = useState(0)
  const [size, setSize] = useState<Size>(() => firstAvailableSize(inventory, BASES[0].id))
  const [qty, setQty] = useState(1)
  const [delivery, setDelivery] = useState<Delivery>('retiro')
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<{ paymentId?: string; needsSupport?: boolean } | null>(null)
  const [checkoutReady, setCheckoutReady] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [registeringOrder, setRegisteringOrder] = useState(false)
  const [preparingCheckout, setPreparingCheckout] = useState(false)
  const [checkoutIntentId, setCheckoutIntentId] = useState<string | null>(null)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(() => ({ ...EMPTY_SHIPPING_ADDRESS }))
  const [shippingAddressError, setShippingAddressError] = useState<string | null>(null)

  useEffect(() => {
    loadRebillSDK().catch(() => undefined)
  }, [])

  const available = inventoryKnown ? stockFor(inventory, base.id, size) : null
  const soldOut = available !== null && available <= 0
  const canBuy = available !== null && available > 0
  const maxQty = available === null ? 1 : Math.max(1, Math.min(MAX_PER_ORDER, available))
  const shippingCost = delivery === 'envio' ? SHIPPING : 0
  const subtotal = PRICE * qty
  const total = subtotal + shippingCost
  const checkoutShippingAddress = delivery === 'envio' ? normalizeShippingAddress(shippingAddress) : null

  const selectBase = useCallback(
    (b: Base) => {
      setBase(b)
      setImgIdx(0)
      setSize(firstAvailableSize(inventory, b.id))
      setQty(1)
    },
    [inventory],
  )

  const selectSize = useCallback((s: Size) => {
    setSize(s)
    setQty(1)
  }, [])

  const openCheckout = useCallback(async () => {
    if (!canBuy) return

    const address = delivery === 'envio' ? normalizeShippingAddress(shippingAddress) : null
    if (delivery === 'envio' && !address) {
      setShippingAddressError('Completá calle y número, localidad, provincia, código postal y un teléfono válido.')
      return
    }

    setPreparingCheckout(true)
    setShippingAddressError(null)
    loadRebillSDK().catch(() => undefined)

    try {
      let nextIntentId: string | null = null
      if (delivery === 'envio') {
        const response = await fetch('/api/orders/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base: base.id,
            print: base.print.id,
            size,
            qty,
            address,
          }),
        })
        const payload = await response.json().catch(() => ({})) as { checkoutIntentId?: string; error?: string }
        if (!response.ok || !payload.checkoutIntentId) {
          throw new Error(payload.error || 'No pudimos guardar la dirección. Probá de nuevo.')
        }
        nextIntentId = payload.checkoutIntentId
      }

      setCheckoutIntentId(nextIntentId)
      setDone(null)
      setCheckoutReady(false)
      setCheckoutError(null)
      setRegisteringOrder(false)
      setOpen(true)
    } catch (error) {
      setShippingAddressError(error instanceof Error ? error.message : 'No pudimos preparar el envío.')
    } finally {
      setPreparingCheckout(false)
    }
  }, [base, canBuy, delivery, qty, shippingAddress, size])

  const closeCheckout = useCallback(() => {
    setOpen(false)
    setCheckoutIntentId(null)
  }, [])

  // El SDK sólo inicia el flujo. Recién mostramos el éxito cuando el servidor
  // confirma el pago con Rebill y descuenta el stock de forma idempotente.
  const handleSuccess = useCallback(
    async (detail: unknown) => {
      const d = detail as { data?: { result?: { paymentId?: string } } }
      const paymentId = d?.data?.result?.paymentId
      if (!paymentId) {
        setCheckoutError('El pago se inició, pero no recibimos su identificador. Escribinos para confirmarlo.')
        return
      }

      setRegisteringOrder(true)
      setCheckoutError(null)
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId,
            base: base.id,
            print: base.print.id,
            size,
            qty,
            delivery,
          }),
        })
        if (!response.ok) throw new Error('No se pudo confirmar la orden.')
        setDone({ paymentId })
      } catch {
        // El pago puede estar aprobado aunque la acreditación o el descuento de
        // stock todavía requieran revisión. No reabrimos el checkout para evitar
        // que la persona intente pagar dos veces.
        setDone({ paymentId, needsSupport: true })
      } finally {
        setRegisteringOrder(false)
      }
    },
    [base, size, qty, delivery],
  )

  const handleError = useCallback((detail: unknown) => setCheckoutError(rebillErrorMessage(detail)), [])
  const handleCheckoutReady = useCallback(() => setCheckoutReady(true), [])

  const variantText = `Remera ${base.label} · estampa ${base.print.label}`
  const deliveryLabel = delivery === 'retiro' ? 'Retiro en Gallo 1645' : 'Envío a domicilio'

  const instantProduct = {
    name: [{ language: 'es', text: `${PRODUCT_NAME} · ${variantText} · Talle ${size}` }],
    description: [
      {
        language: 'es',
        text: `${qty} ${qty === 1 ? 'unidad' : 'unidades'} · ${deliveryLabel}`,
      },
    ],
    amount: total, // incluye envío si corresponde
    currency: CURRENCY,
    metadata: {
      catalogProductId: REBILL_PRODUCT_REFERENCE[delivery],
      base: base.id,
      print: base.print.id,
      size,
      qty: String(qty),
      delivery,
      ...(checkoutIntentId ? { checkoutIntentId } : {}),
    },
  }

  // Fondo neutro, alineado con los mockups, visible durante la carga.
  const previewBg = base.dark ? '#E9EBEA' : '#E6E9E8'

  /* ── Vista de checkout a pantalla completa ── */
  if (open) {
    return (
      <div className={`${styles.storeCheckout} mx-auto w-full max-w-xl px-5 py-6 md:py-10`}>
        <button
          type="button"
          onClick={closeCheckout}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70"
          style={{ color: '#5B5B54' }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver a la tienda
        </button>

        {/* Resumen del pedido */}
        <div className="rounded-2xl p-4" style={{ background: '#FBFBF8', border: '1px solid #ECECE4' }}>
          <div className="flex items-center gap-4">
            <div
              className="h-16 w-16 shrink-0 overflow-hidden rounded-xl"
              style={{ background: previewBg, border: '1px solid #ECECE4' }}
            >
              <ShirtVisual base={base} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-base leading-tight" style={{ color: '#1B1B1B' }}>
                {PRODUCT_NAME} · {base.label}
              </div>
              <div className="text-sm" style={{ color: '#5B5B54' }}>
                Estampa {base.print.label} · Talle {size} · {qty} {qty === 1 ? 'unidad' : 'unidades'}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 border-t pt-3 text-sm" style={{ borderColor: '#ECECE4' }}>
            <div className="flex justify-between" style={{ color: '#5B5B54' }}>
              <span>Subtotal ({qty} u.)</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between" style={{ color: '#5B5B54' }}>
              <span>{deliveryLabel}</span>
              <span>{shippingCost === 0 ? 'Gratis' : money(shippingCost)}</span>
            </div>
            <div className="flex justify-between pt-1 text-base font-semibold" style={{ color: '#1B1B1B' }}>
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>
          {checkoutShippingAddress && (
            <div className={styles.checkoutShippingAddress}>
              <strong>Envío a</strong>
              <span>{formatShippingAddress(checkoutShippingAddress)}</span>
            </div>
          )}
        </div>

        {done ? (
          <div className="py-14 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full" style={{ background: '#EEFA7A' }}>
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#0C6B45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div className="font-display text-2xl" style={{ color: '#1B1B1B' }}>{done.needsSupport ? 'Pago recibido' : '¡Gracias por tu compra!'}</div>
            <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: '#5B5B54' }}>
              {done.needsSupport
                ? 'Estamos terminando de verificar la acreditación y te contactaremos por email. No hace falta que vuelvas a pagar.'
                : <>Te enviamos la confirmación por email. {delivery === 'retiro' ? 'Podés retirar en Gallo 1645, de lunes a viernes de 11 a 15 h.' : 'Tu dirección quedó guardada y despacharemos el pedido dentro de 5–6 días hábiles.'}</>}
            </p>
            {done.paymentId && (
              <p className="mt-3 text-[11px]" style={{ color: '#B4B4AC' }}>
                ID de pago: {done.paymentId}
              </p>
            )}
            <button
              type="button"
              onClick={closeCheckout}
              className="mt-7 h-12 rounded-full px-7 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ background: '#0C6B45' }}
            >
              Volver a la tienda
            </button>
          </div>
        ) : (
          <div className="mt-6">
            {checkoutError && (
              <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: '#FDECEC', color: '#B42318' }}>
                {checkoutError}
              </div>
            )}
            {registeringOrder && <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: '#F4EFE9', color: '#006D42' }}>Confirmando pago y reservando tu talle…</div>}
            <CheckoutFrame instantProduct={instantProduct} onSuccess={handleSuccess} onError={handleError} onReady={handleCheckoutReady} isReady={checkoutReady} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`${styles.storeGrid} mx-auto grid w-full max-w-5xl gap-8 px-5 py-8 md:grid-cols-2 md:gap-14 md:py-16`}>
      {/* Preview */}
      <div className={`${styles.storeGallery} flex flex-col gap-3`}>
        <div
          className={`${styles.storeGalleryMain} relative aspect-square w-full overflow-hidden rounded-3xl transition-colors duration-500`}
          style={{ background: previewBg, border: '1px solid #ECECE4' }}
        >
          <ShirtVisual base={base} src={base.images?.[imgIdx]} />
        </div>

        {base.images && base.images.length > 1 && (
          <div className="flex gap-3">
            {base.images.map((img, i) => {
              const selected = i === imgIdx
              return (
                <button
                  key={img}
                  type="button"
                  onClick={() => setImgIdx(i)}
                  aria-label={`Ver imagen ${i + 1}`}
                  aria-pressed={selected}
                  className="h-16 w-16 overflow-hidden rounded-xl transition-transform hover:scale-105"
                  style={{
                    background: previewBg,
                    border: selected ? '1.5px solid #0C6B45' : '1px solid #ECECE4',
                  }}
                >
                  <img
                    src={img}
                    alt=""
                    className={styles.thumbnailImage}
                    loading="eager"
                    decoding="async"
                    draggable={false}
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Detalle + selección */}
      <div className={`${styles.storeDetails} flex flex-col justify-center`}>
        <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: '#0C6B45' }}>
          Edición limitada
        </p>
        <h1 className="font-display mt-1 text-3xl leading-tight md:text-4xl" style={{ color: '#1B1B1B' }}>
          Vestite como alguien que siempre da un paso más.
        </h1>
        <ul className={styles.valueProps} aria-label="Características de la remera">
          <li>Calce oversize</li>
          <li>Algodón premium</li>
          <li>Sin reposición</li>
        </ul>
        <p className={styles.scarcityCopy}>
          Una sola tanda, sin reposición. Cuando se agota tu talle, se terminó.
        </p>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-2xl font-semibold" style={{ color: '#1B1B1B' }}>
            {money(PRICE)}
          </span>
          <span className="text-sm" style={{ color: '#9A9A92' }}>
            retiro gratis en Gallo 1645 · envío {money(SHIPPING)}
          </span>
        </div>

        {/* Color */}
        <div className="mt-7">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: '#1B1B1B' }}>
            Color <span style={{ color: '#8A8A82' }}>· Remera {base.label} (estampa {base.print.label})</span>
          </div>
          <div className="flex gap-3">
            {BASES.map((b) => (
              <Swatch
                key={b.id}
                hex={b.hex}
                ring={b.ring}
                label={`Remera ${b.label}`}
                selected={b.id === base.id}
                onClick={() => selectBase(b)}
              />
            ))}
          </div>
        </div>

        {/* Talles */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm font-medium" style={{ color: '#1B1B1B' }}>
            <span>Talle</span>
            <span className="text-xs font-normal" style={{ color: '#8A8A82' }}>Elegí el tuyo</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => {
              const out = inventoryKnown && stockFor(inventory, base.id, s) <= 0
              const selected = s === size && !out
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => selectSize(s)}
                  disabled={out}
                  aria-pressed={selected}
                  className="h-10 min-w-[44px] rounded-full px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed"
                  style={
                    out
                      ? { background: '#F5F5F0', color: '#C4C4BC', border: '1px solid #EAEAE2', textDecoration: 'line-through' }
                      : selected
                        ? { background: '#0C6B45', color: '#fff', border: '1px solid #0C6B45' }
                        : { background: '#fff', color: '#1B1B1B', border: '1px solid #E2E2DA' }
                  }
                >
                  {s}
                </button>
              )
            })}
          </div>
          <p
            className={styles.stockStatus}
            data-urgent={available !== null && available > 0 && available <= 10 ? 'true' : undefined}
            data-unavailable={!inventoryKnown || soldOut ? 'true' : undefined}
            role="status"
            aria-live="polite"
          >
            <span className={styles.stockDot} aria-hidden="true" />
            {!inventoryKnown
              ? 'No pudimos confirmar el stock en este momento. Probá de nuevo en unos minutos.'
              : soldOut
                ? `El talle ${size} está agotado.`
                : available === 1
                  ? `¡Queda la última unidad en talle ${size}!`
                  : available !== null && available <= 10
                    ? `¡Quedan solo ${available} unidades en talle ${size}!`
                    : `Quedan ${available} unidades en talle ${size} en esta tanda.`}
          </p>
        </div>

        {/* Entrega */}
        <div className="mt-6">
          <div className="mb-2 text-sm font-medium" style={{ color: '#1B1B1B' }}>
            Entrega
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DELIVERY_OPTIONS.map((o) => {
              const selected = o.id === delivery
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setDelivery(o.id)
                    setShippingAddressError(null)
                    setCheckoutIntentId(null)
                  }}
                  aria-pressed={selected}
                  className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors"
                  style={
                    selected
                      ? { border: '1.5px solid #0C6B45', background: '#F1F7F4' }
                      : { border: '1px solid #E2E2DA', background: '#fff' }
                  }
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium" style={{ color: '#1B1B1B' }}>
                      {o.label}
                    </span>
                    <span className="block text-xs" style={{ color: '#9A9A92' }}>
                      {o.note}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold" style={{ color: o.cost === 0 ? '#0C6B45' : '#1B1B1B' }}>
                    {o.cost === 0 ? 'Gratis' : money(o.cost)}
                  </span>
                </button>
              )
            })}
          </div>

          {delivery === 'envio' && (
            <fieldset className={styles.shippingForm} aria-describedby={shippingAddressError ? 'shipping-address-error' : undefined}>
              <legend>Dirección de envío</legend>
              <p className={styles.shippingFormIntro}>La guardamos de forma segura para preparar y entregar este pedido.</p>
              <div className={styles.shippingGrid}>
                <label className={styles.shippingFieldFull}>
                  <span>Calle y número</span>
                  <input
                    type="text"
                    value={shippingAddress.line1}
                    onChange={(event) => setShippingAddress((current) => ({ ...current, line1: event.target.value }))}
                    autoComplete="shipping address-line1"
                    placeholder="Ej. Av. Santa Fe 3253"
                    maxLength={140}
                    required
                  />
                </label>
                <label className={styles.shippingFieldFull}>
                  <span>Piso, departamento o casa <small>Opcional</small></span>
                  <input
                    type="text"
                    value={shippingAddress.line2}
                    onChange={(event) => setShippingAddress((current) => ({ ...current, line2: event.target.value }))}
                    autoComplete="shipping address-line2"
                    placeholder="Ej. Piso 4 · Depto. B"
                    maxLength={80}
                  />
                </label>
                <label>
                  <span>Localidad</span>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(event) => setShippingAddress((current) => ({ ...current, city: event.target.value }))}
                    autoComplete="shipping address-level2"
                    placeholder="Ej. Palermo"
                    maxLength={80}
                    required
                  />
                </label>
                <label>
                  <span>Provincia</span>
                  <select
                    value={shippingAddress.province}
                    onChange={(event) => setShippingAddress((current) => ({ ...current, province: event.target.value }))}
                    autoComplete="shipping address-level1"
                    required
                  >
                    <option value="">Elegí una provincia</option>
                    {ARGENTINA_PROVINCES.map((province) => <option value={province} key={province}>{province}</option>)}
                  </select>
                </label>
                <label>
                  <span>Código postal</span>
                  <input
                    type="text"
                    value={shippingAddress.postalCode}
                    onChange={(event) => setShippingAddress((current) => ({ ...current, postalCode: event.target.value.toUpperCase() }))}
                    autoComplete="shipping postal-code"
                    placeholder="Ej. C1425"
                    maxLength={12}
                    required
                  />
                </label>
                <label>
                  <span>Teléfono de contacto</span>
                  <input
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(event) => setShippingAddress((current) => ({ ...current, phone: event.target.value }))}
                    autoComplete="shipping tel"
                    inputMode="tel"
                    placeholder="Ej. 11 2345 6789"
                    maxLength={30}
                    required
                  />
                </label>
                <label className={styles.shippingFieldFull}>
                  <span>Indicaciones para la entrega <small>Opcional</small></span>
                  <textarea
                    value={shippingAddress.notes}
                    onChange={(event) => setShippingAddress((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Ej. Timbre 4B o dejar en recepción"
                    maxLength={240}
                    rows={2}
                  />
                </label>
              </div>
              {shippingAddressError && <p className={styles.shippingError} id="shipping-address-error" role="alert">{shippingAddressError}</p>}
              <p className={styles.shippingPrivacy}>Solo usamos estos datos para gestionar la entrega de tu compra.</p>
            </fieldset>
          )}
        </div>

        {/* Cantidad */}
        <div className="mt-6">
          <div className="mb-2 text-sm font-medium" style={{ color: '#1B1B1B' }}>
            Cantidad
          </div>
          <div className="inline-flex items-center rounded-full" style={{ border: '1px solid #E2E2DA' }}>
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid h-10 w-10 place-items-center text-lg disabled:opacity-30"
              disabled={qty <= 1 || !canBuy}
              aria-label="Restar"
              style={{ color: '#1B1B1B' }}
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold" style={{ color: '#1B1B1B' }}>
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              className="grid h-10 w-10 place-items-center text-lg disabled:opacity-30"
              disabled={qty >= maxQty || !canBuy}
              aria-label="Sumar"
              style={{ color: '#1B1B1B' }}
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={openCheckout}
          disabled={!canBuy || preparingCheckout}
          className="mt-8 flex h-14 items-center justify-center gap-2 rounded-full text-base font-semibold text-white transition-transform duration-150 enabled:hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: canBuy ? '#0C6B45' : '#9A9A92' }}
        >
          {preparingCheckout
            ? 'Guardando dirección…'
            : !inventoryKnown
            ? 'Stock no disponible'
            : soldOut
              ? 'Talle agotado'
              : `Asegurar mi talle · ${money(total)}`}
        </button>
        <p className="mt-3 text-center text-xs" style={{ color: '#9A9A92' }}>
          Pago seguro con Rebill · Confirmación por email
        </p>
      </div>
    </div>
  )
}
