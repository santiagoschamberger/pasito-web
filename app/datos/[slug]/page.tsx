import type { Metadata } from 'next'
import { getDataRoomClient, getValidDataRoomSession } from '@/lib/data-room/server'
import type { BrandDataRoomGa4Metric, BrandDataSnapshot } from '@/lib/data-room/types'
import { toPublicBrandDataSnapshot } from '@/lib/data-room/public-snapshot'
import { DataRoomDashboard } from './DataRoomDashboard'
import { DataRoomLogin } from './DataRoomLogin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sala de datos · Pasito',
  description: 'Información agregada de la audiencia Pasito.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
}
export default async function DataRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const slug = rawSlug.trim().toLowerCase()
  const session = await getValidDataRoomSession(slug)

  if (!session) {
    return <DataRoomLogin slug={slug} />
  }

  const db = getDataRoomClient()
  const [snapshotResult, ga4Result] = await Promise.all([
    db
      .from('brand_data_room_snapshots')
      .select('country_code, payload, refreshed_at')
      .in('country_code', ['AR', 'UY'])
      .order('country_code', { ascending: true }),
    db
      .from('brand_data_room_ga4_metrics')
      .select('scope, period_start, period_end, active_users, new_users, sessions, first_opens, average_session_seconds, screen_page_views, source, refreshed_at')
      .in('scope', ['ALL', 'AR', 'UY'])
      .order('scope', { ascending: true }),
  ])
  const { data: snapshotRows, error } = snapshotResult

  if (error || !snapshotRows?.length) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#F5F7F4] px-5 text-[#171D1A]">
        <div className="max-w-md rounded-xl border border-[#DDE6DF] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">Los datos se están preparando</h1>
          <p className="mt-2 text-sm leading-6 text-[#66706B]">Volvé a intentar en unos minutos.</p>
        </div>
      </main>
    )
  }

  const publicSnapshots = (snapshotRows as BrandDataSnapshot[]).map(toPublicBrandDataSnapshot)

  return (
    <DataRoomDashboard
      brandName={session.brandName}
      slug={session.slug}
      snapshots={publicSnapshots}
      ga4Metrics={(ga4Result.data as BrandDataRoomGa4Metric[] | null) ?? []}
    />
  )
}
