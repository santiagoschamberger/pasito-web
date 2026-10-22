import type { Metadata } from 'next'

import { pageSession } from '../_components/session'
import { CalendarClient } from './CalendarClient'

export const metadata: Metadata = { title: 'Calendario' }
export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const { user, users } = await pageSession('/gestion/calendario')
  return <CalendarClient user={user} users={users} />
}
