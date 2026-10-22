import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'

import { db } from '@/lib/gestion/server'

export const metadata: Metadata = { title: 'Tu entrada', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Página pública con el QR personal (el token es imposible de adivinar).
export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) notFound()
  const { data } = await db()
    .from('gestion_attendees')
    .select('name, companions, status, deleted_at, gestion_events(name, start_date, start_time, venue, city)')
    .eq('qr_token', token)
    .maybeSingle()
  if (!data || data.deleted_at) notFound()
  const event = data.gestion_events as unknown as { name: string; start_date: string | null; start_time: string | null; venue: string | null; city: string | null }
  const svg = await QRCode.toString(token, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#102A1E', light: '#FFFFFF' } })
  const when = event.start_date
    ? new Date(`${event.start_date}T12:00:00-03:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null
  return (
    <main className="grid min-h-dvh place-items-center bg-[#006D42] p-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
        <p className="text-sm font-bold text-[#006D42]">Pasito</p>
        <h1 className="mt-1 text-2xl font-extrabold">{event.name}</h1>
        {when && <p className="mt-1 text-sm text-[#5F6761] capitalize">{when}{event.start_time ? ` · ${event.start_time}` : ''}</p>}
        {(event.venue || event.city) && <p className="text-sm text-[#5F6761]">{[event.venue, event.city].filter(Boolean).join(', ')}</p>}
        <div className="mx-auto my-5 w-full max-w-[260px]" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="text-xl font-bold">{data.name}</p>
        {data.companions > 0 && <p className="text-sm text-[#5F6761]">+{data.companions} acompañante(s)</p>}
        {data.status !== 'anotado' && <p className="mt-2 text-sm font-semibold text-[#006D42]">Ingreso registrado</p>}
        <p className="mt-4 text-xs text-[#66706B]">Mostralo en la puerta con el brillo alto. Sin batería, decí tu nombre y te buscamos en la lista.</p>
      </div>
    </main>
  )
}
