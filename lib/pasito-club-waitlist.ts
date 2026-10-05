const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PASITO_CLUB_WAITLIST_TABLE = 'pasito_club_waitlist'
export const PASITO_CLUB_EMAIL_MAX_LENGTH = 254

export function normalizePasitoClubEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (!email || email.length > PASITO_CLUB_EMAIL_MAX_LENGTH) return null
  return EMAIL_PATTERN.test(email) ? email : null
}

/** Fraction (0..1) of the "Yo no corro → Corrí 3K" rows that flip while the user types. */
export function pasitoClubTypingProgress(email: string, stepsToFinish = 18): number {
  if (stepsToFinish <= 0) return 1
  return Math.min(1, Math.max(0, email.trim().length / stepsToFinish))
}
