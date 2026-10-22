import type { Metadata } from 'next'

import { pageSession } from '../_components/session'
import { EventsClient } from './EventsClient'

export const metadata: Metadata = { title: 'Eventos' }
export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const { user, users } = await pageSession('/gestion/eventos')
  return <EventsClient user={user} users={users} />
}
