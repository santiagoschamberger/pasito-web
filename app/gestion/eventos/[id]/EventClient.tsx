'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, ArrowLeft, Check, CloudOff, Copy, ExternalLink, FolderOpen, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  EVENT_STATUSES,
  SPONSOR_STAGES,
  type ActivityEntry,
  type EventStatus,
  type GestionEvent,
  type GestionRow,
  type RowKind,
  type TeamUser,
} from '@/lib/gestion/schema'
import { effectiveStatus, formatMoneySafe } from './helpers'
import { api, ApiError } from '../../_components/api'
import { SectionTable, type SaveState } from '../../_components/SectionTable'
import { btnGhost, btnSecondary, card, StatusPill, timeAgo } from '../../_components/ui'
import { SummaryTab } from './SummaryTab'
import { FichaTab } from './FichaTab'
import { AttendeesTab } from './AttendeesTab'

export type PasitoEventLite = { id: string; title: string; start_at: string; max_participants: number | null; participant_count: number | null }

type EventPayload = { event: GestionEvent; rows: GestionRow[]; activity: ActivityEntry[]; pasitoEvents: PasitoEventLite[] }

const TABS: { key: string; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'budget', label: 'Presupuesto' },
  { key: 'sponsor', label: 'Sponsors' },
  { key: 'task', label: 'Tareas' },
  { key: 'team', label: 'Equipo' },
  { key: 'vendor', label: 'Proveedores' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'asistentes', label: 'Asistentes' },
  { key: 'ficha', label: 'Ficha' },
  { key: 'historial', label: 'Historial' },
]

const TAB_ALIAS: Record<string, string> = { permit: 'ficha', kpi: 'ficha', contact: 'ficha', learning: 'team' }

export type SessionUser = TeamUser & { canEdit: boolean; isAdmin: boolean }

