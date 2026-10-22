'use client'

import { useEffect, useState } from 'react'
import { Link2, Search, X } from 'lucide-react'

import { EVENT_TYPES, type EventType, type GestionEvent, type TeamUser } from '@/lib/gestion/schema'
import { api } from '../../_components/api'
import { SectionTable } from '../../_components/SectionTable'
import { card, input, label } from '../../_components/ui'
import { Section, type PasitoEventLite, type SessionUser, type TableProps } from './EventClient'

type Field = { key: keyof GestionEvent; label: string; type?: 'text' | 'date' | 'number' | 'textarea' | 'url'; placeholder?: string; wide?: boolean }

const FIELDS: Field[] = [
  { key: 'start_date', label: 'Fecha', type: 'date' },
  { key: 'end_date', label: 'Termina (si dura más de un día)', type: 'date' },
  { key: 'start_time', label: 'Horario', placeholder: '19 a 23 h' },
  { key: 'capacity', label: 'Cupo / capacidad', type: 'number' },
  { key: 'venue', label: 'Lugar', placeholder: 'Nombre del venue' },
  { key: 'city', label: 'Ciudad / barrio' },
  { key: 'drive_url', label: 'Carpeta de Drive', type: 'url', placeholder: 'https://drive.google.com/…', wide: true },
  { key: 'objective', label: 'Objetivo del evento', type: 'textarea', wide: true },
  { key: 'notes', label: 'Notas', type: 'textarea', wide: true },
]

