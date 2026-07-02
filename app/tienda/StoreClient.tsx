'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/* ────────────────────────────────────────────────────────────────────────
 * Config — todo lo editable en un solo lugar.
 * El public key es publicable (seguro en el cliente). Se puede sobreescribir
 * con NEXT_PUBLIC_REBILL_PUBLIC_KEY sin tocar este archivo.
 * OJO: PRICE / SHIPPING / CURRENCY deben coincidir con app/api/orders/route.ts
 * ──────────────────────────────────────────────────────────────────────── */
const REBILL_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_REBILL_PUBLIC_KEY || 'pk_78eab16ffa844db3a04578121b630063'

// Loader de los web components de Rebill vía CDN (no toca package.json).
const REBILL_SDK_SRC = 'https://unpkg.com/rebill@1.17.28/dist/rebill/rebill.esm.js'

const PRODUCT_NAME = 'Remera Pasito'
const PRICE = 35000 // ⬅️ precio unitario
const SHIPPING = 2000 // ⬅️ costo de envío a domicilio
const CURRENCY = 'ARS' // ARS | USD | BRL | CLP | COP | MXN

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
  { id: 'retiro', label: 'Retiro en Palermo', note: 'Coordinamos por email', cost: 0 },
  { id: 'envio', label: 'Envío a domicilio', note: 'A todo el país', cost: SHIPPING },
]

type StockMap = Record<string, Record<string, number>>

// Stock por defecto (fallback si no se pudo leer el stock real de Supabase).
const DEFAULT_STOCK: StockMap = {
  blanca: { S: 24, M: 23, L: 23, XL: 23 },
  negra: { S: 24, M: 23, L: 23, XL: 23 },
}

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

function loadRebillSDK() {
  if (typeof document === 'undefined') return
  if (document.querySelector('script[data-rebill-sdk]')) return
  const s = document.createElement('script')
  s.type = 'module'
  s.src = REBILL_SDK_SRC
  s.setAttribute('data-rebill-sdk', '')
  document.head.appendChild(s)
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
        className="h-full w-full object-cover"
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
}: {
  instantProduct: Record<string, unknown>
  onSuccess: (detail: unknown) => void
  onError: (detail: unknown) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const key = JSON.stringify(instantProduct)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const el = document.createElement('rebill-checkout')
    el.setAttribute('public-key', REBILL_PUBLIC_KEY)
    el.setAttribute('instant-product', key)
    el.setAttribute('css', CHECKOUT_CSS)
    el.setAttribute('display', CHECKOUT_DISPLAY)

    const handleSuccess = (e: Event) => onSuccess((e as CustomEvent).detail)
    const handleError = (e: Event) => onError((e as CustomEvent).detail)
    el.addEventListener('success', handleSuccess)
    el.addEventListener('error', handleError)

    host.appendChild(el)
    return () => {
      el.removeEventListener('success', handleSuccess)
      el.removeEventListener('error', handleError)
      el.remove()
    }
  }, [key, onSuccess, onError])

  return <div ref={hostRef} className="min-h-[320px]" />
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

