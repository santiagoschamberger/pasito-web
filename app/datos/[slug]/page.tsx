import type { Metadata } from 'next'
import { getDataRoomClient, getValidDataRoomSession } from '@/lib/data-room/server'
import type { BrandDataSnapshot } from '@/lib/data-room/types'
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

  const { data: snapshotRows, error } = await getDataRoomClient()
    .from('brand_data_room_snapshots')
    .select('country_code, payload, refreshed_at')
    .in('country_code', ['AR', 'UY'])
    .order('country_code', { ascending: true })

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

  return (
    <DataRoomDashboard
      brandName={session.brandName}
      slug={session.slug}
      snapshots={snapshotRows as BrandDataSnapshot[]}
    />
  )
}
