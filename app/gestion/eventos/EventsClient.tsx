'use client'

import { useEffect, useMemo, useState } from 'react'

import { EVENT_TYPES, STATUS_LABEL, type EffectiveStatus, type TeamUser } from '@/lib/gestion/schema'
import { api } from '../_components/api'
import { EventCard, type EventCardData } from '../_components/EventCard'
import { NewEventButton } from '../_components/NewEventButton'
import { btnGhost, Empty, input, Shell } from '../_components/ui'

const ORDER: EffectiveStatus[] = ['en_curso', 'produccion', 'confirmado', 'planificacion', 'idea', 'realizado', 'cerrado', 'cancelado']

export function EventsClient({ user, users }: { user: TeamUser & { canEdit: boolean }; users: TeamUser[] }) {
  const [events, setEvents] = useState<EventCardData[] | null>(null)
  const [archived, setArchived] = useState(false)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')

  useEffect(() => {
    setEvents(null)
    api<{ events: EventCardData[] }>(`/api/gestion/events${archived ? '?archived=1' : ''}`).then((r) => setEvents(r.events)).catch(() => setEvents([]))
  }, [archived])

  const groups = useMemo(() => {
    const filtered = (events ?? []).filter((e) => (!type || e.type === type) && (!query || e.name.toLowerCase().includes(query.toLowerCase())))
    return ORDER.map((status) => ({ status, items: filtered.filter((e) => e.effective_status === status) })).filter((g) => g.items.length)
  }, [events, query, type])

  return (
    <Shell user={user}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[28px] leading-[34px] font-extrabold">{archived ? 'Eventos archivados' : 'Eventos'}</h1>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={() => setArchived(!archived)}>{archived ? 'Ver activos' : 'Ver archivados'}</button>
          <NewEventButton disabled={!user.canEdit} />
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        <input className={`${input} max-w-xs`} placeholder="Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className={`${input} max-w-[220px]`} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Todos los tipos</option>
          {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      {!events ? <p className="text-sm text-[#5F6761]">Cargando…</p> : groups.length === 0 ? <Empty>No hay eventos.</Empty> : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.status}>
              <h2 className="mb-2 text-sm font-bold text-[#5F6761] uppercase">{STATUS_LABEL[group.status]} · {group.items.length}</h2>
              <div className="grid gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
                {group.items.map((event) => <EventCard key={event.id} event={event} users={users} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </Shell>
  )
}
