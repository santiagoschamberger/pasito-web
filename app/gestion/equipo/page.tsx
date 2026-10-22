import type { Metadata } from 'next'

import { pageSession } from '../_components/session'
import { TeamClient } from './TeamClient'

export const metadata: Metadata = { title: 'Equipo' }
export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const { user, users } = await pageSession('/gestion/equipo')
  return <TeamClient user={user} initialUsers={users} />
}
