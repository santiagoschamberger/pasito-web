import type { Metadata } from 'next'

import { pageSession } from '../../_components/session'
import { SeriesClient } from './SeriesClient'

export const metadata: Metadata = { title: 'Serie' }
export const dynamic = 'force-dynamic'

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { user, users } = await pageSession(`/gestion/series/${slug}`)
  return <SeriesClient slug={slug} user={user} users={users} />
}
