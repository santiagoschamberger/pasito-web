'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, CheckCircle2, DoorOpen, OctagonAlert, PartyPopper, Ticket } from 'lucide-react'
import { toast } from 'sonner'

import { type GestionRow, type TeamUser } from '@/lib/gestion/schema'
import { daysBetween, type Alert } from '@/lib/gestion/summary'
import { api } from './_components/api'
import { EventCard, eventEmoji, type EventCardData } from './_components/EventCard'
import { NewEventButton } from './_components/NewEventButton'
import { card, Empty, formatDate, Shell } from './_components/ui'

type HomeData = { today: string; myTasks: (GestionRow & { eventName: string })[]; alerts: Alert[]; upcoming: EventCardData[] }

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('es-AR', { hour: 'numeric', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date()))
  return hour < 13 ? 'Buen día' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
}

export function HomeClient({ user, users }: { user: TeamUser & { canEdit: boolean }; users: TeamUser[] }) {
  const [data, setData] = useState<HomeData | null>(null)
  const load = useCallback(() => api<HomeData>('/api/gestion/home').then(setData).catch(() => null), [])
  useEffect(() => { void load() }, [load])

  async function completeTask(task: GestionRow) {
    setData((d) => d && { ...d, myTasks: d.myTasks.filter((t) => t.id !== task.id) })
    try {
      await api(`/api/gestion/rows/${task.id}`, { method: 'PATCH', body: { field: 'estado', value: 'hecha' } })
      toast.success('¡Tarea hecha!', { action: { label: 'Deshacer', onClick: () => api(`/api/gestion/rows/${task.id}`, { method: 'PATCH', body: { field: 'estado', value: 'pendiente' } }).then(load) } })
    } catch {
      void load()
    }
  }

  const firstName = (user.name || user.email).split(/[\s@]/)[0]
  const alerts = data?.alerts ?? []
  const upcoming = useMemo(() => (data?.upcoming ?? []).filter((e) => !e.start_date || (e.end_date ?? e.start_date) >= data!.today), [data])
  const past = useMemo(() => (data?.upcoming ?? []).filter((e) => e.start_date && (e.end_date ?? e.start_date) < data!.today), [data])
  // Lo próximo que arranca (un ciclo de varias semanas ya en curso no tapa la fecha de esta semana).
  const next = upcoming.find((e) => e.start_date && e.start_date >= (data?.today ?? '')) ?? upcoming.find((e) => e.start_date)
  const ticketsSold = (data?.upcoming ?? []).reduce((sum, e) => sum + (e.web && e.start_date && e.start_date >= (data?.today ?? '') ? e.web.tickets : 0), 0)

  return (
    <Shell user={user}>
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-[#00402E] p-5 text-white sm:p-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/paloma.png" alt="" className="pointer-events-none absolute -right-6 -bottom-10 hidden h-48 opacity-90 sm:block" />
        <p className="text-sm font-semibold text-[#EBFA61]">{greeting()}, {firstName}</p>
        <h1 className="g-display mt-1 max-w-xl text-3xl leading-tight font-extrabold sm:text-4xl">
          {next ? <>Próximo: {next.name}</> : 'Todos los eventos en un solo lugar'}
        </h1>
        {next?.start_date && data && (
          <p className="mt-2 text-white/80">
            {(() => {
              const days = daysBetween(data.today, next.start_date)
              return days < 0 ? 'En curso' : days === 0 ? '¡Es hoy!' : days === 1 ? 'Mañana' : `En ${days} días`
            })()} · {formatDate(next.start_date, { weekday: 'long', day: 'numeric', month: 'long' })}{next.start_time ? ` · ${next.start_time}` : ''}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <NewEventButton disabled={!user.canEdit} />
          {next && <Link href={`/gestion/eventos/${next.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-white/10 px-3.5 text-sm font-semibold hover:bg-white/20">Abrir {eventEmoji(next.type)}<ArrowRight className="size-4" /></Link>}
          {next && next.effective_status === 'en_curso' && <Link href={`/gestion/puerta/${next.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#EBFA61] px-3.5 text-sm font-bold text-[#00402E]"><DoorOpen className="size-4" />Modo puerta</Link>}
        </div>
        <div className="relative mt-6 grid max-w-2xl grid-cols-3 gap-3">
          <Stat label="Mis pendientes" value={data ? String(data.myTasks.length) : '–'} />
          <Stat label="Alertas" value={data ? String(alerts.length) : '–'} tone={alerts.some((a) => a.level === 'critical') ? 'bad' : undefined} />
          <Stat label="Entradas vendidas" value={data ? String(ticketsSold) : '–'} icon={<Ticket className="size-4" />} />
        </div>
      </section>

      {!data ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1].map((i) => <div key={i} className={`${card} h-48 animate-pulse`} />)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
          <section className={`${card} min-w-0 p-4 sm:p-5`}>
            <h2 className="g-display mb-3 text-lg font-bold">Mis pendientes</h2>
            {data.myTasks.length === 0 ? <Empty icon={<PartyPopper className="size-6 text-[#006D42]" />}>No tenés tareas pendientes.</Empty> : (
              <ul className="divide-y divide-[#EDF1EB]">
                {data.myTasks.slice(0, 12).map((task) => {
                  const overdue = typeof task.data.due === 'string' && task.data.due < data.today
                  return (
                    <li key={task.id} className="flex items-center gap-3 py-2.5">
                      <button onClick={() => completeTask(task)} disabled={!user.canEdit} className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-[#C3CCC5] text-transparent transition hover:border-[#006D42] hover:text-[#006D42]" title="Marcar hecha">
                        <Check className="size-3.5" strokeWidth={3} />
                      </button>
                      <Link href={`/gestion/eventos/${task.event_id}?tab=task`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{String(task.data.titulo || 'Tarea')}</p>
                        <p className="truncate text-xs text-[#5F6761]">{task.eventName}</p>
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${overdue ? 'bg-[#FDECE8] text-[#B14D3B]' : 'text-[#5F6761]'}`}>
                        {task.data.due ? formatDate(String(task.data.due)) : 'Sin fecha'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            <Link href="/gestion/tareas" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#006D42]">Ver todas las tareas<ArrowRight className="size-4" /></Link>
          </section>

          <section className={`${card} min-w-0 p-4 sm:p-5`}>
            <h2 className="g-display mb-3 text-lg font-bold">Qué está en riesgo</h2>
            {alerts.length === 0 ? <Empty icon={<CheckCircle2 className="size-6 text-[#006D42]" />}>Nada en riesgo.</Empty> : (
              <ul className="divide-y divide-[#EDF1EB]">
                {alerts.slice(0, 12).map((alert, index) => (
                  <li key={index}>
                    <Link href={`/gestion/eventos/${alert.eventId}?tab=${alert.kind === 'event' ? 'ficha' : alert.kind}`} className="flex items-center gap-3 py-2.5">
                      <span className={`grid size-8 shrink-0 place-items-center rounded-full ${alert.level === 'critical' ? 'bg-[#FDECE8] text-[#B14D3B]' : 'bg-[#FBF3DA] text-[#806113]'}`}>
                        {alert.level === 'critical' ? <OctagonAlert className="size-4" /> : <AlertTriangle className="size-4" />}
                      </span>
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

          <section className="min-w-0 lg:col-span-2">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="g-display text-2xl font-bold">Próximos eventos</h2>
              <Link href="/gestion/calendario" className="text-sm font-semibold text-[#006D42]">Ver calendario</Link>
            </div>
            {upcoming.length === 0 ? <Empty icon={<span className="text-3xl">🗓️</span>}>No hay eventos próximos. Creá uno con el botón de arriba.</Empty> : (
              <div className="grid gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
                {upcoming.map((event) => <EventCard key={event.id} event={event} users={users} />)}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="min-w-0 lg:col-span-2">
              <h2 className="g-display mb-1 text-xl font-bold">Para cerrar</h2>
              <p className="mb-3 text-sm text-[#5F6761]">Ya pasaron: cargá gastos reales, cobros y aprendizajes.</p>
              <div className="grid gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
                {past.map((event) => <EventCard key={event.id} event={event} users={users} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </Shell>
  )
}

function Stat({ label, value, tone, icon }: { label: string; value: string; tone?: 'bad'; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-white/70 uppercase">{label}</p>
      <p className={`g-display flex items-center gap-1.5 text-2xl font-extrabold tabular-nums ${tone === 'bad' ? 'text-[#FFB4A3]' : ''}`}>{icon}{value}</p>
    </div>
  )
}

