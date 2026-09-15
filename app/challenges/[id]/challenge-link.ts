const APP_BUNDLE_ID = 'ar.pasito.pasito'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function normalizeChallengeId(id: string): string | null {
  const normalized = id.trim().toLowerCase()
  return UUID_RE.test(normalized) ? normalized : null
}

export function buildChallengeWebUrl(id: string): string {
  return `https://www.pasito.app/challenges/${encodeURIComponent(id)}`
}

export function buildChallengeAndroidIntentUrl(
  id: string,
  fallbackUrl: string,
): string {
  const path = `/challenges/${encodeURIComponent(id)}`
  const params = [
    'scheme=https',
    `package=${APP_BUNDLE_ID}`,
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`,
    'end',
  ].join(';')
  return `intent://www.pasito.app${path}#Intent;${params}`
}

export function buildChallengeCustomSchemeUrl(id: string): string {
  return `${APP_BUNDLE_ID}://challenges/${encodeURIComponent(id)}`
}
