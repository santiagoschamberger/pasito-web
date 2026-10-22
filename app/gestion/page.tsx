import { pageSession } from './_components/session'
import { HomeClient } from './HomeClient'

export const dynamic = 'force-dynamic'

export default async function GestionHome() {
  const { user, users } = await pageSession('/gestion')
  return <HomeClient user={user} users={users} />
}
