'use client'

import { useEffect, useState } from 'react'

type AppDownloadButtonsProps = {
  /**
   * The deep link path (e.g., "/challenges/abc123").
   * Used to build the Android intent URL to open the specific challenge in-app.
   */
  deepLinkPath?: string
  /**
   * Auto-attempt to open the app on Android on first load.
   * Default: false
   */
  autoOpenOnAndroid?: boolean
}

const appStoreUrl =
  process.env.NEXT_PUBLIC_APP_STORE_URL ??
  'https://apps.apple.com/ar/search?term=pasito'

const playStoreUrl =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ??
  'https://play.google.com/store/apps/details?id=ar.pasito.pasito'

const ANDROID_PACKAGE = 'ar.pasito.pasito'
const APP_HOST = 'pasito.app'

function buildAndroidIntentUrl(path: string): string {
  // Android Intent URL format:
  // intent://[host]/[path]#Intent;scheme=https;package=[package];S.browser_fallback_url=[fallback];end
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const intentUrl = `intent://${APP_HOST}/${cleanPath}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`
  return intentUrl
}

export function AppDownloadButtons({
  deepLinkPath,
  autoOpenOnAndroid = false,
}: AppDownloadButtonsProps) {
  const [isAndroid, setIsAndroid] = useState(false)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)

  useEffect(() => {
    // Detect Android user agent
    const ua = navigator.userAgent.toLowerCase()
    const android = ua.includes('android')
    setIsAndroid(android)

    // Auto-open on Android (once per page load)
    if (android && autoOpenOnAndroid && !hasAutoOpened && deepLinkPath) {
      setHasAutoOpened(true)
      const intentUrl = buildAndroidIntentUrl(deepLinkPath)
      // Small delay to ensure the page is interactive
      const timer = setTimeout(() => {
        window.location.href = intentUrl
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [autoOpenOnAndroid, hasAutoOpened, deepLinkPath])

  const androidIntentUrl = deepLinkPath
    ? buildAndroidIntentUrl(deepLinkPath)
    : playStoreUrl

  const buttonClass =
    'h-11 rounded-full flex items-center justify-center text-xs font-semibold'
  const buttonStyle = {
    background: 'rgba(255,255,255,0.12)',
    color: '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.22)',
  }

  if (isAndroid) {
    // Android: primary "Open in app" button + optional Play Store link
    return (
      <div className="w-full grid gap-3 pt-1">
        {deepLinkPath ? (
          <>
            <a href={androidIntentUrl} className={buttonClass} style={buttonStyle}>
              Abrir en Pasito
            </a>
            <div className="grid grid-cols-1">
              <a
                href={playStoreUrl}
                className={buttonClass}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                Descargar de Google Play
              </a>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1">
            <a href={playStoreUrl} className={buttonClass} style={buttonStyle}>
              Google Play
            </a>
          </div>
        )}
      </div>
    )
  }

  // iOS or other platforms: show App Store (and Play Store if on list page without deep link)
  return (
    <div className="w-full grid gap-3 pt-1">
      <div className={deepLinkPath ? 'grid grid-cols-1' : 'grid grid-cols-2 gap-3'}>
        <a href={appStoreUrl} className={buttonClass} style={buttonStyle}>
          App Store
        </a>
        {!deepLinkPath && (
          <a href={playStoreUrl} className={buttonClass} style={buttonStyle}>
            Google Play
          </a>
        )}
      </div>
    </div>
  )
}
