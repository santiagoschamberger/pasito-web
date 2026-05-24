import Image from 'next/image'
import { CheckCircle2, Footprints } from 'lucide-react'

export const metadata = {
  title: 'Confirmado — Pasito',
}

export default function ConfirmadoPage() {
  return (
    <main
      className="h-dvh flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0C6B45 0%, #084d32 100%)' }}
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
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-5">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(238,250,122,0.15)' }}
          >
            <CheckCircle2 size={40} style={{ color: '#EEFA7A' }} />
          </div>

          <div className="space-y-3">
            <h1
              className="text-3xl leading-tight font-display"
              style={{ color: '#EEFA7A' }}
            >
              ¡Confirmado!
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Ya estás en la lista de espera de Pasito. Te vamos a avisar apenas lancemos para que seas de los primeros.
            </p>
          </div>

          <div
            className="flex items-center gap-3 px-5 py-3 rounded-2xl mt-2"
            style={{ background: 'rgba(238,250,122,0.1)', border: '1px solid rgba(238,250,122,0.2)' }}
          >
            <Footprints size={20} style={{ color: '#EEFA7A' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Mientras tanto, <span className="font-semibold text-white">seguí caminando</span>
            </p>
          </div>
        </div>
      </div>

      <div className="relative shrink-0 flex justify-center text-[10px] pb-[max(env(safe-area-inset-bottom),12px)] pt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
        <a href="/" className="underline hover:text-white/40 transition-colors">
          Volver al inicio
        </a>
      </div>
    </main>
  )
}
