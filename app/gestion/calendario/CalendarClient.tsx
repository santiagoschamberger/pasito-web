'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { TeamUser } from '@/lib/gestion/schema'
import { daysBetween, todayISO } from '@/lib/gestion/summary'
import { cn } from '@/lib/utils'
import { api } from '../_components/api'
import { eventEmoji, type EventCardData } from '../_components/EventCard'
import { NewEventButton } from '../_components/NewEventButton'
import { btnSecondary, card, PageHeader, Shell, STATUS_DOT, StatusPill } from '../_components/ui'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const iso = (d: Date) => d.toISOString().slice(0, 10)

export function CalendarClient({ user }: { user: TeamUser & { canEdit: boolean }; users: TeamUser[] }) {
  const today = todayISO()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [events, setEvents] = useState<EventCardData[]>([])
  useEffect(() => {
    api<{ events: EventCardData[] }>('/api/gestion/events').then((r) => setEvents(r.events)).catch(() => null)
  }, [])

  const days = useMemo(() => {
    const first = new Date(`${month}-01T12:00:00Z`)
    const offset = (first.getUTCDay() + 6) % 7
    const start = new Date(first.getTime() - offset * 86400000)
    return Array.from({ length: 42 }, (_, i) => iso(new Date(start.getTime() + i * 86400000)))
  }, [month])

  // Los ciclos largos (más de 3 días) van en una franja aparte para no llenar cada celda.
  const isLong = (e: EventCardData) => !!e.start_date && !!e.end_date && daysBetween(e.start_date, e.end_date) > 3
  const onDay = (day: string) => events.filter((e) => e.start_date && !isLong(e) && day >= e.start_date && day <= (e.end_date || e.start_date))
  const monthStart = `${month}-01`
  const monthEnd = `${month}-31`
  const long = events.filter((e) => isLong(e) && e.start_date! <= monthEnd && e.end_date! >= monthStart)
  const shift = (delta: number) => {
    const d = new Date(`${month}-15T12:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() + delta)
    setMonth(iso(d).slice(0, 7))
  }
  const rawLabel = new Date(`${month}-15T12:00:00Z`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
  const monthEvents = events.filter((e) => e.start_date && (e.start_date.startsWith(month) || (e.end_date ?? '').startsWith(month))).sort((a, b) => a.start_date!.localeCompare(b.start_date!))
  const undated = events.filter((e) => !e.start_date)

  return (
    <Shell user={user} wide>
      <PageHeader
        title={monthLabel}
        subtitle="Todos los eventos e iniciativas del equipo."
        actions={<>
          <button className={btnSecondary} onClick={() => shift(-1)}><ChevronLeft className="size-4" /></button>
          <button className={btnSecondary} onClick={() => setMonth(today.slice(0, 7))}>Hoy</button>
          <button className={btnSecondary} onClick={() => shift(1)}><ChevronRight className="size-4" /></button>
          <NewEventButton disabled={!user.canEdit} />
        </>}
      />

      {long.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {long.map((e) => (
            <Link key={e.id} href={`/gestion/eventos/${e.id}`} className="flex items-center gap-2 rounded-full border border-[#DDE6DF] bg-white px-3 py-1.5 text-sm font-semibold hover:border-[#006D42]">
              <span className="size-2 rounded-full" style={{ background: STATUS_DOT[e.effective_status] }} />
              {eventEmoji(e.type)} {e.name}
              <span className="font-normal text-[#5F6761]">{e.start_date!.slice(8)}/{e.start_date!.slice(5, 7)} → {e.end_date!.slice(8)}/{e.end_date!.slice(5, 7)}</span>
            </Link>
          ))}
        </div>
      )}

      <div className={`${card} hidden overflow-hidden md:block`}>
        <div className="grid grid-cols-7 border-b border-[#EDF1EB] bg-[#FAFBF7] text-center text-xs font-bold text-[#7A837D] uppercase">
          {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const items = onDay(day)
            const inMonth = day.startsWith(month)
            return (
              <div key={day} className={cn('min-h-28 border-r border-b border-[#EDF1EB] p-1.5 [&:nth-child(7n)]:border-r-0', !inMonth && 'bg-[#FAFBF7]')}>
                <p className={cn('mb-1 grid size-7 place-items-center rounded-full text-xs font-bold', day === today ? 'bg-[#006D42] text-white' : inMonth ? 'text-[#171D1A]' : 'text-[#B9C1BB]')}>{Number(day.slice(8))}</p>
                <div className="space-y-1">
                  {items.map((e) => (
                    <Link key={e.id} href={`/gestion/eventos/${e.id}`} className={cn('block truncate rounded-md px-1.5 py-1 text-[11px] font-semibold', e.effective_status === 'en_curso' ? 'text-[#00402E]' : 'text-white')} style={{ background: e.effective_status === 'en_curso' ? '#EBFA61' : STATUS_DOT[e.effective_status] }} title={e.name}>
                      {eventEmoji(e.type)} {e.start_time && e.start_date === day ? `${e.start_time.slice(0, 5)} ` : ''}{e.name}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <ul className="space-y-2 md:hidden">
        {monthEvents.length === 0 && <li className="text-sm text-[#5F6761]">Sin eventos este mes.</li>}
        {monthEvents.map((e) => (
          <li key={e.id}>
            <Link href={`/gestion/eventos/${e.id}`} className={`${card} flex items-center gap-3 p-3`}>
              <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#F2F6F1] leading-none">
                <span className="text-[10px] font-bold text-[#B14D3B] uppercase">{new Date(`${e.start_date}T12:00:00Z`).toLocaleDateString('es-AR', { weekday: 'short' })}</span>
                <span className="g-display text-lg font-extrabold">{Number(e.start_date!.slice(8))}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{eventEmoji(e.type)} {e.name}</span>
                <span className="text-xs text-[#5F6761]">{[e.start_time, e.venue].filter(Boolean).join(' · ')}</span>
              </span>
              <StatusPill status={e.effective_status} />
            </Link>
          </li>
        ))}
      </ul>

      {undated.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-[#5F6761] uppercase">Sin fecha todavía</h2>
          <div className="flex flex-wrap gap-2">
            {undated.map((e) => <Link key={e.id} href={`/gestion/eventos/${e.id}`} className="rounded-full border border-[#DDE6DF] bg-white px-3 py-1.5 text-sm font-semibold hover:border-[#006D42]">{eventEmoji(e.type)} {e.name}</Link>)}
          </div>
        </div>
      )}
    </Shell>
  )
}
