const APP_BUNDLE_ID = 'ar.pasito.pasito'

export function normalizeReferralCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

export function buildReferralInviteUrl(code: string): string {
  return `https://www.pasito.app/i/${encodeURIComponent(
    normalizeReferralCode(code),
  )}`
}

export function buildReferralAndroidIntentUrl(
  code: string,
  fallbackUrl: string,
): string {
  const path = `/i/${encodeURIComponent(normalizeReferralCode(code))}`
  const params = [
    'scheme=https',
    `package=${APP_BUNDLE_ID}`,
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`,
    'end',
  ].join(';')
  return `intent://www.pasito.app${path}#Intent;${params}`
}

export function buildReferralCustomSchemeUrl(code: string): string {
  return `${APP_BUNDLE_ID}://i/${encodeURIComponent(normalizeReferralCode(code))}`
}
