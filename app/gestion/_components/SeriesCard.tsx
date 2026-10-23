'use client'

import Link from 'next/link'
import { CalendarRange, Ticket } from 'lucide-react'

import { formatMoney, seriesSlug } from '@/lib/gestion/schema'
import { todayISO } from '@/lib/gestion/summary'
import { cn } from '@/lib/utils'
import { CompactCard, PendingBadge, type EventCardData } from './EventCard'
import { card, formatDate } from './ui'

export type SeriesGroup = { name: string; events: EventCardData[] }

// Agrupa por serie: un evento suelto queda solo; dos o más de la misma serie, una tarjeta.
export function groupBySeries(events: EventCardData[]): (EventCardData | SeriesGroup)[] {
  const out: (EventCardData | SeriesGroup)[] = []
  const groups = new Map<string, SeriesGroup>()
  for (const event of events) {
    if (!event.series) {
      out.push(event)
      continue
    }
    let group = groups.get(event.series)
    if (!group) {
      group = { name: event.series, events: [] }
      groups.set(event.series, group)
      out.push(group)
    }
    group.events.push(event)
  }
  return out.map((item) => ('events' in item && item.events.length === 1 ? item.events[0] : item))
}

export function isGroup(item: EventCardData | SeriesGroup): item is SeriesGroup {
  return 'events' in item
}

export function seriesStats(group: SeriesGroup, today = todayISO()) {
  // La ficha madre (rango de fechas que abarca al resto) no se cuenta como una fecha más.
  const dates = group.events.filter((e) => !(e.end_date && e.start_date && e.end_date > e.start_date))
  const parent = group.events.find((e) => e.end_date && e.start_date && e.end_date > e.start_date) ?? null
  const sorted = [...dates].sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
  const next = sorted.find((e) => e.start_date && e.start_date >= today) ?? null
  const done = sorted.filter((e) => e.start_date && e.start_date < today).length
  const tickets = dates.reduce((sum, e) => sum + (e.web?.tickets ?? 0), 0)
  const revenue = parent?.web?.revenue ?? dates.reduce((sum, e) => sum + (e.web?.revenue ?? 0), 0)
  const result = parent ? parent.result_projected : dates.reduce((sum, e) => sum + e.result_projected, 0)
  const cover = parent?.cover_url ?? sorted.find((e) => e.cover_url)?.cover_url ?? null
  const first = sorted[0]?.start_date ?? parent?.start_date ?? null
  const last = sorted[sorted.length - 1]?.start_date ?? parent?.end_date ?? null
  return { dates: sorted, parent, next, done, tickets, revenue, result, cover, first, last }
}

// Fecha para ordenar una tarjeta: la próxima fecha de la serie (o la última si ya terminó).
export function itemDate(item: EventCardData | SeriesGroup, today = todayISO()): string {
  if (!isGroup(item)) return item.start_date ?? ''
  const stats = seriesStats(item, today)
  return stats.next?.start_date ?? stats.last ?? ''
}

export const byDateAsc = (today?: string) => (a: EventCardData | SeriesGroup, b: EventCardData | SeriesGroup) =>
  (itemDate(a, today) || '9999').localeCompare(itemDate(b, today) || '9999')

export function SeriesCard({ group }: { group: SeriesGroup }) {
  const stats = seriesStats(group)
  const progress = stats.dates.length ? (stats.done / stats.dates.length) * 100 : 0
  const sum = (pick: (e: EventCardData) => number | undefined) => group.events.reduce((total, e) => total + (pick(e) ?? 0), 0)
  const pending = <PendingBadge open={sum((e) => e.tasks?.open)} overdue={sum((e) => e.tasks?.overdue)} critical={sum((e) => e.alerts_critical)} warning={sum((e) => e.alerts_warning)} />
  return (
    <>
    <CompactCard
      href={`/gestion/series/${seriesSlug(group.name)}`}
      cover={stats.cover}
      badge={<span className="inline-flex items-center gap-0.5 rounded-md bg-[#EBFA61] px-1.5 py-0.5 text-[10px] font-extrabold text-[#00402E] shadow-sm"><CalendarRange className="size-3" />{stats.dates.length}</span>}
      kicker={`Serie · ${stats.done} de ${stats.dates.length} hechas`}
      title={group.name}
      sub={`Próxima: ${stats.next ? formatDate(stats.next.start_date, { weekday: 'short', day: 'numeric', month: 'short' }) : 'terminó'}`}
      stats={<>
        <span>{formatMoney(stats.revenue, group.events[0]?.currency)}</span>
        <span className="flex items-center gap-1"><Ticket className="size-3 text-[#006D42]" />{stats.tickets}</span>
      </>}
      pending={pending}
    />
    <Link href={`/gestion/series/${seriesSlug(group.name)}`} className={cn(card, 'group hidden h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md sm:flex')}>
      <div className="relative h-28 shrink-0 overflow-hidden bg-[#00402E]">
        {stats.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stats.cover} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <span className="absolute top-3 left-3 flex h-12 min-w-12 flex-col items-center justify-center rounded-xl bg-white/95 px-2 leading-none shadow-sm">
          <span className="g-display text-xl font-extrabold text-[#171D1A]">{stats.dates.length}</span>
          <span className="text-[10px] font-bold text-[#B14D3B] uppercase">fechas</span>
        </span>
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-[#EBFA61] px-2.5 py-0.5 text-xs font-bold text-[#00402E] shadow-sm"><CalendarRange className="size-3.5" />Serie</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-bold tracking-wide text-[#006D42] uppercase">{formatDate(stats.first)} → {formatDate(stats.last)}</p>
        <h3 className="g-display truncate text-lg leading-6 font-bold">{group.name}</h3>
        <p className="mt-0.5 truncate text-sm text-[#5F6761]">Próxima: {stats.next ? formatDate(stats.next.start_date, { weekday: 'short', day: 'numeric', month: 'short' }) : 'terminó'}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] font-semibold text-[#7A837D] uppercase">Ingresos</p>
            <p className="font-bold tabular-nums">{formatMoney(stats.revenue, group.events[0]?.currency)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#7A837D] uppercase">Entradas</p>
            <p className="flex items-center gap-1 font-bold tabular-nums"><Ticket className="size-3.5 text-[#006D42]" />{stats.tickets}</p>
          </div>
        </div>
        <div className="mt-auto border-t border-[#EDF1EB] pt-3">
          <div className="mt-0 flex items-center justify-between gap-2 text-xs text-[#5F6761]">
            <span>{stats.done} de {stats.dates.length} hechas</span>
            {pending}
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E8EDE9]"><div className="h-full rounded-full bg-[#006D42]" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>
    </Link>
    </>
  )
}
