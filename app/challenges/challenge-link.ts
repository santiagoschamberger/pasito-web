const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isChallengeId(value: string): boolean {
  return UUID_RE.test(value.trim())
}

export function buildChallengeUrl(id: string): string {
  if (!isChallengeId(id)) throw new Error('Invalid challenge ID')
  return `https://www.pasito.app/challenges/${id.trim().toLowerCase()}`
}

export function buildChallengeAppUrl(
  id: string,
  platform: 'ios' | 'android' | 'desktop',
): string {
  const webUrl = buildChallengeUrl(id)
  if (platform === 'ios') {
    return `ar.pasito.pasito://challenges/${id.trim().toLowerCase()}`
  }
  if (platform === 'android') {
    // Stay on the results landing when the app is unavailable.
    return `intent://${webUrl.slice('https://'.length)}#Intent;scheme=https;package=ar.pasito.pasito;S.browser_fallback_url=${encodeURIComponent(`${webUrl}#ganadores`)};end`
  }
  // The apex is also associated with the app. Crossing hosts from www lets
  // Safari hand a user-initiated Universal Link back to the installed app.
  return webUrl.replace('https://www.', 'https://')
}
