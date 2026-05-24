import type { Metadata } from 'next'
import Image from 'next/image'
import { Footprints, Gift, MapPin } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { WaitlistForm } from './WaitlistForm'

export const metadata: Metadata = {
  title: 'Pasito Uruguay - Waitlist',
  description: 'Anotate en la waitlist de Pasito Uruguay.',
}

export const revalidate = 0

const URUGUAY_WAITLIST_BASE = 600
const URUGUAY_WAITLIST_STARTED_AT = '2026-05-24T21:42:44Z'

async function getUruguayWaitlistCount() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return URUGUAY_WAITLIST_BASE
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
  const { count, error } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', URUGUAY_WAITLIST_STARTED_AT)

  if (error) {
    console.error('Uruguay waitlist count error:', error)
    return URUGUAY_WAITLIST_BASE
  }

  return URUGUAY_WAITLIST_BASE + (count ?? 0)
}

export default async function UruguayPage() {
  const totalPersonas = await getUruguayWaitlistCount()

  return (
    <main
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: '#2E6097' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 85%, rgba(238,250,122,0.08) 0%, transparent 50%), radial-gradient(circle at 85% 10%, rgba(238,250,122,0.06) 0%, transparent 45%)',
        }}
      />

      <div className="relative shrink-0 flex justify-center pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <Image
          src="/pasitohorizontal.png"
          alt="Pasito"
          width={90}
          height={30}
          priority
          className="brightness-0 invert"
        />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-5 min-h-0">
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-2.5">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(238,250,122,0.12)' }}
            >
              <Image
                src="/paloma-main.png"
                alt=""
                width={48}
                height={48}
                className="drop-shadow-lg"
                aria-hidden
              />
            </div>
            <div
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: '#EEFA7A', color: '#0C6B45' }}
            >
              Próximamente en URUGUAY
            </div>
          </div>

          <div className="space-y-2">
            <h1
              className="text-[26px] leading-tight font-display"
              style={{ color: '#EEFA7A' }}
            >
              Caminá y ganá premios
            </h1>
            <p className="text-[13px] leading-snug" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Pasito convierte tus pasos en descuentos y regalos en comercios cerca tuyo.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {[
              { icon: Footprints, text: 'Caminás' },
              { icon: Gift, text: 'Ganás pasitos' },
              { icon: MapPin, text: 'Canjeas cerca' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
              >
                <Icon size={12} style={{ color: '#EEFA7A' }} />
                {text}
              </div>
            ))}
          </div>

          <div className="w-full pt-1">
            <WaitlistForm />
          </div>

          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full mt-1"
            style={{ background: 'rgba(238,250,122,0.12)', border: '1px solid rgba(238,250,122,0.2)' }}
          >
            <span className="text-sm font-bold" style={{ color: '#EEFA7A' }}>+{totalPersonas}</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>personas ya se sumaron</span>
          </div>
        </div>
      </div>

      <div className="relative shrink-0 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] pb-[max(env(safe-area-inset-bottom),12px)] pt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
        <a href="/contacto" className="underline hover:text-white/40 transition-colors">
          Contacto
        </a>
        <span>·</span>
        <a href="/privacidad" className="underline hover:text-white/40 transition-colors">
          Privacidad
        </a>
        <span>·</span>
        <a href="/terminos" className="underline hover:text-white/40 transition-colors">
          Términos
        </a>
        <span>·</span>
        <a href="/eliminar-cuenta" className="underline hover:text-white/40 transition-colors">
          Eliminar cuenta
        </a>
      </div>
    </main>
  )
}
