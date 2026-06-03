'use client'

import { useEffect, useRef, useState } from 'react'
import {
  buildReferralAndroidIntentUrl,
  buildReferralCustomSchemeUrl,
} from './referral-link'

type Platform = 'ios' | 'android' | 'desktop'

type Props = {
  code: string
  inviteUrl: string
  appStoreUrl: string
  playStoreUrl: string
}

const IOS_FALLBACK_MS = 1800

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || (navigator as { vendor?: string }).vendor || ''

  if (/android/i.test(ua)) return 'android'
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (
    typeof window !== 'undefined' &&
    /Macintosh/.test(ua) &&
    'ontouchend' in document
  ) {
    return 'ios'
  }
  return 'desktop'
}

export default function ReferralRedirect({
  code,
  inviteUrl,
  appStoreUrl,
  playStoreUrl,
}: Props) {
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [stage, setStage] = useState<'redirecting' | 'desktop'>('redirecting')
  const [copied, setCopied] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const detected = detectPlatform()
    setPlatform(detected)

    if (detected === 'android') {
      window.location.replace(buildReferralAndroidIntentUrl(code, playStoreUrl))
      return
    }

    if (detected === 'ios') {
      const fallbackTimer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.location.replace(appStoreUrl)
        }
      }, IOS_FALLBACK_MS)

      const onHidden = () => {
        if (document.visibilityState === 'hidden') {
          window.clearTimeout(fallbackTimer)
          document.removeEventListener('visibilitychange', onHidden)
        }
      }
      document.addEventListener('visibilitychange', onHidden)

      window.location.href = buildReferralCustomSchemeUrl(code)
      return
    }

    setStage('desktop')
  }, [code, appStoreUrl, playStoreUrl])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  if (stage === 'desktop') {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.86)' }}>
          Abrí este link desde tu teléfono para aceptar la invitación.
        </p>
        <div
          className="rounded-2xl px-4 py-3 text-xs font-semibold break-all"
          style={{
            background: 'rgba(255,255,255,0.12)',
            color: '#FFFFFF',
            border: '1px solid rgba(255,255,255,0.22)',
          }}
        >
          {inviteUrl}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <a
            href={appStoreUrl}
            className="h-11 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ background: '#EEFA7A', color: '#0C6B45' }}
          >
            App Store
          </a>
          <a
            href={playStoreUrl}
            className="h-11 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ background: '#EEFA7A', color: '#0C6B45' }}
          >
            Google Play
          </a>
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="h-10 rounded-full flex items-center justify-center text-xs font-semibold"
          style={{
            background: '#FFFFFF',
            color: '#0C6B45',
          }}
        >
          {copied ? 'Link copiado' : 'Copiar link'}
        </button>
      </div>
    )
  }

  return (
    <div className="grid place-items-center gap-4">
      <span
        aria-hidden
        className="block h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin"
      />
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
        Abriendo Pasito…
      </p>
      {platform === 'ios' ? (
        <a
          href={appStoreUrl}
          className="text-xs font-semibold underline"
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          ¿No se abrió? Bajá la app
        </a>
      ) : null}
    </div>
  )
}
