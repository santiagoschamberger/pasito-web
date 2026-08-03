import { normalizeTomateSupportId } from './tomate-support-id.ts'

export const PASITO50_CAMPAIGN_CODE = 'PASITO50'
export const PASITO50_AMOUNT = 50
export const PASITO50_MAX_CLAIMS = 100
export const PASITO50_PROMO_URL = 'https://www.pasito.app/promo/pasito50'
export const PASITO_APP_STORE_URL = 'https://apps.apple.com/ar/app/pasito/id6760863724'
export const PASITO_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=ar.pasito.pasito&hl=es'

export type Pasito50ClaimStatus =
  | 'account_too_old'
  | 'already_credited'
  | 'awarded'
  | 'campaign_full'
  | 'campaign_inactive'
  | 'invalid_code'
  | 'support_id_ambiguous'
  | 'support_id_invalid'
  | string

export function normalizePasito50SupportId(value: string): string {
  return normalizeTomateSupportId(value)
}

export function normalizePasito50Email(value: string): string {
  return value.trim().toLowerCase().slice(0, 254)
}

export function isPasito50Email(value: string): boolean {
  return value.length >= 3 && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function normalizePasito50Otp(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6)
}

export function isPasito50Otp(value: string): boolean {
  return /^\d{6}$/.test(value)
}

export function isPasito50ChallengeId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function pasito50MessageForStatus(status: Pasito50ClaimStatus): string {
  switch (status) {
    case 'account_too_old':
      return 'La promoción es solo para cuentas creadas durante los últimos 5 días.'
    case 'campaign_full':
      return 'Ya se completaron los 100 cupos de esta promoción.'
    case 'campaign_inactive':
      return 'Esta promoción ya no está activa.'
    case 'support_id_ambiguous':
    case 'support_id_invalid':
      return 'No pudimos encontrar ese ID de soporte. Revisalo en tu perfil de Pasito.'
    case 'verification_invalid':
      return 'El código es incorrecto, venció o ya fue utilizado. Pedí uno nuevo.'
    default:
      return 'No pudimos acreditar los Pasitos. Volvé a intentar en unos minutos.'
  }
}
