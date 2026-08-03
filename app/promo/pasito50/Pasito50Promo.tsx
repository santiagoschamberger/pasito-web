'use client'

import {
  CheckCircle2,
  Copy,
  Download,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'

import {
  PASITO_APP_STORE_URL,
  PASITO_PLAY_STORE_URL,
  isPasito50Otp,
  normalizePasito50Otp,
  normalizePasito50SupportId,
} from '@/lib/pasito50'
import { isTomateSupportId } from '@/lib/tomate-support-id'

type Store = 'android' | 'ios' | 'other'

function detectStore(): Store {
  const userAgent = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios'
  if (/android/.test(userAgent)) return 'android'
  return 'other'
}

export default function Pasito50Promo() {
  const [store, setStore] = useState<Store>('other')
  const [supportId, setSupportId] = useState('')
  const [otp, setOtp] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [phase, setPhase] = useState<'details' | 'code'>('details')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ amount: number; alreadyCredited: boolean } | null>(null)

  useEffect(() => setStore(detectStore()), [])

  const primaryStore = useMemo(() => {
    if (store === 'ios') return { href: PASITO_APP_STORE_URL, label: 'Descargar en App Store' }
    return { href: PASITO_PLAY_STORE_URL, label: 'Descargar en Google Play' }
  }, [store])

  async function requestCode() {
    if (!isTomateSupportId(supportId)) {
      setError('Ingresá el ID de 8 caracteres de tu cuenta de Pasito.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/promo/pasito50/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supportId }),
      })
      const payload = await response.json() as { challengeId?: string; error?: string }
      if (!response.ok || !payload.challengeId) {
        throw new Error(payload.error || 'No pudimos enviar el código.')
      }
      setChallengeId(payload.challengeId)
      setOtp('')
      setPhase('code')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos enviar el código.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await requestCode()
  }

  async function onClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!challengeId || !isPasito50Otp(otp)) {
      setError('Ingresá el código de 6 números que recibiste por email.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/promo/pasito50/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, otp, supportId }),
      })
      const payload = await response.json() as {
        amount?: number
        alreadyCredited?: boolean
        error?: string
      }
      if (!response.ok) throw new Error(payload.error || 'No pudimos acreditar los Pasitos.')
      setSuccess({
        amount: payload.amount ?? 50,
        alreadyCredited: Boolean(payload.alreadyCredited),
      })
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : 'No pudimos acreditar los Pasitos.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <section className="grid gap-6 rounded-[32px] border border-[#D9E6DF] bg-white p-7 text-center shadow-[0_18px_55px_rgba(12,107,69,0.12)] sm:p-10">
        <CheckCircle2 className="mx-auto h-16 w-16 text-[#0C6B45]" strokeWidth={2.2} />
        <div className="grid gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0A5639]">
            {success.alreadyCredited ? '¡Ya estaban acreditados!' : '¡Listo! Sumaste 50 Pasitos'}
          </h1>
          <p className="text-base leading-7 text-[#466B5C]">
            {success.alreadyCredited
              ? `Esta cuenta ya había recibido sus ${success.amount} Pasitos.`
              : `Acreditamos ${success.amount} Pasitos en tu cuenta.`}
          </p>
          <p className="text-sm font-semibold text-[#0C6B45]">
            Abrí Pasito para ver tu saldo actualizado.
          </p>
        </div>
        <a
          href={primaryStore.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#0C6B45] px-6 py-3 font-bold text-white transition hover:bg-[#084E34]"
        >
          Abrir Pasito
        </a>
      </section>
    )
  }

  return (
    <section className="grid gap-7 rounded-[32px] border border-[#D9E6DF] bg-white p-6 shadow-[0_18px_55px_rgba(12,107,69,0.12)] sm:p-10">
      <div className="grid gap-3 text-center">
        <span className="mx-auto rounded-full bg-[#DFFF55] px-4 py-1.5 text-sm font-extrabold uppercase tracking-wide text-[#0A5639]">
          Primeros 100 usuarios
        </span>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#0A5639] sm:text-5xl">
          Ganá 50 Pasitos
        </h1>
        <p className="mx-auto max-w-md text-base leading-7 text-[#466B5C]">
          Para cuentas creadas hace menos de 5 días. Enviamos un código al email asociado antes de acreditar el premio.
        </p>
      </div>

      <ol className="grid gap-4 text-[#173F31]">
        <li className="flex gap-4 rounded-2xl bg-[#F4F8F5] p-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0C6B45] font-extrabold text-white">1</span>
          <div className="grid gap-3">
            <p className="font-semibold">Descargá o abrí la app.</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={primaryStore.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#0C6B45] px-4 py-2.5 text-sm font-bold text-white"
              >
                <Download className="h-4 w-4" />
                {primaryStore.label}
              </a>
              {store === 'other' && (
                <a
                  href={PASITO_APP_STORE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-[#0C6B45] px-4 py-2.5 text-sm font-bold text-[#0C6B45]"
                >
                  App Store
                </a>
              )}
            </div>
          </div>
        </li>
        <li className="flex gap-4 rounded-2xl bg-[#F4F8F5] p-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0C6B45] font-extrabold text-white">2</span>
          <div>
            <p className="font-semibold">Copiá tu ID de 8 caracteres.</p>
            <p className="mt-1 text-sm leading-6 text-[#587568]">
              Está en <strong>Tu perfil</strong>, debajo de tu nombre. Tocá <strong>ID: XXXXXXXX</strong> para copiarlo.
            </p>
          </div>
        </li>
        <li className="flex gap-4 rounded-2xl bg-[#F4F8F5] p-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0C6B45] font-extrabold text-white">3</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {phase === 'details' ? 'Verificá que la cuenta sea tuya.' : 'Ingresá el código del email.'}
            </p>

            {phase === 'details' ? (
              <form onSubmit={onRequestCode} className="mt-3 grid gap-3" noValidate>
                <label htmlFor="support-id" className="sr-only">ID de soporte</label>
                <div className="relative">
                  <Copy className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#648074]" />
                  <input
                    id="support-id"
                    name="supportId"
                    value={supportId}
                    onChange={(event) => {
                      setSupportId(normalizePasito50SupportId(event.target.value))
                      setError('')
                    }}
                    placeholder="ID: A1B2C3D4"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={8}
                    className="min-h-13 w-full rounded-2xl border border-[#B9CCC3] bg-white py-3 pl-12 pr-4 font-mono text-lg font-bold uppercase tracking-[0.16em] text-[#173F31] outline-none transition placeholder:font-sans placeholder:text-sm placeholder:tracking-normal focus:border-[#0C6B45] focus:ring-4 focus:ring-[#0C6B45]/10"
                  />
                </div>
                {error && <FormError message={error} />}
                <button
                  type="submit"
                  disabled={submitting || !isTomateSupportId(supportId)}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#DFFF55] px-6 py-3.5 font-extrabold text-[#0A5639] transition hover:bg-[#D5F542] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && <LoaderCircle className="h-5 w-5 animate-spin" />}
                  {submitting ? 'Enviando…' : 'Enviar código seguro'}
                </button>
              </form>
            ) : (
              <form onSubmit={onClaim} className="mt-3 grid gap-3" noValidate>
                <div className="rounded-xl bg-[#E9F5EF] px-3 py-2 text-sm leading-5 text-[#315F4B]">
                  Si la cuenta es elegible, el código llegará al email asociado en unos minutos.
                </div>
                <label htmlFor="verification-code" className="sr-only">Código de verificación</label>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#648074]" />
                  <input
                    id="verification-code"
                    name="otp"
                    value={otp}
                    onChange={(event) => {
                      setOtp(normalizePasito50Otp(event.target.value))
                      setError('')
                    }}
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="min-h-13 w-full rounded-2xl border border-[#B9CCC3] bg-white py-3 pl-12 pr-4 font-mono text-xl font-extrabold tracking-[0.28em] text-[#173F31] outline-none transition focus:border-[#0C6B45] focus:ring-4 focus:ring-[#0C6B45]/10"
                  />
                </div>
                {error && <FormError message={error} />}
                <button
                  type="submit"
                  disabled={submitting || !isPasito50Otp(otp)}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#DFFF55] px-6 py-3.5 font-extrabold text-[#0A5639] transition hover:bg-[#D5F542] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && <LoaderCircle className="h-5 w-5 animate-spin" />}
                  {submitting ? 'Verificando…' : 'Verificar y recibir 50 Pasitos'}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setPhase('details')
                    setOtp('')
                    setError('')
                  }}
                  className="text-sm font-bold text-[#0C6B45] underline disabled:opacity-50"
                >
                  Cambiar ID
                </button>
              </form>
            )}
          </div>
        </li>
      </ol>

      <p className="text-center text-xs leading-5 text-[#6C8278]">
        Una acreditación por cuenta. El código vence en 10 minutos y tiene un máximo de 5 intentos.
      </p>
    </section>
  )
}

function FormError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl bg-[#FFF1EE] px-3 py-2 text-sm font-semibold leading-5 text-[#A33B2B]">
      {message}
    </p>
  )
}
