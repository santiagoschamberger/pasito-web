import Image from 'next/image'
import { Clock, Store, AlertTriangle } from 'lucide-react'
import {
  normalizePreviewResponse,
  type ReservationPreview,
  type ReservationStatus,
} from './reservation-preview'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://trsbowwcigzayhdpfxvd.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

type ReservationPageProps = {
  params: Promise<{ token: string }>
}

export const metadata = {
  title: 'Reserva — Pasito',
}

async function fetchPreview(token: string): Promise<ReservationPreview | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/coupon-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) return null
    return normalizePreviewResponse(body)
  } catch {
    return null
  }
}

function formatExpiry(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export default async function ReservationPage({ params }: ReservationPageProps) {
  const { token } = await params
  const data = await fetchPreview(token)

  if (!data) {
    return (
      <Main>
        <IconCircle>
          <AlertTriangle size={36} style={{ color: '#EEFA7A' }} />
        </IconCircle>
        <h1 className="text-2xl font-display" style={{ color: '#EEFA7A' }}>
          Link inválido
        </h1>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Este link de reserva no es válido o ya fue procesado.
        </p>
      </Main>
    )
  }

  if (data.status !== 'pending_confirmation') {
    const statusMessages: Record<
      Exclude<ReservationStatus, 'pending_confirmation'>,
      { title: string; body: string }
    > = {
      confirmed: {
        title: 'Ya confirmada',
        body: 'Esta reserva ya fue confirmada. No se requiere ninguna acción.',
      },
      rejected: {
        title: 'Ya rechazada',
        body: 'Esta reserva ya fue rechazada y los pasitos fueron devueltos.',
      },
      cancelled: {
        title: 'Cancelada',
        body: 'El usuario canceló esta reserva.',
      },
      expired: {
        title: 'Expirada',
        body: 'Esta reserva venció sin ser confirmada. Los pasitos fueron devueltos.',
      },
    }
    const msg = statusMessages[data.status]

    return (
      <Main>
        <IconCircle>
          <AlertTriangle size={36} style={{ color: '#EEFA7A' }} />
        </IconCircle>
        <h1 className="text-2xl font-display" style={{ color: '#EEFA7A' }}>
          {msg.title}
        </h1>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {msg.body}
        </p>
      </Main>
    )
  }

  return (
    <Main>
      <Image
        src="/pasitohorizontal.png"
        alt="Pasito"
        width={90}
        height={30}
        priority
        className="brightness-0 invert mb-4"
      />

      <IconCircle>
        <Store size={36} style={{ color: '#EEFA7A' }} />
      </IconCircle>

      <h1 className="text-2xl font-display" style={{ color: '#EEFA7A' }}>
        Nueva reserva
      </h1>

      <div className="w-full space-y-3">
        <InfoRow label="Servicio" value={data.rewardTitle} />
        <InfoRow label="Cliente" value={data.clientFirstName} />
        <InfoRow label="Pasitos" value={`${data.pasitosCost}`} />
        <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <Clock size={14} />
          <span>Vence: {formatExpiry(data.expiresAt)}</span>
        </div>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
        Si coordinaste el turno con el cliente, tocá <strong className="text-white">Confirmar</strong>.
        Si no es posible, tocá <strong className="text-white">Rechazar</strong> y se le devuelven los pasitos.
      </p>

      <div className="w-full flex flex-col gap-3">
        <form method="post" action={`/r/${encodeURIComponent(token)}/confirm`}>
          <button
            type="submit"
            className="h-[52px] w-full rounded-full text-base font-black cursor-pointer"
            style={{ background: '#EEFA7A', color: '#203326' }}
          >
            Confirmar reserva
          </button>
        </form>

        <form method="post" action={`/r/${encodeURIComponent(token)}/reject`}>
          <button
            type="submit"
            className="h-[48px] w-full rounded-full text-base font-semibold cursor-pointer"
            style={{
              background: 'transparent',
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            Rechazar reserva
          </button>
        </form>
      </div>
    </Main>
  )
}

function Main({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-dvh flex flex-col"
      style={{ background: 'linear-gradient(160deg, #0C6B45 0%, #084d32 100%)' }}
    >
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center gap-5 w-full max-w-[420px] mx-auto">
        {children}
      </section>
      <footer className="shrink-0 flex justify-center text-[10px] pb-[max(env(safe-area-inset-bottom),12px)] pt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
        pasito.app
      </footer>
    </main>
  )
}

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center"
      style={{ background: 'rgba(238,250,122,0.15)' }}
    >
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between items-center px-4 py-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.08)' }}
    >
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  )
}
