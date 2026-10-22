'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Circle, OctagonAlert } from 'lucide-react'
import { toast } from 'sonner'

import type { GestionRow, TeamUser } from '@/lib/gestion/schema'
import type { Alert } from '@/lib/gestion/summary'
import { api } from './_components/api'
import { EventCard, type EventCardData } from './_components/EventCard'
import { NewEventButton } from './_components/NewEventButton'
import { card, Empty, formatDate, Shell } from './_components/ui'

type HomeData = { today: string; myTasks: (GestionRow & { eventName: string })[]; alerts: Alert[]; upcoming: EventCardData[] }

export function HomeClient({ user, users }: { user: TeamUser & { canEdit: boolean }; users: TeamUser[] }) {
  const [data, setData] = useState<HomeData | null>(null)
  const load = useCallback(() => api<HomeData>('/api/gestion/home').then(setData).catch(() => null), [])
  useEffect(() => { void load() }, [load])

  async function completeTask(task: GestionRow) {
    setData((d) => d && { ...d, myTasks: d.myTasks.filter((t) => t.id !== task.id) })
    try {
      await api(`/api/gestion/rows/${task.id}`, { method: 'PATCH', body: { field: 'estado', value: 'hecha' } })
      toast.success('Tarea hecha', { action: { label: 'Deshacer', onClick: () => api(`/api/gestion/rows/${task.id}`, { method: 'PATCH', body: { field: 'estado', value: 'pendiente' } }).then(load) } })
    } catch {
      void load()
    }
  }

  const firstName = (user.name || user.email).split(' ')[0]
  const alerts = data?.alerts ?? []

  return (
    <Shell user={user}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-[34px] font-extrabold">Hola, {firstName}</h1>
          <p className="text-sm text-[#5F6761]">Tu semana en todos los eventos.</p>
        </div>
        <NewEventButton disabled={!user.canEdit} />
      </div>

      {!data ? (
        <p className="text-sm text-[#5F6761]">Cargando…</p>
      ) : (
        <div className="grid gap-[18px] lg:grid-cols-[1fr_1fr]">
          <section className={`${card} p-4`}>
            <h2 className="mb-3 text-base font-bold">Mis pendientes <span className="font-medium text-[#66706B]">· {data.myTasks.length}</span></h2>
            {data.myTasks.length === 0 ? <Empty>No tenés tareas pendientes.</Empty> : (
              <ul className="divide-y divide-[#E8EDE9]">
                {data.myTasks.slice(0, 15).map((task) => {
                  const overdue = typeof task.data.due === 'string' && task.data.due < data.today
                  return (
                    <li key={task.id} className="flex items-center gap-3 py-2.5">
                      <button onClick={() => completeTask(task)} disabled={!user.canEdit} className="text-[#66706B] hover:text-[#006D42]" title="Marcar hecha">
                        <Circle className="size-5" />
                      </button>
                      <Link href={`/gestion/eventos/${task.event_id}?tab=task`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{String(task.data.titulo || 'Tarea')}</p>
                        <p className="truncate text-xs text-[#5F6761]">{task.eventName}</p>
                      </Link>
                      <span className={`text-xs font-semibold whitespace-nowrap ${overdue ? 'text-[#B14D3B]' : 'text-[#5F6761]'}`}>
                        {task.data.due ? formatDate(String(task.data.due)) : 'Sin fecha'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className={`${card} p-4`}>
            <h2 className="mb-3 text-base font-bold">Alertas <span className="font-medium text-[#66706B]">· {alerts.length}</span></h2>
            {alerts.length === 0 ? <Empty><CheckCircle2 className="mx-auto mb-1 size-5 text-[#006D42]" />Nada en riesgo.</Empty> : (
              <ul className="divide-y divide-[#E8EDE9]">
                {alerts.slice(0, 15).map((alert, index) => (
                  <li key={index}>
                    <Link href={`/gestion/eventos/${alert.eventId}?tab=${alert.kind === 'event' ? 'ficha' : alert.kind}`} className="flex items-center gap-3 py-2.5">
                      {alert.level === 'critical' ? <OctagonAlert className="size-4 shrink-0 text-[#B14D3B]" /> : <AlertTriangle className="size-4 shrink-0 text-[#C49A2D]" />}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{alert.text}</p>
                        <p className="truncate text-xs text-[#5F6761]">{alert.eventName}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="lg:col-span-2">
            <h2 className="mb-3 text-[20px] font-bold">Próximos eventos</h2>
            {data.upcoming.length === 0 ? <Empty>Todavía no hay eventos. Creá el primero.</Empty> : (
              <div className="grid gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
                {data.upcoming.map((event) => <EventCard key={event.id} event={event} users={users} />)}
              </div>
            )}
          </section>
        </div>
      )}
    </Shell>
  )
}
