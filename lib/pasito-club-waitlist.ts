const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PASITO_CLUB_WAITLIST_TABLE = 'pasito_club_waitlist'
export const PASITO_CLUB_EMAIL_MAX_LENGTH = 254

export function normalizePasitoClubEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (!email || email.length > PASITO_CLUB_EMAIL_MAX_LENGTH) return null
  return EMAIL_PATTERN.test(email) ? email : null
}
