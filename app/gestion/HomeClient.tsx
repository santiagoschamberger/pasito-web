'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'

import { formatMoney, type GestionRow, type TeamUser } from '@/lib/gestion/schema'
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

  const firstName = (user.name || user.email).split(/[\s@]/)[0]
  const upcoming = useMemo(() => (data?.upcoming ?? []).filter((e) => !e.start_date || (e.end_date ?? e.start_date) >= data!.today), [data])
  const past = useMemo(() => (data?.upcoming ?? []).filter((e) => e.start_date && (e.end_date ?? e.start_date) < data!.today), [data])
  // Las series (Pasito Club, etc.) van como una sola tarjeta.
  const grouped = useMemo(() => groupBySeries(data?.upcoming ?? []), [data])
  const upcomingItems = grouped.filter((item) => (isGroup(item) ? seriesStats(item, data?.today).next !== null : upcoming.includes(item)))
  const pastItems = grouped.filter((item) => (isGroup(item) ? seriesStats(item, data?.today).next === null : past.includes(item)))
  // Lo próximo que arranca (un ciclo de varias semanas ya en curso no tapa la fecha de esta semana).
  const next = upcoming.find((e) => e.start_date && e.start_date >= (data?.today ?? '')) ?? upcoming.find((e) => e.start_date)
  const activeCount = groupBySeries(upcoming).length
  const datedUpcoming = upcoming
    .filter((e) => e.start_date && e.start_date >= (data?.today ?? '') && !(e.end_date && e.end_date > e.start_date))
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!))
  // Mismo total que suman las tarjetas de abajo.
  const activeEvents = upcomingItems.flatMap((item) => (isGroup(item) ? item.events : [item]))
  const openTasks = activeEvents.reduce((sum, e) => sum + (e.tasks?.open ?? 0), 0)
  const overdueTasks = activeEvents.reduce((sum, e) => sum + (e.tasks?.overdue ?? 0), 0)
  const critical = activeEvents.reduce((sum, e) => sum + (e.alerts_critical ?? 0), 0)
  const ticketsUpcoming = datedUpcoming.reduce((sum, e) => sum + (e.web?.tickets ?? 0), 0)
  const revenueBy = (currency: string) => datedUpcoming.filter((e) => (e.currency ?? 'ARS') === currency).reduce((sum, e) => sum + (e.web?.revenue ?? 0), 0)
  const revenueUpcoming = revenueBy('ARS')
  const revenueUy = revenueBy('UYU')


  return (
    <Shell user={user}>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase())}
        actions={<NewEventButton disabled={!user.canEdit} />}
      />

      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Entradas vendidas" value={ticketsUpcoming.toLocaleString('es-AR')} hint="próximas fechas" />
          <Metric label="Recaudado web" value={formatMoney(revenueUpcoming)} hint={revenueUy ? `+ ${formatMoney(revenueUy, 'UYU')} en Uruguay` : 'próximas fechas'} />
          <Metric label="Eventos activos" value={activeCount.toLocaleString('es-AR')} hint={`${datedUpcoming.length} fechas por delante`} href="/gestion/eventos" />
          <Metric label="Pendientes" value={openTasks.toLocaleString('es-AR')} hint={overdueTasks ? `${overdueTasks} vencidas` : openTasks ? 'en los eventos' : 'todo al día'} tone={overdueTasks || critical ? 'bad' : undefined} href="/gestion/tareas" />
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
        <div className="space-y-8">
          <section className="min-w-0">
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
            <section className="min-w-0">
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

function Metric({ label, value, hint, tone, href }: { label: string; value: string; hint: string; tone?: 'bad' | 'warn'; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-semibold text-[#7A837D]">{label}</p>
      <p className={`g-display mt-1 text-3xl font-extrabold tabular-nums ${tone === 'bad' ? 'text-[#B14D3B]' : tone === 'warn' ? 'text-[#806113]' : 'text-[#171D1A]'}`}>{value}</p>
      <p className="mt-0.5 text-xs text-[#7A837D]">{hint}</p>
    </>
  )
  return href ? <Link href={href} className={`${card} block p-4 transition hover:shadow-md`}>{body}</Link> : <div className={`${card} p-4`}>{body}</div>
}
