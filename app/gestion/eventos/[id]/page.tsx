import type { Metadata } from 'next'

import { pageSession } from '../../_components/session'
import { EventClient } from './EventClient'

export const metadata: Metadata = { title: 'Evento' }
export const dynamic = 'force-dynamic'

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, users } = await pageSession(`/gestion/eventos/${id}`)
  return <EventClient eventId={id} user={user} users={users} />
}
