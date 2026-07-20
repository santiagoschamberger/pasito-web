export const TOMATE_SUPPORT_ID_LENGTH = 8

const TOMATE_SUPPORT_ID_PATTERN = /^[A-F0-9]{8}$/

export function normalizeTomateSupportId(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-F0-9]/g, '')
    .slice(0, TOMATE_SUPPORT_ID_LENGTH)
}

export function isTomateSupportId(value: string) {
  return TOMATE_SUPPORT_ID_PATTERN.test(value)
}
