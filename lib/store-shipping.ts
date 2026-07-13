export type ShippingAddress = {
  line1: string
  line2: string
  city: string
  province: string
  postalCode: string
  phone: string
  notes: string
}

export const EMPTY_SHIPPING_ADDRESS: ShippingAddress = {
  line1: '',
  line2: '',
  city: '',
  province: '',
  postalCode: '',
  phone: '',
  notes: '',
}

const LIMITS = {
  line1: 140,
  line2: 80,
  city: 80,
  province: 80,
  postalCode: 12,
  phone: 30,
  notes: 240,
} as const

function clean(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

export function normalizeShippingAddress(value: unknown): ShippingAddress | null {
  if (!value || typeof value !== 'object') return null

  const input = value as Partial<Record<keyof ShippingAddress, unknown>>
  const address: ShippingAddress = {
    line1: clean(input.line1, LIMITS.line1),
    line2: clean(input.line2, LIMITS.line2),
    city: clean(input.city, LIMITS.city),
    province: clean(input.province, LIMITS.province),
    postalCode: clean(input.postalCode, LIMITS.postalCode).toUpperCase(),
    phone: clean(input.phone, LIMITS.phone),
    notes: clean(input.notes, LIMITS.notes),
  }

  const phoneDigits = address.phone.replace(/\D/g, '')
  const postalCodeValid = /^[A-Z0-9][A-Z0-9 -]{2,11}$/.test(address.postalCode)

  if (
    address.line1.length < 5 ||
    address.city.length < 2 ||
    address.province.length < 2 ||
    !postalCodeValid ||
    phoneDigits.length < 8 ||
    phoneDigits.length > 15
  ) {
    return null
  }

  return address
}

export function formatShippingAddress(address: ShippingAddress) {
  const firstLine = [address.line1, address.line2].filter(Boolean).join(' · ')
  return `${firstLine}, ${address.postalCode} ${address.city}, ${address.province}`
}
