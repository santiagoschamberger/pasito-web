'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { DoorOpen, Download, KeyRound, Mail, QrCode, RefreshCw, Ticket, Trash2, Upload, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'

import { ATTENDEE_KINDS, ORIGIN_LABEL, type Attendee, type AttendeeOrigin, type GestionEvent } from '@/lib/gestion/schema'
import { arrivalsBy15Min, attendanceStats } from '@/lib/gestion/summary'
import { mapAttendeeRows, parseCsv } from '@/lib/gestion/csv'
import { api } from '../../_components/api'
import { btnGhost, btnPrimary, btnSecondary, card, Empty, input, label } from '../../_components/ui'
import { Section, type PasitoEventLite, type SessionUser, type WebSalesLite } from './EventClient'

type DoorPin = { id: string; label: string; valid_from: string; valid_until: string; revoked_at: string | null; created_by: string | null }

const SHOW = 200

const when = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

export function AttendeesTab({ event, user, pasitoEvents, onAttendanceToKpi, onGoTo }: {
  event: GestionEvent
  user: SessionUser
  pasitoEvents: PasitoEventLite[]
  onAttendanceToKpi: (inside: number) => void
  onGoTo: (tab: string) => void
}) {
  const [attendees, setAttendees] = useState<Attendee[] | null>(null)
  const [arrivals, setArrivals] = useState<string[]>([])
  const [duplicates, setDuplicates] = useState(0)
  const [web, setWeb] = useState<WebSalesLite | null>(null)
  const [query, setQuery] = useState('')
  const [origin, setOrigin] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [panel, setPanel] = useState<'add' | 'import' | 'pins' | null>(null)
  const [syncing, setSyncing] = useState(false)
  const canEdit = user.canEdit && event.status !== 'cerrado'

  const load = useCallback(async () => {
    const result = await api<{ attendees: Attendee[]; arrivals: string[]; duplicates: number; web: WebSalesLite }>(`/api/gestion/events/${event.id}/attendees`)
    setWeb(result.web)
    setAttendees(result.attendees)
    setArrivals(result.arrivals)
    setDuplicates(result.duplicates)
  }, [event.id])

  useEffect(() => {
    void load().catch(() => setAttendees([]))
    // En vivo mientras la pestaña está abierta.
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load().catch(() => null) }, 20_000)
    return () => clearInterval(timer)
  }, [load])

  const stats = useMemo(() => attendanceStats(attendees ?? []), [attendees])
  const slots = useMemo(() => arrivalsBy15Min(arrivals), [arrivals])
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return (attendees ?? []).filter((a) =>
      (!origin || a.origin === origin) &&
      (!statusFilter || (statusFilter === 'adentro' ? a.status !== 'anotado' : a.status === 'anotado')) &&
      (!q || a.name.toLowerCase().includes(q) || a.email?.includes(q) || a.dni_last3 === q || a.app_code?.toLowerCase() === q))
  }, [attendees, query, origin, statusFilter])

  async function sync() {
    setSyncing(true)
    try {
      const result = await api<{ inserted: number }>(`/api/gestion/events/${event.id}/sync`, { method: 'POST' })
      toast.success(result.inserted ? `${result.inserted} persona(s) nueva(s)` : 'La lista ya estaba al día')
      await load()
    } finally {
      setSyncing(false)
    }
  }

  async function sendQr() {
    // Las entradas web ya recibieron su QR al comprar; los de la app usan su código.
    const targets = (attendees ?? []).filter((a) => a.email && a.status === 'anotado' && a.origin !== 'app' && !a.origin_ref?.startsWith('web:') && !a.qr_sent_at)
    if (!targets.length) return toast('No hay invitados con mail que falten recibir el QR. Las entradas web ya tienen el suyo.')
    if (!window.confirm(`¿Mandar el QR por mail a ${targets.length} persona(s) que todavía no lo recibieron?`)) return
    let sent = 0
    for (let i = 0; i < targets.length; i += 500) {
      const result = await api<{ sent: number }>(`/api/gestion/events/${event.id}/send-qr`, { body: { attendeeIds: targets.slice(i, i + 500).map((a) => a.id) } })
      sent += result.sent
    }
    toast.success(`${sent} mail(s) enviados`)
    void load()
  }

  async function toggleStatus(a: Attendee) {
    const status = a.status === 'anotado' ? 'ingreso' : 'anotado'
    await api(`/api/gestion/attendees/${a.id}`, { method: 'PATCH', body: { status } })
    void load()
  }

  async function remove(a: Attendee) {
    setAttendees((list) => list?.filter((x) => x.id !== a.id) ?? null)
    await api(`/api/gestion/attendees/${a.id}`, { method: 'DELETE' })
    toast('Persona quitada de la lista', { action: { label: 'Deshacer', onClick: () => api(`/api/gestion/attendees/${a.id}`, { method: 'PATCH', body: { restore: true } }).then(load) } })
  }

  const capacity = event.capacity
  const insideTotal = stats.inside + stats.companionsIn
  const showRate = stats.total ? Math.round((stats.inside / stats.total) * 100) : 0
  const maxSlot = Math.max(1, ...slots.map((s) => s.count))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-[14px] lg:grid-cols-4">
        <Stat label="En la lista" value={stats.total.toLocaleString('es-AR')} />
        <Stat label="Adentro" value={`${insideTotal.toLocaleString('es-AR')}${capacity ? ` / ${capacity.toLocaleString('es-AR')}` : ''}`} sub={stats.companionsIn ? `incluye ${stats.companionsIn} acompañante(s)` : undefined} tone={capacity && insideTotal >= capacity * 0.9 ? 'warn' : undefined} />
        <Stat label="Presentismo" value={`${showRate}%`} sub="llegaron / anotados" />
        <Stat label="Duplicados para revisar" value={String(duplicates)} sub="mismo QR en dos puertas" tone={duplicates ? 'warn' : undefined} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/gestion/puerta/${event.id}`} className={btnPrimary}><DoorOpen className="size-4" />Modo puerta</Link>
        {canEdit && <button className={btnSecondary} onClick={sync} disabled={syncing}><RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />Sincronizar</button>}
        {canEdit && <button className={btnSecondary} onClick={() => setPanel(panel === 'add' ? null : 'add')}><UserPlus className="size-4" />Agregar</button>}
        {canEdit && <button className={btnSecondary} onClick={() => setPanel(panel === 'import' ? null : 'import')}><Upload className="size-4" />Importar CSV</button>}
        {canEdit && <button className={btnSecondary} onClick={sendQr}><Mail className="size-4" />Mandar QR por mail</button>}
        {canEdit && <button className={btnSecondary} onClick={() => setPanel(panel === 'pins' ? null : 'pins')}><KeyRound className="size-4" />PIN de puerta</button>}
        {user.isAdmin && <a className={btnGhost} href={`/api/gestion/events/${event.id}/export`}><Download className="size-4" />Exportar</a>}
        {canEdit && stats.inside > 0 && <button className={btnGhost} onClick={() => onAttendanceToKpi(insideTotal)}>Cargar asistencia en Objetivos</button>}
      </div>

      {web && (web.tickets > 0 || (event.web_tiers ?? []).length > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#CFE3D6] bg-[#F2F6F1] px-4 py-3 text-sm">
          <Ticket className="size-5 text-[#006D42]" />
          <span><strong>{web.tickets}</strong> entradas web vendidas{web.refunded ? ` · ${web.refunded} reembolsadas` : ''} · se suman solas a la lista (Rebill). En la puerta se escanea el mismo QR que les llegó al comprar.</span>
        </div>
      )}
      {pasitoEvents.length === 0 && !(event.web_tiers ?? []).length && (
        <button onClick={() => onGoTo('ficha')} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[#C3CCC5] bg-white px-4 py-3 text-left text-sm text-[#5F6761] hover:border-[#006D42]">
          <Ticket className="size-5 text-[#006D42]" />
          <span><strong className="text-[#171D1A]">Conectá las entradas.</strong> En la Ficha vinculá la tanda de entradas web o el evento de la app y la lista se arma sola.</span>
        </button>
      )}

      {panel === 'add' && <AddForm eventId={event.id} onDone={() => { setPanel(null); void load() }} />}
      {panel === 'import' && <ImportForm eventId={event.id} onDone={() => { setPanel(null); void load() }} />}
      {panel === 'pins' && <PinsPanel eventId={event.id} />}

      {(slots.length > 0 || stats.byOrigin.length > 0) && (
        <div className="grid gap-[18px] lg:grid-cols-3">
          <section className={`${card} p-4 lg:col-span-2`}>
            <h3 className="mb-3 font-bold">Ingresos cada 15 minutos</h3>
            {slots.length === 0 ? <p className="text-sm text-[#5F6761]">Todavía no hay ingresos.</p> : (
              <div className="flex h-32 items-end gap-1 overflow-x-auto">
                {slots.map((s) => (
                  <div key={s.slot} className="flex min-w-7 flex-1 flex-col items-center gap-1" title={`${s.slot}: ${s.count}`}>
                    <span className="text-[10px] text-[#5F6761]">{s.count}</span>
                    <div className="w-full rounded-t bg-[#006D42]" style={{ height: `${(s.count / maxSlot) * 90}px` }} />
                    <span className="text-[10px] text-[#5F6761]">{s.slot}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className={`${card} p-4`}>
            <h3 className="mb-3 font-bold">Por origen</h3>
            <ul className="space-y-2 text-sm">
              {stats.byOrigin.map((o) => (
                <li key={o.origin} className="flex justify-between">
                  <span>{ORIGIN_LABEL[o.origin as AttendeeOrigin] ?? o.origin}</span>
                  <span className="tabular-nums"><strong>{o.inside}</strong> / {o.total} · {o.total ? Math.round((o.inside / o.total) * 100) : 0}%</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <Section title="Lista" hint="La puerta solo ve nombre, tipo, acompañantes y notas. Nada de mails ni teléfonos.">
        <div className="mb-3 flex flex-wrap gap-2">
          <input className={`${input} max-w-xs`} placeholder="Buscar nombre, mail, DNI, código…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className={`${input} max-w-44`} value={origin} onChange={(e) => setOrigin(e.target.value)}>
            <option value="">Todos los orígenes</option>
            {Object.entries(ORIGIN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={`${input} max-w-36`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value="adentro">Ingresaron</option>
            <option value="anotado">No ingresaron</option>
          </select>
        </div>
        {!attendees ? <p className="text-sm text-[#5F6761]">Cargando…</p> : filtered.length === 0 ? <Empty>No hay personas{attendees.length ? ' con ese filtro' : ' en la lista todavía'}.</Empty> : (
          <div className="overflow-x-auto rounded-lg border border-[#DDE6DF] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8EDE9] bg-[#F8FAF8] text-left text-xs text-[#66706B]">
                  <th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Origen</th><th className="px-3 py-2">+</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Contacto</th><th className="px-3 py-2">Notas</th><th />
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, SHOW).map((a) => (
                  <tr key={a.id} className="border-b border-[#E8EDE9] last:border-0">
                    <td className="px-3 py-2 font-semibold">{a.name}{a.dni_last3 && <span className="ml-1 text-xs font-normal text-[#5F6761]">DNI …{a.dni_last3}</span>}</td>
                    <td className="px-3 py-2">{ATTENDEE_KINDS.find((k) => k.value === a.kind)?.label}</td>
                    <td className="px-3 py-2 text-[#5F6761]">{ORIGIN_LABEL[a.origin]}</td>
                    <td className="px-3 py-2 tabular-nums">{a.companions ? `${a.companions_in}/${a.companions}` : ''}</td>
                    <td className="px-3 py-2">
                      <button disabled={!canEdit} onClick={() => toggleStatus(a)} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.status === 'anotado' ? 'bg-[#F8FAF8] text-[#5F6761]' : 'bg-[#F2F6F1] text-[#006D42]'}`} title="Corregir estado">
                        {a.status === 'anotado' ? 'Anotado' : `Ingresó ${a.checked_in_at ? new Date(a.checked_in_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}`}
                      </button>
                    </td>
                    <td className="max-w-48 truncate px-3 py-2 text-[#5F6761]">{a.email || a.phone || ''}</td>
                    <td className="max-w-56 truncate px-3 py-2 text-[#5F6761]">{a.notes || ''}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <a href={`/gestion/entrada/${a.qr_token}`} target="_blank" rel="noreferrer" className="inline-grid size-8 place-items-center text-[#5F6761] hover:text-[#006D42]" title="Ver QR"><QrCode className="size-4" /></a>
                      {canEdit && <button onClick={() => remove(a)} className="inline-grid size-8 place-items-center text-[#9AA39D] hover:text-[#B14D3B]" title="Quitar"><Trash2 className="size-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > SHOW && <p className="border-t border-[#E8EDE9] px-3 py-2 text-xs text-[#5F6761]">Mostrando {SHOW} de {filtered.length}. Usá el buscador.</p>}
          </div>
        )}
      </Section>
    </div>
  )
}

