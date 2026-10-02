'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Download } from 'lucide-react'
import { PASITO_APP_STORE_URL, PASITO_PLAY_STORE_URL } from '@/lib/pasito50'

export default function ActualizarClient() {
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(ua)
    const isAndroid = /android/.test(ua)

    if (isIOS) {
      setIsRedirecting(true)
      window.location.href = PASITO_APP_STORE_URL
    } else if (isAndroid) {
      setIsRedirecting(true)
      window.location.href = PASITO_PLAY_STORE_URL
    }
  }, [])

  if (isRedirecting) {
    return (
      <main
        className="h-dvh flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #0C6B45 0%, #084d32 100%)' }}
      >
        <div className="text-center px-5">
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Redirigiendo...
          </p>
        </div>
      </main>
    )
  }

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
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(238,250,122,0.15)' }}
          >
            <Download size={40} style={{ color: '#EEFA7A' }} />
          </div>

          <div className="space-y-3">
            <h1
              className="text-3xl leading-tight font-display"
              style={{ color: '#EEFA7A' }}
            >
              Actualizá Pasito
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Descargá la última versión de Pasito desde tu tienda de aplicaciones.
            </p>
          </div>

          <div className="w-full flex flex-col gap-3 mt-2">
            <a
              href={PASITO_APP_STORE_URL}
              className="flex items-center justify-center gap-3 h-14 rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.22)',
              }}
            >
              <Download size={18} strokeWidth={2.5} />
              <span>Abrir App Store</span>
            </a>
            <a
              href={PASITO_PLAY_STORE_URL}
              className="flex items-center justify-center gap-3 h-14 rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.22)',
              }}
            >
              <Download size={18} strokeWidth={2.5} />
              <span>Abrir Google Play</span>
            </a>
          </div>
        </div>
      </div>

      <div
        className="relative shrink-0 flex justify-center text-[10px] pb-[max(env(safe-area-inset-bottom),12px)] pt-2"
        style={{ color: 'rgba(255,255,255,0.25)' }}
      >
        <a href="/" className="underline hover:text-white/40 transition-colors">
          Volver al inicio
        </a>
      </div>
    </main>
  )
}
