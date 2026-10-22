'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, DoorOpen, FolderKanban, Loader2, Ticket } from 'lucide-react'

import { formatMoney, seriesSlug, type TeamUser } from '@/lib/gestion/schema'
import { todayISO } from '@/lib/gestion/summary'
import { cn } from '@/lib/utils'
import { api } from '../../_components/api'
import type { EventCardData } from '../../_components/EventCard'
import { seriesStats } from '../../_components/SeriesCard'
import { card, Empty, formatDate, Shell, StatusPill } from '../../_components/ui'

export function SeriesClient({ slug, user }: { slug: string; user: TeamUser & { canEdit: boolean }; users: TeamUser[] }) {
  const [events, setEvents] = useState<EventCardData[] | null>(null)
  useEffect(() => {
    api<{ events: EventCardData[] }>('/api/gestion/events').then((r) => setEvents(r.events)).catch(() => setEvents([]))
  }, [])
  const group = useMemo(() => {
    const own = (events ?? []).filter((e) => e.series && seriesSlug(e.series) === slug)
    return own.length ? { name: own[0].series as string, events: own } : null
  }, [events, slug])
  const today = todayISO()

  if (!events) return <Shell user={user}><div className="grid h-60 place-items-center"><Loader2 className="size-6 animate-spin text-[#006D42]" /></div></Shell>
  if (!group) return <Shell user={user}><Empty>No encontramos esta serie.</Empty></Shell>

  const stats = seriesStats(group, today)
  const capacity = stats.dates.reduce((sum, e) => sum + (e.web?.capacity ?? e.capacity ?? 0), 0)

  return (
    <Shell user={user}>
      <Link href="/gestion/eventos" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#5F6761] hover:text-[#171D1A]"><ArrowLeft className="size-4" />Eventos</Link>
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-[#00402E] text-white">
        {stats.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stats.cover} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#00402E] via-[#00402E]/80 to-transparent" />
        <div className="relative p-6 sm:p-8">
          <p className="text-xs font-bold tracking-wider text-[#EBFA61] uppercase">Serie · {stats.dates.length} fechas</p>
          <h1 className="g-display mt-1 text-4xl font-extrabold">{group.name}</h1>
          <p className="mt-1 text-white/80">{formatDate(stats.first, { day: 'numeric', month: 'long' })} → {formatDate(stats.last, { day: 'numeric', month: 'long' })}</p>
          <div className="mt-6 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Fechas hechas', value: `${stats.done} / ${stats.dates.length}` },
              { label: 'Entradas vendidas', value: `${stats.tickets}${capacity ? ` / ${capacity}` : ''}` },
              { label: 'Ingresos entradas', value: formatMoney(stats.revenue, group.events[0].currency) },
              { label: 'Próxima', value: stats.next ? formatDate(stats.next.start_date, { weekday: 'short', day: 'numeric', month: 'short' }) : '—' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold text-white/70 uppercase">{s.label}</p>
                <p className="g-display text-xl font-extrabold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {stats.parent && (
        <Link href={`/gestion/eventos/${stats.parent.id}`} className={cn(card, 'mb-6 flex items-center gap-4 p-4 transition hover:shadow-md')}>
          <span className="grid size-11 place-items-center rounded-xl bg-[#EBFA61] text-[#00402E]"><FolderKanban className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Ficha general de la serie</p>
            <p className="text-sm text-[#5F6761]">Sponsors, plata total, tareas y presupuesto de toda la temporada.</p>
          </div>
          <span className="hidden text-sm font-bold tabular-nums sm:block">{formatMoney(stats.result, group.events[0].currency)}</span>
          <ArrowRight className="size-5 text-[#9AA39D]" />
        </Link>
      )}

      <h2 className="g-display mb-3 text-2xl font-bold">Fechas</h2>
      <ol className="space-y-2">
        {stats.dates.map((e) => {
          const cap = e.web?.capacity ?? e.capacity
          const sold = e.web?.tickets ?? 0
          const isNext = stats.next?.id === e.id
          const past = !!e.start_date && e.start_date < today
          return (
            <li key={e.id}>
              <Link href={`/gestion/eventos/${e.id}`} className={cn(card, 'flex items-center gap-3 p-3 transition hover:shadow-md sm:gap-4 sm:pr-4', isNext && 'ring-2 ring-[#EBFA61]', past && 'opacity-70')}>
                <span className={cn('flex size-14 shrink-0 flex-col items-center justify-center rounded-xl leading-none', isNext ? 'bg-[#00402E] text-white' : 'bg-[#F2F6F1]')}>
                  <span className={cn('text-[10px] font-bold uppercase', isNext ? 'text-[#EBFA61]' : 'text-[#B14D3B]')}>{formatDate(e.start_date, { weekday: 'short' }).replace('.', '')}</span>
                  <span className="g-display text-xl font-extrabold">{e.start_date ? Number(e.start_date.slice(8)) : '–'}</span>
                  <span className="text-[10px] font-semibold opacity-70">{formatDate(e.start_date, { month: 'short' }).replace('.', '')}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="line-clamp-2 font-bold leading-snug">{e.name.replace(/ · (Lun|Mar|Mié|Jue|Vie|Sáb|Dom) \d{1,2}\/\d{1,2}/, '')}</span>
                      <span className="mt-0.5 block text-sm text-[#5F6761]">{[e.start_time, e.venue].filter(Boolean).join(' · ')}</span>
                    </span>
                    {isNext ? <span className="shrink-0 rounded-full bg-[#EBFA61] px-2 py-0.5 text-[10px] font-bold text-[#00402E] uppercase">Próxima</span> : <StatusPill status={e.effective_status} className="shrink-0" />}
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-xs text-[#5F6761]">
                    <Ticket className="size-3.5 shrink-0 text-[#006D42]" />
                    <span className="shrink-0"><strong className="text-[#171D1A]">{sold}</strong>{cap ? ` / ${cap}` : ''} entradas</span>
                    {cap ? <span className="h-1.5 max-w-48 flex-1 overflow-hidden rounded-full bg-[#E8EDE9]"><span className="block h-full rounded-full bg-[#006D42]" style={{ width: `${Math.min(100, (sold / cap) * 100)}%` }} /></span> : null}
                    {e.web?.checkedIn ? <span className="shrink-0">· {e.web.checkedIn} entraron</span> : null}
                  </span>
                </span>
                {isNext && (
                  <span
                    role="link"
                    onClick={(ev) => { ev.preventDefault(); window.location.href = `/gestion/puerta/${e.id}` }}
                    className="hidden shrink-0 items-center gap-1 rounded-lg bg-[#EBFA61] px-3 py-2 text-xs font-bold text-[#00402E] sm:flex"
                  >
                    <DoorOpen className="size-4" />Puerta
                  </span>
                )}
                <ArrowRight className="hidden size-4 shrink-0 text-[#9AA39D] sm:block" />
              </Link>
            </li>
          )
        })}
      </ol>
    </Shell>
  )
}
