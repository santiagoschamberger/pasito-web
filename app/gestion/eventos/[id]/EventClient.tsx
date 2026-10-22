'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Archive, ArrowLeft, CalendarDays, Check, CloudOff, Copy, DoorOpen, ExternalLink, FileBarChart, FolderOpen, ImagePlus, Loader2, MapPin, Plus } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { daysBetween, effectiveStatus, todayISO } from '@/lib/gestion/summary'
import { formatMoneySafe } from './helpers'
import { api, ApiError } from '../../_components/api'
import { eventEmoji } from '../../_components/EventCard'
import { uploadImage } from '../../_components/ImagePicker'
import { SectionTable, useRowActions, type SaveState } from '../../_components/SectionTable'
import { Avatar, btnSecondary, card, formatDate, input, StatusPill, timeAgo } from '../../_components/ui'
import { SummaryTab } from './SummaryTab'
import { FichaTab } from './FichaTab'
import { AttendeesTab } from './AttendeesTab'

export type PasitoEventLite = { id: string; title: string; start_at: string; max_participants: number | null; participant_count: number | null; photo_url?: string | null }
export type WebSalesLite = { tickets: number; revenue: number; checkedIn: number; refunded: number; capacity: number | null }

type EventPayload = { event: GestionEvent; rows: GestionRow[]; activity: ActivityEntry[]; pasitoEvents: PasitoEventLite[]; web: WebSalesLite }

