import { formatMoney } from '@/lib/gestion/schema'

export { effectiveStatus } from '@/lib/gestion/summary'

export const formatMoneySafe = (value: unknown, currency?: string) => formatMoney(typeof value === 'number' ? value : Number(value) || 0, currency)
