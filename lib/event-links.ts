import { PASITO_APP_STORE_URL, PASITO_PLAY_STORE_URL } from './pasito50.ts'

export function normalizeEventId(value: string): string | null {
  const id = value.trim().toLowerCase()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) ? id : null
}

export function buildEventLinks(value: string) {
  const id = normalizeEventId(value)
  if (!id) throw new Error('Invalid event ID')
  const publicUrl = `https://www.pasito.app/events/${id}`
  return {
    publicUrl,
    appUrl: `ar.pasito.pasito://events/${id}`,
    appStoreUrl: PASITO_APP_STORE_URL,
    playStoreUrl: PASITO_PLAY_STORE_URL,
    androidIntent: `intent://www.pasito.app/events/${id}#Intent;scheme=https;package=ar.pasito.pasito;S.browser_fallback_url=${encodeURIComponent(PASITO_PLAY_STORE_URL)};end`,
  }
}