const TABS: { key: string; label: string; emoji: string }[] = [
  { key: 'resumen', label: 'Resumen', emoji: '📊' },
  { key: 'task', label: 'Tareas', emoji: '✅' },
  { key: 'budget', label: 'Presupuesto', emoji: '💰' },
  { key: 'sponsor', label: 'Sponsors', emoji: '🤝' },
  { key: 'vendor', label: 'Proveedores', emoji: '🚚' },
  { key: 'team', label: 'Equipo', emoji: '👥' },
  { key: 'checklist', label: 'Checklist', emoji: '📋' },
  { key: 'asistentes', label: 'Asistentes', emoji: '🎟️' },
  { key: 'ficha', label: 'Ficha', emoji: '📁' },
  { key: 'historial', label: 'Historial', emoji: '🕓' },
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
  const saveRef = useRef(saveState)
  saveRef.current = saveState

  const load = useCallback(async () => {
    try {
      setData(await api<EventPayload>(`/api/gestion/events/${eventId}`, { quiet: true }))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setNotFound(true)
    }
  }, [eventId])

  useEffect(() => { void load() }, [load])

  // Si otra persona edita el mismo evento, se ve sin recargar (salvo mientras escribís).
  useEffect(() => {
    const timer = setInterval(() => {
      const active = document.activeElement
      const typing = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)
      if (document.visibilityState === 'visible' && saveRef.current === 'idle' && !typing) void load()
    }, 30_000)
    return () => clearInterval(timer)
  }, [load])

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
    let previous: Partial<GestionEvent> = {}
    setData((d) => {
      if (!d) return d
      previous = Object.fromEntries(Object.keys(fields).map((k) => [k, d.event[k as keyof GestionEvent]]))
      return { ...d, event: { ...d.event, ...fields } }
    })
    setSaveState('saving')
    try {
      const result = await api<{ event: GestionEvent }>(`/api/gestion/events/${eventId}`, { method: 'PATCH', body: fields, quiet: true })
      const changed = Object.fromEntries(Object.keys(fields).map((k) => [k, result.event[k as keyof GestionEvent]]))
      setData((d) => (d ? { ...d, event: { ...d.event, ...changed, updated_at: result.event.updated_at } } : d))
      setSaveState('saved')
      setBlockers([])
      return true
    } catch (error) {
      // Se revierten solo los campos de este guardado.
      setData((d) => (d ? { ...d, event: { ...d.event, ...previous } } : d))
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
  const cover = event.cover_url || data.pasitoEvents.find((p) => p.photo_url)?.photo_url || null
  const days = event.start_date ? daysBetween(todayISO(), event.start_date) : null
  const owner = users.find((u) => u.email === event.owner_email)
  const openTasks = rows.filter((r) => r.kind === 'task' && r.data.estado !== 'hecha').length
  const pillButton = 'flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-xs font-semibold hover:bg-white/20'

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

  async function changeCover(file: File | undefined) {
    if (!file) return
    const url = await uploadImage(file)
    if (url) void updateEvent({ cover_url: url })
  }

  return (
    <div className="min-h-dvh">
      <header className="no-print relative overflow-hidden bg-[#00402E] text-white">
        {cover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#00402E] via-[#00402E]/70 to-transparent" />
          </>
        )}
        {!cover && <span className="pointer-events-none absolute -right-2 -bottom-6 text-[150px] leading-none opacity-15">{eventEmoji(event.type)}</span>}
        <div className="relative mx-auto max-w-[1344px] px-4 pt-4 pb-5 sm:px-6 sm:pt-5">
          <div className="flex items-center justify-between gap-2">
            <Link href="/gestion/eventos" className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"><ArrowLeft className="size-4" />Eventos</Link>
            <div className="flex items-center gap-1">
              <SaveIndicator state={saveState} />
              {canEdit && (
                <label className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-white/80 hover:bg-white/10" title="Cambiar portada">
                  <ImagePlus className="size-4" /><span className="hidden sm:inline">Portada</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { void changeCover(e.target.files?.[0]); e.target.value = '' }} />
                </label>
              )}
            </div>
          </div>
          {event.series && <p className="mt-3 px-1 text-xs font-bold tracking-wider text-[#EBFA61] uppercase">{event.series}</p>}
          <input
            key={event.updated_at}
            className={cn('g-display w-full truncate rounded-lg border border-transparent bg-transparent px-1 text-[28px] leading-tight font-extrabold text-white outline-none hover:border-white/20 focus:border-[#EBFA61] sm:text-4xl', !event.series && 'mt-3')}
            defaultValue={event.name}
            disabled={!canEdit}
            onBlur={(e) => e.target.value.trim() && e.target.value !== event.name && updateEvent({ name: e.target.value.trim() })}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-sm text-white/85">
            <span className="flex items-center gap-1.5"><CalendarDays className="size-4" />{event.start_date ? formatDate(event.start_date, { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin fecha'}{event.start_time ? ` · ${event.start_time}` : ''}</span>
            {(event.venue || event.city) && <span className="flex items-center gap-1.5"><MapPin className="size-4" />{[event.venue, event.city].filter(Boolean).join(', ')}</span>}
            {days !== null && status !== 'cerrado' && status !== 'cancelado' && (
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">{days > 1 ? `Faltan ${days} días` : days === 1 ? 'Mañana' : days === 0 ? '¡Hoy!' : `Pasó hace ${-days} días`}</span>
            )}
            {owner && <span className="flex items-center gap-1.5"><Avatar name={owner.name} email={owner.email} size={22} />{owner.name}</span>}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 px-1">
            <StatusPill status={status} />
            <select
              className="h-8 rounded-lg border border-white/25 bg-white/10 px-2 text-xs font-semibold text-white [&>option]:text-[#171D1A]"
              value={event.status}
              disabled={!user.canEdit || (closed && !user.isAdmin)}
              onChange={(e) => updateEvent({ status: e.target.value as EventStatus })}
              title="Cambiar estado"
            >
              {EVENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {event.drive_url ? (
              <a href={event.drive_url} target="_blank" rel="noreferrer" className={pillButton}><FolderOpen className="size-4" />Drive<ExternalLink className="size-3" /></a>
            ) : (
              <button className="flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-white/40 px-2.5 text-xs font-semibold text-white/80" onClick={() => selectTab('ficha')}><FolderOpen className="size-4" />Agregar Drive</button>
            )}
            <span className="ml-auto flex flex-wrap gap-1.5">
              <Link href={`/gestion/puerta/${event.id}`} className="flex h-8 items-center gap-1.5 rounded-lg bg-[#EBFA61] px-3 text-xs font-bold text-[#00402E]"><DoorOpen className="size-4" />Puerta</Link>
              <Link href={`/gestion/eventos/${event.id}/reporte`} className={pillButton}><FileBarChart className="size-4" />Reporte</Link>
              {user.canEdit && <button className={pillButton} onClick={duplicate}><Copy className="size-3.5" />Duplicar</button>}
              {user.canEdit && <button className={pillButton} onClick={archive}><Archive className="size-3.5" />{event.archived_at ? 'Restaurar' : 'Archivar'}</button>}
            </span>
          </div>
        </div>
      </header>

      <nav className="no-print sticky top-0 z-30 border-b border-[#E3E8DF] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1344px] gap-1 overflow-x-auto px-3 sm:px-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => selectTab(t.key)}
              className={cn('flex items-center gap-1.5 border-b-[3px] px-3 py-3 text-sm font-semibold whitespace-nowrap transition', tab === t.key ? 'border-[#006D42] text-[#006D42]' : 'border-transparent text-[#5F6761] hover:text-[#171D1A]')}
            >
              <span className="text-base">{t.emoji}</span>{t.label}
              {t.key === 'task' && openTasks > 0 && <span className="rounded-full bg-[#EDF2EA] px-1.5 text-[11px] font-bold text-[#006D42]">{openTasks}</span>}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1344px] px-4 py-6 pb-24 sm:px-6">
        {blockers.length > 0 && (
          <div className="mb-4 rounded-xl border border-[#F2D6CF] bg-[#FDECE8] p-4 text-sm text-[#B14D3B]">
            <p className="font-bold">Para cerrar el evento falta:</p>
            <ul className="mt-1 list-disc pl-5">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
          </div>
        )}
        {closed && <p className="mb-4 rounded-xl bg-[#E9E9E9] px-4 py-3 text-sm">Evento cerrado: queda en solo lectura.{user.isAdmin ? ' Como admin podés reabrirlo cambiando el estado.' : ''}</p>}

        {tab === 'resumen' && <SummaryTab event={event} rows={rows} users={users} web={data.web} onGoTo={selectTab} />}

        {tab === 'task' && (
          <Section title="Tareas" hint="Una tarea, un responsable. Tocá el círculo para marcarla hecha.">
            {canEdit && <QuickAdd {...tableProps} />}
            <SectionTable {...tableProps} kind="task" defaults={{ estado: 'pendiente', prioridad: 'media' }} />
          </Section>
        )}

        {tab === 'budget' && (
          <Section title="Presupuesto" hint="Montos en pesos, con IVA incluido. Las filas grises se calculan solas: entradas web (Rebill), sponsors confirmados y proveedores.">
            <SectionTable {...tableProps} kind="budget" defaults={{ tipo: 'egreso', estado: 'pendiente' }} extraRows={derivedBudgetRows(rows, data.web)} />
          </Section>
        )}

        {tab === 'sponsor' && (
          <Section title="Sponsors" hint="Tocá el cuadrado para subir el logo. El aporte suma al presupuesto en Confirmado; los canjes no suman a la caja.">
            <SectionTable {...tableProps} kind="sponsor" defaults={{ etapa: 'contacto', contrato: 'no' }} />
          </Section>
        )}

        {tab === 'vendor' && (
          <Section title="Proveedores" hint="Suman solos al presupuesto. La seña y el saldo pagos cuentan como gasto real.">
            <SectionTable {...tableProps} kind="vendor" defaults={{ contrato: 'no' }} />
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

        {tab === 'checklist' && <ChecklistTab {...tableProps} />}

        {tab === 'asistentes' && <AttendeesTab event={event} user={user} pasitoEvents={data.pasitoEvents} onAttendanceToKpi={attendanceToKpi} onGoTo={selectTab} />}

        {tab === 'ficha' && <FichaTab event={event} users={users} user={user} canEdit={canEdit} tableProps={tableProps} pasitoEvents={data.pasitoEvents} onUpdate={updateEvent} onReload={load} />}

        {tab === 'historial' && <HistoryTab eventId={eventId} users={users} initial={data.activity} />}
      </main>
    </div>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving') return <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80"><Loader2 className="size-3.5 animate-spin" />Guardando</span>
  if (state === 'saved') return <span className="flex items-center gap-1 rounded-full bg-[#EBFA61] px-2.5 py-1 text-xs font-bold text-[#00402E]"><Check className="size-3.5" />Guardado</span>
  if (state === 'error') return <span className="flex items-center gap-1 rounded-full bg-[#FDECE8] px-2.5 py-1 text-xs font-bold text-[#B14D3B]"><CloudOff className="size-3.5" />No se guardó</span>
  return null
}

export function Section({ title, hint, children, action }: { title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="g-display text-2xl leading-7 font-bold">{title}</h2>
          {hint && <p className="mt-1 text-sm text-[#5F6761]">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// Escribir y Enter: la forma más rápida de cargar una tarea.
function QuickAdd(props: TableProps) {
  const { add } = useRowActions(props)
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState('')
  const [due, setDue] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const row = await add('task', { titulo: title.trim(), estado: 'pendiente', prioridad: 'media', ...(owner ? { owner } : {}), ...(due ? { due } : {}) })
    if (row) setTitle('')
  }
  return (
    <form onSubmit={submit} className={cn(card, 'mb-3 flex flex-wrap items-center gap-2 p-2')}>
      <Plus className="ml-1 size-5 text-[#006D42]" />
      <input className="h-10 min-w-48 flex-1 bg-transparent text-sm outline-none" placeholder="Nueva tarea… (Enter para agregar)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className={cn(input, 'h-9 w-auto')} value={owner} onChange={(e) => setOwner(e.target.value)}>
        <option value="">Responsable</option>
        {props.users.map((u) => <option key={u.email} value={u.email}>{u.name || u.email}</option>)}
      </select>
      <input type="date" className={cn(input, 'h-9 w-auto')} value={due} onChange={(e) => setDue(e.target.value)} />
    </form>
  )
}

function derivedBudgetRows(rows: GestionRow[], web: WebSalesLite) {
  const stage = (v: unknown) => SPONSOR_STAGES.find((s) => s.value === v)?.label ?? ''
  const tickets = web.tickets || web.revenue
    ? [{
        key: 'web',
        note: 'Entradas vendidas en la web: se actualiza sola con Rebill',
        cells: { tipo: 'Ingreso', categoria: 'Entradas web', concepto: `${web.tickets} entradas (Rebill)`, presupuestado: formatMoneySafe(web.revenue), real: formatMoneySafe(web.revenue), estado: 'Cobrado' },
      }]
    : []
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
  return [...tickets, ...sponsors, ...vendors]
}

function ChecklistTab(props: TableProps) {
  const items = props.rows.filter((r) => r.kind === 'checklist')
  const done = items.filter((r) => r.data.hecho === true).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0
  const phases: { key: string; label: string; emoji: string }[] = [{ key: 'antes', label: 'Antes', emoji: '🛠️' }, { key: 'durante', label: 'Durante', emoji: '🎬' }, { key: 'despues', label: 'Después', emoji: '🧾' }]
  return (
    <Section title="Checklist" hint={`${done} de ${items.length} hechos.`} action={<div className="h-2 w-40 overflow-hidden rounded-full bg-[#E8EDE9]"><div className="h-full rounded-full bg-[#006D42]" style={{ width: `${pct}%` }} /></div>}>
      <div className="space-y-6">
        {phases.map((phase) => {
          const phaseRows = props.rows.filter((r) => r.kind !== 'checklist' || r.data.fase === phase.key || (!r.data.fase && phase.key === 'antes'))
          return (
            <div key={phase.key}>
              <h3 className="mb-2 text-sm font-bold text-[#5F6761] uppercase">{phase.emoji} {phase.label}</h3>
              <SectionTable {...props} rows={phaseRows} kind="checklist" defaults={{ fase: phase.key, hecho: false }} columns={['hecho', 'item', 'owner']} emptyText="Sin ítems." addLabel="Agregar ítem" />
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
  const person = (actor: string) => users.find((u) => u.email === actor)
  const name = (actor: string) => person(actor)?.name || actor.replace(/@.*/, '')
  const list = useMemo(() => entries, [entries])
  return (
    <Section title="Historial" hint="Quién cambió qué y cuándo.">
      <ul className={`${card} divide-y divide-[#EDF1EB]`}>
        {list.length === 0 && <li className="p-4 text-sm text-[#5F6761]">Sin cambios todavía.</li>}
        {list.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3 px-4 py-3 text-sm">
            <Avatar name={person(entry.actor)?.name ?? entry.actor.replace(/^puerta:/, '')} email={entry.actor} size={28} />
            <p className="min-w-0 flex-1"><strong>{name(entry.actor)}</strong> {entry.summary}</p>
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