function Stat({ label: text, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'warn' }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-[13px] font-semibold text-[#66706B]">{text}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tone === 'warn' ? 'text-[#806113]' : ''}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#5F6761]">{sub}</p>}
    </div>
  )
}

function AddForm({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', dni_last3: '', kind: 'invitado', companions: '0', notes: '' })
  const [saving, setSaving] = useState(false)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value })
  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api(`/api/gestion/events/${eventId}/attendees`, { body: { attendees: [{ ...form, origin: 'invitado' }], origin: 'invitado' } })
      toast.success(`${form.name} agregado/a`)
      onDone()
    } finally {
      setSaving(false)
    }
  }
  return (
    <form onSubmit={submit} className={`${card} grid gap-3 p-4 sm:grid-cols-4`}>
      <label className="space-y-1 sm:col-span-2"><span className={label}>Nombre y apellido</span><input className={input} required value={form.name} onChange={set('name')} /></label>
      <label className="space-y-1"><span className={label}>Tipo</span><select className={input} value={form.kind} onChange={set('kind')}>{ATTENDEE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
      <label className="space-y-1"><span className={label}>Acompañantes</span><input className={input} type="number" min={0} max={20} value={form.companions} onChange={set('companions')} /></label>
      <label className="space-y-1"><span className={label}>Email (para mandar el QR)</span><input className={input} type="email" value={form.email} onChange={set('email')} /></label>
      <label className="space-y-1"><span className={label}>Teléfono</span><input className={input} value={form.phone} onChange={set('phone')} /></label>
      <label className="space-y-1"><span className={label}>Últimos 3 del DNI</span><input className={input} inputMode="numeric" maxLength={3} value={form.dni_last3} onChange={set('dni_last3')} /></label>
      <label className="space-y-1"><span className={label}>Notas</span><input className={input} placeholder="Acceso backstage…" value={form.notes} onChange={set('notes')} /></label>
      <div className="flex justify-end gap-2 sm:col-span-4"><button type="button" className={btnSecondary} onClick={onDone}>Cancelar</button><button className={btnPrimary} disabled={saving}>Agregar</button></div>
    </form>
  )
}

