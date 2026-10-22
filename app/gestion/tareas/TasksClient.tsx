'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'

import { personLabel, type GestionEvent, type GestionRow, type TeamUser } from '@/lib/gestion/schema'
import { todayISO } from '@/lib/gestion/summary'
import { cn } from '@/lib/utils'
import { api } from '../_components/api'
import { Avatar, card, Empty, formatDate, PageHeader, Shell } from '../_components/ui'

type EventLite = Pick<GestionEvent, 'id' | 'name' | 'start_date' | 'status' | 'type'>

const GROUPS = [
  { key: 'vencidas', label: 'Vencidas', tone: 'text-[#B14D3B]' },
  { key: 'semana', label: 'Esta semana', tone: 'text-[#806113]' },
  { key: 'despues', label: 'Más adelante', tone: 'text-[#171D1A]' },
  { key: 'sin_fecha', label: 'Sin fecha', tone: 'text-[#5F6761]' },
] as const

export function TasksClient({ user, users }: { user: TeamUser & { canEdit: boolean }; users: TeamUser[] }) {
  const [data, setData] = useState<{ events: EventLite[]; tasks: GestionRow[] } | null>(null)
  const [owner, setOwner] = useState<string>(user.email)
  const [showDone, setShowDone] = useState(false)
  const load = useCallback(() => api<{ events: EventLite[]; tasks: GestionRow[] }>('/api/gestion/tasks').then(setData).catch(() => null), [])
  useEffect(() => { void load() }, [load])

  const today = todayISO()
  const weekEnd = new Date(Date.parse(`${today}T12:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10)
  const tasks = useMemo(() => (data?.tasks ?? [])
    .filter((t) => (owner === '' ? true : owner === '-' ? !t.data.owner : t.data.owner === owner))
    .filter((t) => showDone || t.data.estado !== 'hecha')
    .sort((a, b) => String(a.data.due || '9999').localeCompare(String(b.data.due || '9999'))), [data, owner, showDone])

  const group = (t: GestionRow) => {
    const due = typeof t.data.due === 'string' ? t.data.due : null
    if (!due) return 'sin_fecha'
    if (due < today && t.data.estado !== 'hecha') return 'vencidas'
    return due <= weekEnd ? 'semana' : 'despues'
  }

  async function toggle(task: GestionRow) {
    const estado = task.data.estado === 'hecha' ? 'pendiente' : 'hecha'
    setData((d) => d && { ...d, tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, data: { ...t.data, estado } } : t)) })
    try {
      await api(`/api/gestion/rows/${task.id}`, { method: 'PATCH', body: { field: 'estado', value: estado } })
      if (estado === 'hecha') toast.success('¡Hecha!')
    } catch {
      void load()
    }
  }

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of data?.tasks ?? []) if (t.data.estado !== 'hecha') map.set(String(t.data.owner ?? '-'), (map.get(String(t.data.owner ?? '-')) ?? 0) + 1)
    return map
  }, [data])

  return (
    <Shell user={user}>
      <PageHeader title="Tareas" subtitle="De todos los eventos activos, ordenadas por fecha." />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {[{ email: user.email, name: 'Mías' }, { email: '', name: 'Todas' }, ...users.filter((u) => u.email !== user.email), { email: '-', name: 'Sin responsable' }].map((u) => (
          <button
            key={u.email || 'all'}
            onClick={() => setOwner(u.email)}
            className={cn('flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition', owner === u.email ? 'border-[#00402E] bg-[#00402E] text-white' : 'border-[#DDE6DF] bg-white hover:border-[#B9CBBE]')}
          >
            {u.email && u.email !== '-' && u.email !== user.email && <Avatar name={u.name} email={u.email} size={20} />}
            {u.name || u.email}
            {u.email !== '' && <span className="opacity-70">{counts.get(u.email === '' ? '' : u.email) ?? 0}</span>}
          </button>
        ))}
        <label className="ml-auto flex shrink-0 items-center gap-2 px-2 text-sm text-[#5F6761]"><input type="checkbox" className="accent-[#006D42]" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />Ver hechas</label>
      </div>
      {!data ? <div className={`${card} h-40 animate-pulse`} /> : tasks.length === 0 ? <Empty icon={<span className="text-3xl">🎉</span>}>Nada pendiente acá.</Empty> : (
        <div className="space-y-6">
          {GROUPS.map((g) => {
            const items = tasks.filter((t) => group(t) === g.key)
            if (!items.length) return null
            return (
              <section key={g.key}>
                <h2 className={cn('mb-2 text-sm font-bold uppercase', g.tone)}>{g.label} · {items.length}</h2>
                <ul className={`${card} divide-y divide-[#EDF1EB]`}>
                  {items.map((task) => {
                    const event = data.events.find((e) => e.id === task.event_id)
                    const done = task.data.estado === 'hecha'
                    return (
                      <li key={task.id} className={cn('flex items-center gap-3 px-4 py-3', done && 'opacity-55')}>
                        <button disabled={!user.canEdit} onClick={() => toggle(task)} className={cn('grid size-6 shrink-0 place-items-center rounded-full border-2 transition', done ? 'border-[#006D42] bg-[#006D42] text-white' : 'border-[#C3CCC5] text-transparent hover:border-[#006D42] hover:text-[#006D42]')}>
                          <Check className="size-3.5" strokeWidth={3} />
                        </button>
                        <Link href={`/gestion/eventos/${task.event_id}?tab=task`} className="min-w-0 flex-1">
                          <p className={cn('truncate text-sm font-semibold', done && 'line-through')}>{String(task.data.titulo || 'Tarea')}</p>
                          <p className="truncate text-xs text-[#5F6761]">{event?.name ?? ''}{task.data.prioridad === 'alta' ? ' · Prioridad alta' : ''}</p>
                        </Link>
                        {owner === '' && (task.data.owner ? <span title={personLabel(String(task.data.owner), users)}><Avatar name={users.find((u) => u.email === task.data.owner)?.name} email={String(task.data.owner)} size={26} /></span> : <span className="text-xs text-[#9AA39D]">Sin asignar</span>)}
                        <span className={cn('w-16 shrink-0 text-right text-xs font-bold', g.key === 'vencidas' ? 'text-[#B14D3B]' : 'text-[#5F6761]')}>{task.data.due ? formatDate(String(task.data.due)) : ''}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
      <p className="mt-6 text-xs text-[#9AA39D]">Tip: en cada evento, pestaña Tareas, escribís y das Enter para agregar.</p>
    </Shell>
  )
}