export function EventClient({ eventId, user, users }: { eventId: string; user: SessionUser; users: TeamUser[] }) {
  const router = useRouter()
  const search = useSearchParams()
  const initialTab = search.get('tab') ?? 'resumen'
  const [tab, setTab] = useState(TAB_ALIAS[initialTab] ?? initialTab)
  const [data, setData] = useState<EventPayload | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [blockers, setBlockers] = useState<string[]>([])

  const load = useCallback(async () => {
    try {
      setData(await api<EventPayload>(`/api/gestion/events/${eventId}`, { quiet: true }))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setNotFound(true)
    }
  }, [eventId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (saveState !== 'saved') return
    const timer = setTimeout(() => setSaveState('idle'), 2500)
    return () => clearTimeout(timer)
  }, [saveState])

  const selectTab = (key: string) => {
    setTab(key)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', key)
    window.history.replaceState(null, '', url)
  }

  const onRowsChange = useCallback((updater: (rows: GestionRow[]) => GestionRow[]) => {
    setData((d) => (d ? { ...d, rows: updater(d.rows) } : d))
  }, [])

  const updateEvent = useCallback(async (fields: Partial<GestionEvent>) => {
    let previous: GestionEvent | null = null
    setData((d) => {
      if (!d) return d
      previous = d.event
      return { ...d, event: { ...d.event, ...fields } }
    })
    setSaveState('saving')
    try {
      const result = await api<{ event: GestionEvent }>(`/api/gestion/events/${eventId}`, { method: 'PATCH', body: fields, quiet: true })
      setData((d) => (d ? { ...d, event: result.event } : d))
      setSaveState('saved')
      setBlockers([])
      return true
    } catch (error) {
      if (previous) setData((d) => (d ? { ...d, event: previous! } : d))
      setSaveState('error')
      if (error instanceof ApiError && Array.isArray(error.payload.blockers)) setBlockers(error.payload.blockers as string[])
      else toast.error(error instanceof Error ? error.message : 'No se pudo guardar.')
      return false
    }
  }, [eventId])

  if (notFound) {
    return <div className="p-10 text-center"><p className="mb-3">Este evento no existe.</p><Link className={btnSecondary} href="/gestion">Volver</Link></div>
  }
  if (!data) return <div className="grid min-h-dvh place-items-center"><Loader2 className="size-6 animate-spin text-[#006D42]" /></div>

  const { event, rows } = data
  const closed = event.status === 'cerrado'
  const canEdit = user.canEdit && !closed
  const status = effectiveStatus(event)
  const tableProps = { eventId, rows, users, canEdit, onRowsChange, onSaveState: setSaveState }

  async function attendanceToKpi(inside: number) {
    const kpi = rows.find((r) => r.kind === 'kpi' && String(r.data.nombre || '').toLowerCase().startsWith('asistentes'))
    if (kpi) {
      const result = await api<{ row: GestionRow }>(`/api/gestion/rows/${kpi.id}`, { method: 'PATCH', body: { field: 'real', value: inside } })
      onRowsChange((list) => list.map((r) => (r.id === kpi.id ? result.row : r)))
    } else {
      const result = await api<{ row: GestionRow }>(`/api/gestion/events/${eventId}/rows`, { body: { kind: 'kpi', data: { nombre: 'Asistentes', real: inside, objetivo: event.capacity, unidad: 'personas' } } })
      onRowsChange((list) => [...list, result.row])
    }
    toast.success(`Asistencia real: ${inside} personas, cargada en Objetivos`)
  }

  async function duplicate() {
    const name = window.prompt('Nombre del nuevo evento', `${event.name} (copia)`)
    if (!name) return
    const result = await api<{ event: { id: string } }>('/api/gestion/events', { body: { name, duplicateFrom: event.id } })
    router.push(`/gestion/eventos/${result.event.id}`)
  }

  async function archive() {
    if (!window.confirm(event.archived_at ? '¿Restaurar este evento?' : 'El evento se archiva (no se borra). ¿Seguimos?')) return
    await api(`/api/gestion/events/${eventId}`, { method: 'PATCH', body: { archive: !event.archived_at } })
    void load()
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-[#DDE6DF] bg-white">
        <div className="mx-auto max-w-[1344px] px-4 pt-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Link href="/gestion" className="grid size-8 place-items-center rounded-md text-[#5F6761] hover:bg-[#F2F6F1]"><ArrowLeft className="size-4" /></Link>
            <input
              key={event.updated_at}
              className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-1 text-xl font-extrabold outline-none hover:border-[#DDE6DF] focus:border-[#006D42] sm:text-2xl"
              defaultValue={event.name}
              disabled={!canEdit}
              onBlur={(e) => e.target.value.trim() && e.target.value !== event.name && updateEvent({ name: e.target.value.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
            <SaveIndicator state={saveState} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-10 text-sm text-[#5F6761]">
            <StatusPill status={status} />
            <select
              className="h-7 rounded-md border border-[#DDE6DF] bg-white px-1.5 text-xs font-semibold"
              value={event.status}
              disabled={!user.canEdit || (closed && !user.isAdmin)}
              onChange={(e) => updateEvent({ status: e.target.value as EventStatus })}
              title="Cambiar estado"
            >
              {EVENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {event.drive_url ? (
              <a href={event.drive_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-[#006D42]"><FolderOpen className="size-4" />Drive<ExternalLink className="size-3" /></a>
            ) : (
              <button className="flex items-center gap-1 text-[#806113]" onClick={() => selectTab('ficha')}><FolderOpen className="size-4" />Sin carpeta de Drive</button>
            )}
            {event.archived_at && <span className="font-semibold text-[#B14D3B]">Archivado</span>}
            <span className="ml-auto flex gap-1">
              {user.canEdit && <button className={`${btnGhost} h-7 px-2 text-xs`} onClick={duplicate}><Copy className="size-3.5" />Duplicar</button>}
              {user.canEdit && <button className={`${btnGhost} h-7 px-2 text-xs`} onClick={archive}><Archive className="size-3.5" />{event.archived_at ? 'Restaurar' : 'Archivar'}</button>}
            </span>
          </div>
          {blockers.length > 0 && (
            <div className="mt-2 rounded-md border border-[#F2D6CF] bg-[#FFF6F4] p-3 text-sm text-[#B14D3B]">
              <p className="font-semibold">Para cerrar el evento falta:</p>
              <ul className="mt-1 list-disc pl-5">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          )}
          <nav className="-mb-px mt-2 flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => selectTab(t.key)}
                className={`border-b-2 px-2.5 py-2 text-sm font-semibold whitespace-nowrap ${tab === t.key ? 'border-[#006D42] text-[#006D42]' : 'border-transparent text-[#5F6761] hover:text-[#171D1A]'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1344px] px-4 py-6 sm:px-6">
        {closed && <p className="mb-4 rounded-md bg-[#EEEEEE] px-3 py-2 text-sm">Evento cerrado: queda en solo lectura.{user.isAdmin ? ' Como admin podés reabrirlo cambiando el estado.' : ''}</p>}

        {tab === 'resumen' && <SummaryTab event={event} rows={rows} users={users} onGoTo={selectTab} />}

        {tab === 'budget' && (
          <Section title="Presupuesto" hint="Montos en pesos, con IVA incluido. Sponsors confirmados y proveedores suman solos (filas grises).">
            <SectionTable
              {...tableProps}
              kind="budget"
              defaults={{ tipo: 'egreso', estado: 'pendiente' }}
              extraRows={derivedBudgetRows(rows)}
            />
          </Section>
        )}

        {tab === 'sponsor' && (
          <Section title="Sponsors" hint="El aporte en dinero suma al presupuesto recién en Confirmado. Los canjes se muestran aparte y no suman a la caja.">
            <SectionTable {...tableProps} kind="sponsor" defaults={{ etapa: 'contacto', contrato: 'no' }} />
          </Section>
        )}

        {tab === 'task' && (
          <Section title="Tareas" hint="Una tarea, un responsable. Si son varios, dividila.">
            <SectionTable {...tableProps} kind="task" defaults={{ estado: 'pendiente', prioridad: 'media' }} />
          </Section>
        )}

        {tab === 'team' && (
          <div className="space-y-8">
            <Section title="Equipo" hint="Quién hace qué y dónde está el día del evento.">
              <SectionTable {...tableProps} kind="team" />
            </Section>
            <Section title="Aprendizajes" hint="Los “a mejorar” se convierten en tareas cuando se duplica el evento.">
              <SectionTable {...tableProps} kind="learning" defaults={{ tipo: 'bien' }} emptyText="Cargá qué funcionó, qué mejorar e ideas." />
            </Section>
          </div>
        )}

        {tab === 'vendor' && (
          <Section title="Proveedores" hint="Suman solos al presupuesto. La seña y el saldo pagos cuentan como gasto real.">
            <SectionTable {...tableProps} kind="vendor" defaults={{ contrato: 'no' }} />
          </Section>
        )}

        {tab === 'checklist' && <ChecklistTab {...tableProps} />}

        {tab === 'asistentes' && <AttendeesTab event={event} user={user} pasitoEvents={data.pasitoEvents} onAttendanceToKpi={attendanceToKpi} />}

        {tab === 'ficha' && <FichaTab event={event} users={users} user={user} canEdit={canEdit} tableProps={tableProps} pasitoEvents={data.pasitoEvents} onUpdate={updateEvent} onReload={load} />}

        {tab === 'historial' && <HistoryTab eventId={eventId} users={users} initial={data.activity} />}
      </main>
    </div>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving') return <span className="flex items-center gap-1 text-xs text-[#5F6761]"><Loader2 className="size-3.5 animate-spin" />Guardando</span>
  if (state === 'saved') return <span className="flex items-center gap-1 text-xs font-semibold text-[#006D42]"><Check className="size-3.5" />Guardado</span>
  if (state === 'error') return <span className="flex items-center gap-1 text-xs font-semibold text-[#B14D3B]"><CloudOff className="size-3.5" />No se guardó</span>
  return null
}

export function Section({ title, hint, children, action }: { title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[20px] leading-6 font-bold">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-[#5F6761]">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function derivedBudgetRows(rows: GestionRow[]) {
  const stage = (v: unknown) => SPONSOR_STAGES.find((s) => s.value === v)?.label ?? ''
  const sponsors = rows
    .filter((r) => r.kind === 'sponsor' && (r.data.etapa === 'confirmado' || r.data.etapa === 'cobrado') && typeof r.data.dinero === 'number')
    .map((r) => ({
      key: r.id,
      note: 'Viene de Sponsors',
      cells: {
        tipo: 'Ingreso',
        categoria: 'Sponsor',
        concepto: String(r.data.marca || 'Sponsor'),
        presupuestado: formatMoneySafe(r.data.dinero),
        real: r.data.etapa === 'cobrado' ? formatMoneySafe(r.data.dinero) : '',
        estado: stage(r.data.etapa),
        vence: r.data.fecha_cobro ? String(r.data.fecha_cobro) : '',
      },
    }))
  const vendors = rows
    .filter((r) => r.kind === 'vendor' && typeof r.data.total === 'number')
    .map((r) => {
      const total = r.data.total as number
      const paid = r.data.saldo_pagado ? total : r.data.sena_pagada ? Number(r.data.sena) || 0 : 0
      return {
        key: r.id,
        note: 'Viene de Proveedores',
        cells: {
          tipo: 'Gasto',
          categoria: 'Proveedor',
          concepto: `${String(r.data.proveedor || 'Proveedor')}${r.data.servicio ? ` · ${String(r.data.servicio)}` : ''}`,
          presupuestado: formatMoneySafe(total),
          real: paid ? formatMoneySafe(paid) : '',
          estado: r.data.saldo_pagado ? 'Pagado' : r.data.sena_pagada ? 'Señado' : 'Pendiente',
          vence: r.data.fecha_pago ? String(r.data.fecha_pago) : '',
        },
      }
    })
  return [...sponsors, ...vendors]
}

function ChecklistTab(props: { eventId: string; rows: GestionRow[]; users: TeamUser[]; canEdit: boolean; onRowsChange: (u: (rows: GestionRow[]) => GestionRow[]) => void; onSaveState: (s: SaveState) => void }) {
  const items = props.rows.filter((r) => r.kind === 'checklist')
  const done = items.filter((r) => r.data.hecho === true).length
  const phases: { key: string; label: string }[] = [{ key: 'antes', label: 'Antes' }, { key: 'durante', label: 'Durante' }, { key: 'despues', label: 'Después' }]
  return (
    <Section title="Checklist" hint={`${done} de ${items.length} hechos.`}>
      <div className="space-y-6">
        {phases.map((phase) => {
          const phaseRows = props.rows.filter((r) => r.kind !== 'checklist' || r.data.fase === phase.key || (!r.data.fase && phase.key === 'antes'))
          return (
            <div key={phase.key}>
              <h3 className="mb-2 text-sm font-bold uppercase text-[#5F6761]">{phase.label}</h3>
              <SectionTable {...props} rows={phaseRows} kind="checklist" defaults={{ fase: phase.key, hecho: false }} columns={['hecho', 'item', 'owner']} emptyText="Sin ítems." />
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function HistoryTab({ eventId, users, initial }: { eventId: string; users: TeamUser[]; initial: ActivityEntry[] }) {
  const [entries, setEntries] = useState(initial)
  useEffect(() => {
    api<{ activity: ActivityEntry[] }>(`/api/gestion/events/${eventId}/activity`).then((r) => setEntries(r.activity)).catch(() => null)
  }, [eventId])
  const name = (actor: string) => users.find((u) => u.email === actor)?.name || actor.replace(/@.*/, '')
  const grouped = useMemo(() => entries, [entries])
  return (
    <Section title="Historial" hint="Quién cambió qué y cuándo.">
      <ul className={`${card} divide-y divide-[#E8EDE9]`}>
        {grouped.length === 0 && <li className="p-4 text-sm text-[#5F6761]">Sin cambios todavía.</li>}
        {grouped.map((entry) => (
          <li key={entry.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
            <p><strong>{name(entry.actor)}</strong> {entry.summary}</p>
            <span className="shrink-0 text-xs text-[#66706B]" title={new Date(entry.created_at).toLocaleString('es-AR')}>{timeAgo(entry.created_at)}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export type TableProps = {
  eventId: string
  rows: GestionRow[]
  users: TeamUser[]
  canEdit: boolean
  onRowsChange: (u: (rows: GestionRow[]) => GestionRow[]) => void
  onSaveState: (s: SaveState) => void
}

export type { RowKind }
