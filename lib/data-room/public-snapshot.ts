import type { BrandDataSnapshot, BrandDataSnapshotPayload } from './types'

const REMOVED_PAYLOAD_KEYS = [
  'interests',
  'favoriteCategories',
  'redemptionCategories',
  'redemptionTrend',
  'topRewards',
  'topPartners',
  'survey',
] as const satisfies readonly (keyof BrandDataSnapshotPayload)[]

const REMOVED_HEADLINE_KEYS = [
  'repeatRedeemers',
] as const satisfies readonly (keyof BrandDataSnapshotPayload['headline'])[]

const REMOVED_COVERAGE_KEYS = [
  'interestUsers',
] as const satisfies readonly (keyof BrandDataSnapshotPayload['dataCoverage'])[]

const REMOVED_MARKETING_KEYS = [
  'mixpanelFilterTypes',
  'mixpanelTopViewedRewards',
  'mixpanelTopViewedPartners',
  'mixpanelCoverageStartDate',
  'mixpanelDataThroughDate',
  'mixpanelMetricsRefreshedAt',
] as const satisfies readonly (keyof BrandDataSnapshotPayload['marketing'])[]

type PublicBrandDataSnapshotPayload = Omit<
  BrandDataSnapshotPayload,
  typeof REMOVED_PAYLOAD_KEYS[number] | 'headline' | 'dataCoverage' | 'marketing'
> & {
  headline: Omit<BrandDataSnapshotPayload['headline'], typeof REMOVED_HEADLINE_KEYS[number]>
  dataCoverage: Omit<BrandDataSnapshotPayload['dataCoverage'], typeof REMOVED_COVERAGE_KEYS[number]>
  marketing?: Omit<BrandDataSnapshotPayload['marketing'], typeof REMOVED_MARKETING_KEYS[number]>
}

export type PublicBrandDataSnapshot = Omit<BrandDataSnapshot, 'payload'> & {
  payload: PublicBrandDataSnapshotPayload
}

function omitKeys<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> {
  const result = { ...value }
  for (const key of keys) Reflect.deleteProperty(result, key)
  return result
}

export function toPublicBrandDataSnapshot(snapshot: BrandDataSnapshot): PublicBrandDataSnapshot {
  const payload = omitKeys(snapshot.payload, REMOVED_PAYLOAD_KEYS)

  return {
    ...snapshot,
    payload: {
      ...payload,
      headline: omitKeys(snapshot.payload.headline, REMOVED_HEADLINE_KEYS),
      dataCoverage: omitKeys(snapshot.payload.dataCoverage, REMOVED_COVERAGE_KEYS),
      ...(snapshot.payload.marketing
        ? { marketing: omitKeys(snapshot.payload.marketing, REMOVED_MARKETING_KEYS) }
        : {}),
    },
  }
}
