import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

const ONE_DAY_IN_SECONDS = 60 * 60 * 24
const ONE_DAY_IN_MILLISECONDS = ONE_DAY_IN_SECONDS * 1000

export type MarketingMetrics = {
  totalUsers: number
  newUsersLast24Hours: number
  totalPartners: number
}

export const MARKETING_METRICS_FALLBACK: MarketingMetrics = {
  totalUsers: 620_000,
  newUsersLast24Hours: 11_000,
  totalPartners: 1_200,
}

async function loadMarketingMetrics(): Promise<MarketingMetrics> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return MARKETING_METRICS_FALLBACK
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const last24Hours = new Date(Date.now() - ONE_DAY_IN_MILLISECONDS).toISOString()

  const [totalUsersResult, newUsersResult, totalPartnersResult] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', last24Hours),
    // Sin filtro de approval_status: incluye aprobados, pendientes y rechazados.
    supabase.from('partners').select('id', { count: 'exact', head: true }),
  ])

  if (totalUsersResult.error) throw totalUsersResult.error
  if (newUsersResult.error) throw newUsersResult.error
  if (totalPartnersResult.error) throw totalPartnersResult.error

  return {
    totalUsers: totalUsersResult.count ?? MARKETING_METRICS_FALLBACK.totalUsers,
    newUsersLast24Hours: newUsersResult.count ?? MARKETING_METRICS_FALLBACK.newUsersLast24Hours,
    totalPartners: totalPartnersResult.count ?? MARKETING_METRICS_FALLBACK.totalPartners,
  }
}

const getCachedMarketingMetrics = unstable_cache(
  loadMarketingMetrics,
  ['marketing-metrics-v2'],
  {
    revalidate: ONE_DAY_IN_SECONDS,
    tags: ['marketing-metrics'],
  },
)

export async function getMarketingMetrics(): Promise<MarketingMetrics> {
  try {
    return await getCachedMarketingMetrics()
  } catch (error) {
    console.error('No se pudieron actualizar las métricas de marketing desde Supabase.', error)
    return MARKETING_METRICS_FALLBACK
  }
}

export function formatRoundedMarketingMetric(value: number, step: number): string {
  const roundedValue = Math.round(value / step) * step
  return `+${new Intl.NumberFormat('es-AR').format(roundedValue)}`
}