export function FichaTab({ event, users, user, canEdit, tableProps, pasitoEvents, onUpdate, onReload }: {
  event: GestionEvent
  users: TeamUser[]
  user: SessionUser
  canEdit: boolean
  tableProps: TableProps
  pasitoEvents: PasitoEventLite[]
  onUpdate: (fields: Partial<GestionEvent>) => Promise<boolean>
  onReload: () => void
}) {
  return (
    <div className="space-y-8">
      <Section title="Datos generales">
        <div className={`${card} grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4`}>
          <label className="space-y-1.5">
            <span className={label}>Tipo</span>
            <select className={input} value={event.type} disabled={!canEdit} onChange={(e) => onUpdate({ type: e.target.value as EventType })}>
              {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className={label}>Responsable</span>
            <select className={input} value={event.owner_email ?? ''} disabled={!canEdit} onChange={(e) => onUpdate({ owner_email: e.target.value || null })}>
              <option value="">Sin responsable</option>
              {users.map((u) => <option key={u.email} value={u.email}>{u.name || u.email}</option>)}
            </select>
          </label>
          {FIELDS.map((field) => <FichaField key={`${field.key}-${event.updated_at}`} field={field} event={event} disabled={!canEdit} onUpdate={onUpdate} />)}
        </div>
      </Section>

      <Section title="Objetivos (KPIs)" hint="La asistencia real se completa sola al cerrar la puerta.">
        <SectionTable {...tableProps} kind="kpi" />
      </Section>

      <Section title="Permisos" hint="Con el evento confirmado, un permiso pendiente a 10 días se pone en rojo.">
        <SectionTable {...tableProps} kind="permit" defaults={{ estado: 'pendiente' }} />
      </Section>

      <Section title="Contactos">
        <SectionTable {...tableProps} kind="contact" />
      </Section>

      <Section title="Evento en la app Pasito" hint="Vinculalo para traer a la lista quienes se anotaron o canjearon su entrada.">
        <PasitoLink event={event} linked={pasitoEvents} disabled={!canEdit} onUpdate={async (ids) => { if (await onUpdate({ pasito_event_ids: ids })) onReload() }} />
      </Section>

      <Section title="Puerta">
        <div className={`${card} space-y-3 p-4`}>
          <Toggle checked={event.door_allow_walkins} disabled={!canEdit} onChange={(v) => onUpdate({ door_allow_walkins: v })} label="Permitir altas en la puerta" hint="Si alguien no está en la lista, la puerta lo puede agregar." />
          <Toggle checked={event.door_allow_reentry} disabled={!canEdit} onChange={(v) => onUpdate({ door_allow_reentry: v })} label="Permitir reingresos" hint="Habilita marcar “Salió” y volver a entrar." />
          {!user.phone && <p className="text-xs text-[#806113]">Tip: cargá tu teléfono en Equipo para que la puerta pueda llamarte.</p>}
        </div>
      </Section>
    </div>
  )
}

function FichaField({ field, event, disabled, onUpdate }: { field: Field; event: GestionEvent; disabled: boolean; onUpdate: (f: Partial<GestionEvent>) => Promise<boolean> }) {
  const current = event[field.key]
  const initial = current === null || current === undefined ? '' : String(current)
  const [value, setValue] = useState(initial)
  const commit = (next = value) => {
    if (next === initial) return
    const parsed = field.type === 'number' ? (next ? Number(next) : null) : next.trim() || null
    void onUpdate({ [field.key]: parsed } as Partial<GestionEvent>).then((ok) => !ok && setValue(initial))
  }
  const common = { className: input, disabled, value, placeholder: field.placeholder, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(e.target.value) }
  return (
    <label className={`space-y-1.5 ${field.wide ? 'sm:col-span-2' : ''}`}>
      <span className={label}>{field.label}</span>
      {field.type === 'textarea' ? (
        <textarea {...common} className={`${input} h-24 py-2`} onBlur={() => commit()} />
      ) : field.type === 'date' ? (
        <input {...common} type="date" onChange={(e) => { setValue(e.target.value); commit(e.target.value) }} />
      ) : (
        <input {...common} type={field.type === 'number' ? 'number' : 'text'} inputMode={field.type === 'number' ? 'numeric' : undefined} onBlur={() => commit()} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      )}
    </label>
  )
}

function Toggle({ checked, disabled, onChange, label: text, hint }: { checked: boolean; disabled: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" className="mt-1 size-4 accent-[#0B6B43]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span><span className="block text-sm font-semibold">{text}</span><span className="text-xs text-[#5F6761]">{hint}</span></span>
    </label>
  )
}

function PasitoLink({ event, linked, disabled, onUpdate }: { event: GestionEvent; linked: PasitoEventLite[]; disabled: boolean; onUpdate: (ids: string[]) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<(PasitoEventLite & { city: string | null; partner_name: string | null })[]>([])
  useEffect(() => {
    if (disabled) return
    const timer = setTimeout(() => {
      api<{ events: typeof results }>(`/api/gestion/pasito-events?q=${encodeURIComponent(query)}`, { quiet: true }).then((r) => setResults(r.events)).catch(() => null)
    }, 250)
    return () => clearTimeout(timer)
  }, [query, disabled])

  return (
    <div className={`${card} space-y-3 p-4`}>
      {linked.length === 0 ? <p className="text-sm text-[#5F6761]">Sin eventos vinculados.</p> : (
        <ul className="flex flex-wrap gap-2">
          {linked.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-full border border-[#CFE3D6] bg-[#F2F6F1] py-1 pr-1 pl-3 text-sm">
              <Link2 className="size-3.5 text-[#0B6B43]" />
              <span className="font-semibold">{p.title}</span>
              <span className="text-xs text-[#5F6761]">{new Date(p.start_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} · {p.participant_count ?? 0}{p.max_participants ? `/${p.max_participants}` : ''}</span>
              {!disabled && <button className="grid size-6 place-items-center rounded-full hover:bg-white" onClick={() => onUpdate(event.pasito_event_ids.filter((id) => id !== p.id))}><X className="size-3.5" /></button>}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div>
          <div className="relative">
            <Search className="absolute top-2.5 left-3 size-4 text-[#9AA39D]" />
            <input className={`${input} pl-9`} placeholder="Buscar evento de la app…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <ul className="mt-2 max-h-64 divide-y divide-[#E8EDE9] overflow-y-auto">
            {results.filter((r) => !event.pasito_event_ids.includes(r.id)).map((r) => (
              <li key={r.id}>
                <button className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm hover:bg-[#FAFBFA]" onClick={() => onUpdate([...event.pasito_event_ids, r.id])}>
                  <span className="min-w-0"><span className="block truncate font-semibold">{r.title}</span><span className="text-xs text-[#5F6761]">{[r.partner_name, r.city].filter(Boolean).join(' · ')}</span></span>
                  <span className="shrink-0 text-xs text-[#5F6761]">{new Date(r.start_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
