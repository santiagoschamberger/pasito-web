'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { EVENT_TYPES, type TeamUser } from '@/lib/gestion/schema'
import { todayISO } from '@/lib/gestion/summary'
import { api } from '../_components/api'
import { EventCard, type EventCardData } from '../_components/EventCard'
import { NewEventButton } from '../_components/NewEventButton'
import { groupBySeries, isGroup, SeriesCard, itemDate, seriesStats } from '../_components/SeriesCard'
import { btnGhost, Empty, input, PageHeader, Shell } from '../_components/ui'

export function EventsClient({ user, users }: { user: TeamUser & { canEdit: boolean }; users: TeamUser[] }) {
  const [events, setEvents] = useState<EventCardData[] | null>(null)
  const [archived, setArchived] = useState(false)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')

  useEffect(() => {
    setEvents(null)
    api<{ events: EventCardData[] }>(`/api/gestion/events${archived ? '?archived=1' : ''}`).then((r) => setEvents(r.events)).catch(() => setEvents([]))
  }, [archived])

  // Una sola grilla, en orden: lo próximo primero (por fecha) y después lo que ya pasó (lo más reciente primero).
  const { upcoming, past } = useMemo(() => {
    const today = todayISO()
    const filtered = (events ?? []).filter((e) => (!type || e.type === type) && (!query || `${e.name} ${e.series ?? ''} ${e.venue ?? ''}`.toLowerCase().includes(query.toLowerCase())))
    const items = groupBySeries(filtered).map((item) => {
      const end = isGroup(item) ? null : item.end_date ?? item.start_date
      const upcoming = isGroup(item) ? seriesStats(item, today).next !== null : !end || end >= today
      return { item, date: itemDate(item, today), upcoming }
    })
    return {
      upcoming: items.filter((i) => i.upcoming).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')),
      past: items.filter((i) => !i.upcoming).sort((a, b) => b.date.localeCompare(a.date)),
    }
  }, [events, query, type])

  const grid = (list: typeof upcoming) => (
    <div className="grid gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
      {list.map(({ item }) => (isGroup(item) ? <SeriesCard key={item.name} group={item} /> : <EventCard key={item.id} event={item} users={users} />))}
    </div>
  )

  return (
    <Shell user={user}>
      <PageHeader
        title={archived ? 'Eventos archivados' : 'Eventos'}
        subtitle="Las series (como Pasito Club) se ven como una tarjeta; adentro están todas sus fechas."
        actions={<>
          <button className={btnGhost} onClick={() => setArchived(!archived)}>{archived ? 'Ver activos' : 'Ver archivados'}</button>
          <NewEventButton disabled={!user.canEdit} />
        </>}
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9AA39D]" />
          <input className={`${input} pl-9`} placeholder="Buscar evento, serie o lugar" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={`${input} w-full sm:w-60`} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Todos los tipos</option>
          {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      {!events ? <p className="text-sm text-[#5F6761]">Cargando…</p> : upcoming.length === 0 && past.length === 0 ? <Empty>No hay eventos.</Empty> : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold text-[#5F6761] uppercase">Próximos · {upcoming.length}</h2>
              {grid(upcoming)}
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold text-[#5F6761] uppercase">Ya pasaron · {past.length}</h2>
              {grid(past)}
            </section>
          )}
        </div>
      )}
    </Shell>
  )
}
