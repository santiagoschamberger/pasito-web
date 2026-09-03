export const PARTNER_PLAN_IVA_RATE = {
  AR: 0.21,
  UY: 0.22,
} as const

export type PartnerBillingCountryCode = keyof typeof PARTNER_PLAN_IVA_RATE
export type PartnerPlanCurrency = 'ARS' | 'USD'

const CURRENCY_BY_COUNTRY: Record<PartnerBillingCountryCode, PartnerPlanCurrency> = {
  AR: 'ARS',
  UY: 'USD',
}

export function getPartnerPlanChargeAmount(
  listAmount: number,
  countryCode: PartnerBillingCountryCode,
) {
  if (!Number.isFinite(listAmount) || listAmount <= 0) return 0
  return Math.round(listAmount * (1 + PARTNER_PLAN_IVA_RATE[countryCode]))
}

export function formatPartnerPlanListAmount(amount: number, currency: PartnerPlanCurrency) {
  if (currency === 'ARS') {
    return `$${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
  }

  return `USD ${Math.round(amount)}`
}

export function formatPaidPlanPrice(
  listAmount: number,
  countryCode: PartnerBillingCountryCode,
) {
  const currency = CURRENCY_BY_COUNTRY[countryCode]
  const chargeAmount = getPartnerPlanChargeAmount(listAmount, countryCode)
  return `${formatPartnerPlanListAmount(listAmount, currency)}/mes + IVA (total ${formatPartnerPlanListAmount(chargeAmount, currency)})`
}
