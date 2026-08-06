import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

import {
  buildCountryAudienceMetrics,
  COUNTRY_AUDIENCE_FALLBACK,
  type CountryAudienceMetric,
  type CountryAudienceSnapshotRow,
} from '@/lib/country-audience'

export const COUNTRY_AUDIENCE_REVALIDATE_SECONDS = 60 * 60 * 24 * 3

async function loadCountryAudienceMetrics(): Promise<CountryAudienceMetric[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return COUNTRY_AUDIENCE_FALLBACK

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const { data, error } = await supabase
    .from('brand_data_room_snapshots')
    .select('country_code, payload, refreshed_at')
    .in('country_code', ['AR', 'UY'])

  if (error) throw error

  return buildCountryAudienceMetrics((data ?? []) as CountryAudienceSnapshotRow[])
}

const getCachedCountryAudienceMetrics = unstable_cache(
  loadCountryAudienceMetrics,
  ['country-audience-metrics-v1'],
  {
    revalidate: COUNTRY_AUDIENCE_REVALIDATE_SECONDS,
    tags: ['country-audience-metrics'],
  },
)

export async function getCountryAudienceMetrics(): Promise<CountryAudienceMetric[]> {
  try {
    return await getCachedCountryAudienceMetrics()
  } catch (error) {
    console.error('No se pudieron actualizar las métricas de audiencia por país desde Supabase.', error)
    return COUNTRY_AUDIENCE_FALLBACK
  }
}