export function StoreClient({ stock = DEFAULT_STOCK }: { stock?: StockMap }) {
  const [base, setBase] = useState<Base>(BASES[0])
  const [imgIdx, setImgIdx] = useState(0)
  const [size, setSize] = useState<Size>(() => firstAvailableSize(stock, BASES[0].id))
  const [qty, setQty] = useState(1)
  const [delivery, setDelivery] = useState<Delivery>('retiro')
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<{ paymentId?: string } | null>(null)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    loadRebillSDK()
  }, [])

  const available = stockFor(stock, base.id, size)
  const soldOut = available <= 0
  const maxQty = Math.max(1, Math.min(MAX_PER_ORDER, available))
  const shippingCost = delivery === 'envio' ? SHIPPING : 0
  const subtotal = PRICE * qty
  const total = subtotal + shippingCost

  const selectBase = useCallback(
    (b: Base) => {
      setBase(b)
      setImgIdx(0)
      setSize(firstAvailableSize(stock, b.id))
      setQty(1)
    },
    [stock],
  )

  const selectSize = useCallback((s: Size) => {
    setSize(s)
    setQty(1)
  }, [])

  const openCheckout = useCallback(() => {
    setDone(null)
    setErrored(false)
    loadRebillSDK()
    setOpen(true)
  }, [])

  const closeCheckout = useCallback(() => setOpen(false), [])

  // Al confirmarse el pago: mostramos éxito y registramos la orden en el server,
  // que verifica el pago con Rebill y descuenta stock (idempotente).
  const handleSuccess = useCallback(
    (detail: unknown) => {
      const d = detail as { data?: { result?: { paymentId?: string } } }
      const paymentId = d?.data?.result?.paymentId
      setDone({ paymentId })
      if (paymentId) {
        fetch('/api/orders', {
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
        }).catch((err) => console.error('[tienda] Error registrando orden:', err))
      }
    },
    [base, size, qty, delivery],
  )

  const handleError = useCallback(() => setErrored(true), [])

  const variantText = `Remera ${base.label} · estampa ${base.print.label}`
  const deliveryLabel = delivery === 'retiro' ? 'Retiro en Palermo' : 'Envío a domicilio'

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
      base: base.id,
      print: base.print.id,
      size,
      qty: String(qty),
      delivery,
    },
  }

  const previewBg = base.dark ? '#F1F1EC' : '#F4F4EF'

  /* ── Vista de checkout a pantalla completa ── */
  if (open) {
    return (
      <div className="mx-auto w-full max-w-xl px-5 py-6 md:py-10">
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
        </div>

        {done ? (
          <div className="py-14 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full" style={{ background: '#EEFA7A' }}>
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#0C6B45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div className="font-display text-2xl" style={{ color: '#1B1B1B' }}>
              ¡Gracias por tu compra!
            </div>
            <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: '#5B5B54' }}>
              Te enviamos la confirmación por email.{' '}
              {delivery === 'retiro'
                ? 'Coordinamos el retiro en Palermo.'
                : 'Coordinamos el envío a tu domicilio.'}
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
            {errored && (
              <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: '#FDECEC', color: '#B42318' }}>
                No se pudo procesar el pago. Revisá los datos e intentá de nuevo.
              </div>
            )}
            <CheckoutFrame instantProduct={instantProduct} onSuccess={handleSuccess} onError={handleError} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-8 md:grid-cols-2 md:gap-14 md:py-16">
      {/* Preview */}
      <div className="flex flex-col gap-3">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-3xl transition-colors duration-500"
          style={{ background: previewBg, border: '1px solid #ECECE4' }}
        >
          <ShirtVisual base={base} src={base.images?.[imgIdx]} />
          <span
            className="absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{ background: '#EEFA7A', color: '#0C6B45' }}
          >
            Edición Pasito
          </span>
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
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Detalle + selección */}
      <div className="flex flex-col justify-center">
        <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: '#0C6B45' }}>
          Remera oversize · algodón premium
        </p>
        <h1 className="font-display mt-1 text-3xl leading-tight md:text-4xl" style={{ color: '#1B1B1B' }}>
          {PRODUCT_NAME}
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed" style={{ color: '#5B5B54' }}>
          Suave, liviana y hecha para moverte. Cada pasito cuenta — ahora también en tu ropa.
        </p>
        <p className="mt-2 max-w-md text-[13px] font-medium leading-relaxed" style={{ color: '#0C6B45' }}>
          Lote de 200 unidades, para los verdaderos amantes de Pasito. No hay re-stock.
        </p>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-2xl font-semibold" style={{ color: '#1B1B1B' }}>
            {money(PRICE)}
          </span>
          <span className="text-sm" style={{ color: '#9A9A92' }}>
            retiro gratis en Palermo · envío {money(SHIPPING)}
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
          <div className="mb-2 text-sm font-medium" style={{ color: '#1B1B1B' }}>
            Talle
          </div>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => {
              const out = stockFor(stock, base.id, s) <= 0
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
          {!soldOut && available <= 10 && (
            <p className="mt-2 text-xs font-medium" style={{ color: '#B4531B' }}>
              ¡Últimas {available} unidades en este talle!
            </p>
          )}
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
                  onClick={() => setDelivery(o.id)}
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
              disabled={qty <= 1 || soldOut}
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
              disabled={qty >= maxQty || soldOut}
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
          disabled={soldOut}
          className="mt-8 flex h-14 items-center justify-center gap-2 rounded-full text-base font-semibold text-white transition-transform duration-150 enabled:hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: soldOut ? '#9A9A92' : '#0C6B45' }}
        >
          {soldOut ? 'Agotado' : `Comprar · ${money(total)}`}
        </button>
        <p className="mt-3 text-center text-xs" style={{ color: '#9A9A92' }}>
          Pago seguro procesado por Rebill
        </p>
      </div>
    </div>
  )
}
