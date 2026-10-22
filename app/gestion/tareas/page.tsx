import type { Metadata } from 'next'

import { pageSession } from '../_components/session'
import { TasksClient } from './TasksClient'

export const metadata: Metadata = { title: 'Tareas' }
export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const { user, users } = await pageSession('/gestion/tareas')
  return <TasksClient user={user} users={users} />
}
