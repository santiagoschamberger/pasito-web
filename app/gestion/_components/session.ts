import 'server-only'

import { redirect } from 'next/navigation'

import { getSessionUser, listUsers } from '@/lib/gestion/server'

export async function pageSession(next: string) {
  const user = await getSessionUser()
  if (!user) redirect(`/gestion/login?next=${encodeURIComponent(next)}`)
  return { user, users: await listUsers() }
}
