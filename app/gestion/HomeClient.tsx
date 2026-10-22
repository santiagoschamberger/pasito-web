'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, CheckCircle2, OctagonAlert, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'

import { type GestionRow, type TeamUser } from '@/lib/gestion/schema'
import { daysBetween, type Alert } from '@/lib/gestion/summary'
import { api } from './_components/api'
import { EventCard, type EventCardData } from './_components/EventCard'
import { NewEventButton } from './_components/NewEventButton'
import { groupBySeries, isGroup, SeriesCard, seriesStats } from './_components/SeriesCard'
import { card, Empty, formatDate, PageHeader, Shell } from './_components/ui'

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
  // Las series (Pasito Club, etc.) van como una sola tarjeta.
  const grouped = useMemo(() => groupBySeries(data?.upcoming ?? []), [data])
  const upcomingItems = grouped.filter((item) => (isGroup(item) ? seriesStats(item, data?.today).next !== null : upcoming.includes(item)))
  const pastItems = grouped.filter((item) => (isGroup(item) ? seriesStats(item, data?.today).next === null : past.includes(item)))
  // Lo próximo que arranca (un ciclo de varias semanas ya en curso no tapa la fecha de esta semana).
  const next = upcoming.find((e) => e.start_date && e.start_date >= (data?.today ?? '')) ?? upcoming.find((e) => e.start_date)
  const overdue = (data?.myTasks ?? []).filter((t) => typeof t.data.due === 'string' && t.data.due < (data?.today ?? '')).length
  const activeCount = groupBySeries(upcoming).length
  const datedUpcoming = upcoming
    .filter((e) => e.start_date && e.start_date >= (data?.today ?? '') && !(e.end_date && e.end_date > e.start_date))
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!))
  const ticketsUpcoming = datedUpcoming.reduce((sum, e) => sum + (e.web?.tickets ?? 0), 0)

  return (
    <Shell user={user}>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase())}
        actions={<NewEventButton disabled={!user.canEdit} />}
      />

      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Mis pendientes" value={data.myTasks.length} hint={overdue ? `${overdue} vencidas` : 'al día'} tone={overdue ? 'bad' : undefined} href="/gestion/tareas" />
          <Metric label="En riesgo" value={alerts.length} hint={alerts.length ? 'revisar' : 'todo en orden'} tone={alerts.some((a) => a.level === 'critical') ? 'bad' : alerts.length ? 'warn' : undefined} />
          <Metric label="Entradas vendidas" value={ticketsUpcoming} hint="próximas fechas" href="/gestion/eventos" />
          <Metric label="Eventos activos" value={activeCount} hint={`${datedUpcoming.length} fechas por delante`} href="/gestion/eventos" />
        </div>
      )}

      {next && data && (
        <Link href={`/gestion/eventos/${next.id}`} className={`${card} mb-5 flex items-center gap-4 p-3 pr-5 transition hover:shadow-md`}>
          <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[#00402E]">
            {next.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={next.cover_url} alt="" className="size-full object-cover" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-xs font-bold text-[#006D42] uppercase">
              Próximo · {(() => {
                const days = next.start_date ? daysBetween(data.today, next.start_date) : null
                return days === null ? 'sin fecha' : days < 0 ? 'en curso' : days === 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`
              })()}
            </span>
            <span className="g-display block truncate text-xl font-extrabold">{next.name}</span>
            <span className="block truncate text-sm text-[#5F6761]">{formatDate(next.start_date, { weekday: 'long', day: 'numeric', month: 'long' })}{next.start_time ? ` · ${next.start_time}` : ''}{next.venue ? ` · ${next.venue}` : ''}</span>
          </span>
          {next.web && (
            <span className="hidden w-44 shrink-0 md:block">
              <span className="flex justify-between text-xs text-[#5F6761]"><span><strong className="text-[#171D1A]">{next.web.tickets}</strong>{next.web.capacity ? ` / ${next.web.capacity}` : ''} entradas</span></span>
              {next.web.capacity ? <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#E8EDE9]"><span className="block h-full rounded-full bg-[#006D42]" style={{ width: `${Math.min(100, (next.web.tickets / next.web.capacity) * 100)}%` }} /></span> : null}
            </span>
          )}
          <ArrowRight className="size-5 shrink-0 text-[#9AA39D]" />
        </Link>
      )}

      {!data ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1].map((i) => <div key={i} className={`${card} h-48 animate-pulse`} />)}</div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-3">
          <section className={`${card} min-w-0 p-4 sm:p-5 lg:col-span-2`}>
            <h2 className="g-display mb-3 text-lg font-bold">Mis pendientes <span className="font-semibold text-[#9AA39D]">{data.myTasks.length}</span></h2>
            {data.myTasks.length === 0 ? <Empty icon={<PartyPopper className="size-6 text-[#006D42]" />}>No tenés tareas pendientes.</Empty> : (
              <ul className="divide-y divide-[#EDF1EB]">
                {data.myTasks.slice(0, 8).map((task) => {
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
            <Link href="/gestion/tareas" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#006D42]">{data.myTasks.length > 8 ? `Ver las ${data.myTasks.length}` : 'Ver todas las tareas'}<ArrowRight className="size-4" /></Link>
          </section>

          <div className="min-w-0 space-y-[18px]">
          <section className={`${card} min-w-0 p-4 sm:p-5`}>
            <h2 className="g-display mb-3 text-lg font-bold">Qué está en riesgo</h2>
            {alerts.length === 0 ? <p className="flex items-center gap-2 rounded-lg bg-[#F2F6F1] px-3 py-2.5 text-sm font-semibold text-[#006D42]"><CheckCircle2 className="size-4" />Nada en riesgo por ahora.</p> : (
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
          <section className={`${card} p-4 sm:p-5`}>
            <h2 className="g-display mb-3 text-lg font-bold">Próximas fechas</h2>
            {datedUpcoming.length === 0 ? <p className="text-sm text-[#5F6761]">No hay fechas próximas.</p> : (
              <ul className="space-y-1">
                {datedUpcoming.slice(0, 5).map((e) => (
                  <li key={e.id}>
                    <Link href={`/gestion/eventos/${e.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#F6F7EF]">
                      <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-[#F2F6F1] leading-none">
                        <span className="text-[9px] font-bold text-[#B14D3B] uppercase">{formatDate(e.start_date, { month: 'short' }).replace('.', '')}</span>
                        <span className="g-display text-base font-extrabold">{Number(e.start_date!.slice(8))}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{e.name}</span>
                        <span className="block text-xs text-[#5F6761]">{e.web ? `${e.web.tickets}${e.web.capacity ? ` / ${e.web.capacity}` : ''} entradas` : e.venue ?? ''}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/gestion/calendario" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#006D42]">Ver calendario<ArrowRight className="size-4" /></Link>
          </section>
          </div>

          <section className="min-w-0 lg:col-span-3">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="g-display text-2xl font-bold">Eventos activos</h2>
              <Link href="/gestion/eventos" className="text-sm font-semibold text-[#006D42]">Ver todos</Link>
            </div>
            {upcomingItems.length === 0 ? <Empty icon={<span className="text-3xl">🗓️</span>}>No hay eventos próximos. Creá uno con el botón de arriba.</Empty> : (
              <div className="grid gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
                {upcomingItems.map((item) => (isGroup(item) ? <SeriesCard key={item.name} group={item} /> : <EventCard key={item.id} event={item} users={users} />))}
              </div>
            )}
          </section>

          {pastItems.length > 0 && (
            <section className="min-w-0 lg:col-span-3">
              <h2 className="g-display mb-1 text-xl font-bold">Para cerrar</h2>
              <p className="mb-3 text-sm text-[#5F6761]">Ya pasaron: cargá gastos reales, cobros y aprendizajes.</p>
              <div className="grid gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
                {pastItems.map((item) => (isGroup(item) ? <SeriesCard key={item.name} group={item} /> : <EventCard key={item.id} event={item} users={users} />))}
              </div>
            </section>
          )}
        </div>
      )}
    </Shell>
  )
}

function Metric({ label, value, hint, tone, href }: { label: string; value: number; hint: string; tone?: 'bad' | 'warn'; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-semibold text-[#7A837D]">{label}</p>
      <p className={`g-display mt-1 text-3xl font-extrabold tabular-nums ${tone === 'bad' ? 'text-[#B14D3B]' : tone === 'warn' ? 'text-[#806113]' : 'text-[#171D1A]'}`}>{value.toLocaleString('es-AR')}</p>
      <p className="mt-0.5 text-xs text-[#7A837D]">{hint}</p>
    </>
  )
  return href ? <Link href={href} className={`${card} block p-4 transition hover:shadow-md`}>{body}</Link> : <div className={`${card} p-4`}>{body}</div>
}
