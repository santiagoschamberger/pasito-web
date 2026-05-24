export type ReservationStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'expired'

const STATUS_MAP: Record<string, ReservationStatus> = {
  pending_confirmation: 'pending_confirmation',
  confirmed: 'confirmed',
  used: 'confirmed',
  rejected: 'rejected',
  cancelled: 'cancelled',
  expired: 'expired',
}

export type ReservationPreview = {
  couponId: string
  status: ReservationStatus
  clientFirstName: string
  rewardTitle: string
  partnerName: string
  expiresAt: string
  pasitosCost: number
}

export function normalizePreviewResponse(
  value: unknown,
): ReservationPreview | null {
  if (!value || typeof value !== 'object') return null

  const row = value as Record<string, unknown>
  const couponId = readString(row.coupon_id)
  const status = readStatus(row.status)
  const clientFirstName = readString(row.client_first_name)
  const rewardTitle = readString(row.reward_title)
  const partnerName = readString(row.partner_name)
  const expiresAt = readString(row.expires_at)
  const pasitosCost = readInteger(row.pasitos_spent)

  if (
    !couponId ||
    !status ||
    !clientFirstName ||
    !rewardTitle ||
    !partnerName ||
    !expiresAt ||
    pasitosCost == null
  ) {
    return null
  }

  return {
    couponId,
    status,
    clientFirstName,
    rewardTitle,
    partnerName,
    expiresAt,
    pasitosCost,
  }
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function readInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  return value
}

function readStatus(value: unknown): ReservationStatus | null {
  if (typeof value !== 'string') return null
  return STATUS_MAP[value] ?? null
}