function ImportForm({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [text, setText] = useState('')
  const [origin, setOrigin] = useState<'ticketera' | 'invitado'>('ticketera')
  const [saving, setSaving] = useState(false)
  const parsed = useMemo(() => (text.trim() ? mapAttendeeRows(parseCsv(text)) : null), [text])

  async function onFile(file: File | undefined) {
    if (file) setText(await file.text())
  }
  async function submit() {
    if (!parsed?.items.length) return
    setSaving(true)
    try {
      const result = await api<{ inserted: unknown[]; skipped: number }>(`/api/gestion/events/${eventId}/attendees`, { body: { attendees: parsed.items.map((i) => ({ ...i, origin })), origin } })
      toast.success(`${result.inserted.length} cargadas${result.skipped ? `, ${result.skipped} ya estaban` : ''}`)
      onDone()
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className={`${card} space-y-3 p-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" accept=".csv,.tsv,.txt" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
        <select className={`${input} max-w-44`} value={origin} onChange={(e) => setOrigin(e.target.value as 'ticketera' | 'invitado')}>
          <option value="ticketera">Origen: Ticketera</option>
          <option value="invitado">Origen: Invitados</option>
        </select>
      </div>
      <textarea className={`${input} h-32 py-2 font-mono text-xs`} placeholder={'O pegá acá desde la planilla:\nNombre,Apellido,Email,DNI,Ticket\nAna,Pérez,ana@mail.com,30123456,A-001'} value={text} onChange={(e) => setText(e.target.value)} />
      {parsed && (
        <div className="text-sm">
          <p><strong>{parsed.items.length}</strong> persona(s) detectadas. {Object.keys(parsed.columns).length > 0 && <span className="text-[#5F6761]">Columnas: {Object.entries(parsed.columns).map(([k, v]) => `${v} → ${k}`).join(', ')}</span>}</p>
          <p className="text-xs text-[#5F6761]">Si una fila trae n° de ticket, no se duplica al volver a importar. Del DNI guardamos solo los últimos 3 dígitos.</p>
          {parsed.items.slice(0, 3).map((i, n) => <p key={n} className="text-xs text-[#5F6761]">· {i.name}{i.email ? ` · ${i.email}` : ''}{i.origin_ref ? ` · #${i.origin_ref}` : ''}</p>)}
        </div>
      )}
      <div className="flex justify-end gap-2"><button className={btnSecondary} onClick={onDone}>Cancelar</button><button className={btnPrimary} disabled={!parsed?.items.length || saving} onClick={submit}>Importar</button></div>
    </div>
  )
}

function PinsPanel({ eventId }: { eventId: string }) {
  const [pins, setPins] = useState<DoorPin[]>([])
  const [newPin, setNewPin] = useState<{ pin: string; label: string; from: string; until: string } | null>(null)
  const [pinLabel, setPinLabel] = useState('')
  const load = useCallback(() => api<{ pins: DoorPin[] }>(`/api/gestion/events/${eventId}/door-pins`).then((r) => setPins(r.pins)).catch(() => null), [eventId])
  useEffect(() => { void load() }, [load])
  async function create(e: FormEvent) {
    e.preventDefault()
    const result = await api<{ pin: string; record: DoorPin }>(`/api/gestion/events/${eventId}/door-pins`, { body: { label: pinLabel || 'Puerta' } })
    setNewPin({ pin: result.pin, label: result.record.label, from: result.record.valid_from, until: result.record.valid_until })
    setPinLabel('')
    void load()
  }
  async function revoke(id: string) {
    if (!window.confirm('¿Revocar el PIN? El celular que lo use deja de funcionar al sincronizar.')) return
    await api(`/api/gestion/door-pins/${id}`, { method: 'DELETE' })
    void load()
  }
  const link = typeof window !== 'undefined' ? `${window.location.origin}/gestion/puerta/${eventId}` : ''
  const active = pins.filter((p) => !p.revoked_at && Date.parse(p.valid_until) > Date.now())
  return (
    <div className={`${card} space-y-4 p-4`}>
      <p className="text-sm text-[#5F6761]">El staff externo entra con el link y un PIN de 6 dígitos. Ve solo la lista para el ingreso. Conviene un PIN por persona para saber quién escaneó.</p>
      <div className="flex items-center gap-2 rounded-md bg-[#F8FAF8] p-2 text-sm">
        <span className="min-w-0 flex-1 truncate font-mono">{link}</span>
        <button className={`${btnSecondary} h-8`} onClick={() => navigator.clipboard.writeText(link).then(() => toast.success('Link copiado'))}>Copiar</button>
      </div>
      {newPin && (
        <div className="rounded-md border border-[#CFE3D6] bg-[#F2F6F1] p-3">
          <div className="flex items-start justify-between">
            <p className="text-sm">PIN para <strong>{newPin.label}</strong> (anotalo, no se vuelve a mostrar):</p>
            <button onClick={() => setNewPin(null)}><X className="size-4" /></button>
          </div>
          <p className="mt-1 font-mono text-3xl font-extrabold tracking-[0.3em] text-[#006D42]">{newPin.pin}</p>
          <p className="mt-1 text-xs text-[#5F6761]">Válido {when(newPin.from)} → {when(newPin.until)}</p>
        </div>
      )}
      <form onSubmit={create} className="flex gap-2">
        <input className={input} placeholder="Para quién (ej: Puerta 1 – Juan)" value={pinLabel} onChange={(e) => setPinLabel(e.target.value)} />
        <button className={btnPrimary}>Crear PIN</button>
      </form>
      {active.length > 0 && (
        <ul className="divide-y divide-[#E8EDE9] text-sm">
          {active.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span><strong>{p.label}</strong> <span className="text-xs text-[#5F6761]">{when(p.valid_from)} → {when(p.valid_until)}</span></span>
              <button className="text-sm font-semibold text-[#B14D3B]" onClick={() => revoke(p.id)}>Revocar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
