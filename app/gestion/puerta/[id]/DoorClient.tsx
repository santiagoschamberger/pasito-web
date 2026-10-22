'use client'

import type { IScannerControls } from '@zxing/browser'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CameraOff, LogOut, Phone, Search, UserPlus, Wifi, WifiOff } from 'lucide-react'

type DoorAttendee = {
  id: string
  name: string
  kind: string
  origin: string
  companions: number
  companions_in: number
  notes: string | null
  qr_token: string
  app_code: string | null
  dni_last3: string | null
  status: 'anotado' | 'ingreso' | 'salio'
  checked_in_at: string | null
  checked_in_device: string | null
  updated_at: string
  deleted_at?: string | null
}

type DoorEvent = { id: string; name: string; capacity: number | null; allowWalkins: boolean; allowReentry: boolean; ownerName: string | null; ownerPhone: string | null }
type Snapshot = { event: DoorEvent; attendees: DoorAttendee[]; syncedAt: string; operator: string }
type Pending = { id: string; attendee_id: string; action: 'ingreso' | 'salida' | 'acompanante'; scanned_at: string }

type Result =
  | { tone: 'ok'; title: string; attendee: DoorAttendee }
  | { tone: 'warn'; title: string; attendee: DoorAttendee; detail: string }
  | { tone: 'bad'; title: string; detail: string; canAdd?: boolean; attendee?: DoorAttendee }

const KIND_LABEL: Record<string, string> = { general: 'General', invitado: 'Invitado', prensa: 'Prensa', sponsor: 'Sponsor', staff: 'Staff' }
const hhmm = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '')
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function uuid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })
}

function storage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin espacio: la cola sigue en memoria.
  }
}

function beep(ok: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    osc.frequency.value = ok ? 880 : 220
    osc.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.35))
  } catch {
    // Sin audio no pasa nada.
  }
  navigator.vibrate?.(ok ? 120 : [120, 80, 120, 80, 120])
}

// Del QR puede venir el token pelado o el link a /gestion/entrada/<token>.
function extractToken(raw: string) {
  const value = raw.trim()
  const match = value.match(/\/entrada\/([A-Za-z0-9_-]+)/)
  return match ? match[1] : value
}

export function DoorClient({ eventId }: { eventId: string }) {
  const listKey = `gestion-door:${eventId}`
  const queueKey = `gestion-door-queue:${eventId}`
  const [phase, setPhase] = useState<'loading' | 'pin' | 'ready'>('loading')
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [queue, setQueue] = useState<Pending[]>([])
  const [online, setOnline] = useState(true)
  const [duplicates, setDuplicates] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [query, setQuery] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [revoked, setRevoked] = useState(false)
  const [walkin, setWalkin] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const lastScan = useRef<{ value: string; at: number }>({ value: '', at: 0 })
  const resultRef = useRef<Result | null>(null)
  const snapshotRef = useRef<Snapshot | null>(null)
  const queueRef = useRef<Pending[]>([])
  const syncing = useRef(false)

  resultRef.current = result
  snapshotRef.current = snapshot
  queueRef.current = queue

  const persist = useCallback((next: Snapshot) => {
    setSnapshot(next)
    snapshotRef.current = next
    save(listKey, next)
  }, [listKey])

  const enqueue = useCallback((item: Pending) => {
    const next = [...queueRef.current, item]
    queueRef.current = next
    setQueue(next)
    save(queueKey, next)
  }, [queueKey])

  const loadList = useCallback(async () => {
    const response = await fetch(`/api/gestion/door/${eventId}/list`, { cache: 'no-store' })
    if (response.status === 401) return false
    if (!response.ok) throw new Error('list')
    const data = (await response.json()) as Snapshot
    // Aplica encima lo que todavía no se sincronizó.
    const pendingIds = new Map(queueRef.current.filter((q) => q.action === 'ingreso').map((q) => [q.attendee_id, q.scanned_at]))
    data.attendees = data.attendees.map((a) => (pendingIds.has(a.id) && a.status === 'anotado' ? { ...a, status: 'ingreso', checked_in_at: pendingIds.get(a.id)! } : a))
    persist(data)
    return true
  }, [eventId, persist])

  useEffect(() => {
    setQueue(storage<Pending[]>(queueKey, []))
    queueRef.current = storage<Pending[]>(queueKey, [])
    const cached = storage<Snapshot | null>(listKey, null)
    if (cached) {
      setSnapshot(cached)
      snapshotRef.current = cached
    }
    loadList()
      .then((ok) => setPhase(ok ? 'ready' : 'pin'))
      .catch(() => {
        setOnline(false)
        setPhase(cached ? 'ready' : 'pin')
      })
    return () => controlsRef.current?.stop()
  }, [listKey, queueKey, loadList])

  // Sincronización cada 5 segundos: sube la cola y baja cambios de las otras puertas.
  const sync = useCallback(async (lookup?: string) => {
    const snap = snapshotRef.current
    if (!snap || syncing.current) return null
    syncing.current = true
    const sending = queueRef.current.slice(0, 200)
    try {
      const response = await fetch(`/api/gestion/door/${eventId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkins: sending, since: snap.syncedAt, lookup }),
      })
      if (response.status === 401) {
        setRevoked(true)
        return null
      }
      if (!response.ok) throw new Error('sync')
      const data = (await response.json()) as { results: { id: string; status: string }[]; changes: DoorAttendee[]; syncedAt: string; lookup: { eventName: string } | null }
      setOnline(true)
      const done = new Set(data.results.map((r) => r.id))
      setDuplicates((d) => d + data.results.filter((r) => r.status === 'duplicate').length)
      const remaining = queueRef.current.filter((q) => !done.has(q.id))
      queueRef.current = remaining
      setQueue(remaining)
      save(queueKey, remaining)
      const current = snapshotRef.current ?? snap
      const byId = new Map(current.attendees.map((a) => [a.id, a]))
      for (const change of data.changes) {
        if (change.deleted_at) byId.delete(change.id)
        else byId.set(change.id, change)
      }
      persist({ ...current, attendees: [...byId.values()], syncedAt: data.syncedAt })
      return data.lookup
    } catch {
      setOnline(false)
      return null
    } finally {
      syncing.current = false
    }
  }, [eventId, persist, queueKey])

  useEffect(() => {
    if (phase !== 'ready') return
    const timer = setInterval(() => void sync(), 5000)
    const onOnline = () => void sync()
    window.addEventListener('online', onOnline)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', onOnline)
    }
  }, [phase, sync])

  const index = useMemo(() => {
    const map = new Map<string, DoorAttendee>()
    for (const a of snapshot?.attendees ?? []) {
      map.set(a.qr_token, a)
      if (a.app_code) map.set(a.app_code.trim().toUpperCase(), a)
    }
    return map
  }, [snapshot])

  const inside = useMemo(() => (snapshot?.attendees ?? []).reduce((sum, a) => sum + (a.status === 'ingreso' ? 1 : 0) + a.companions_in, 0), [snapshot])
  const capacity = snapshot?.event.capacity ?? null
  const full = capacity !== null && inside >= capacity
  const nearFull = capacity !== null && inside >= capacity * 0.9

  const updateLocal = useCallback((id: string, patch: Partial<DoorAttendee>) => {
    const snap = snapshotRef.current
    if (!snap) return
    persist({ ...snap, attendees: snap.attendees.map((a) => (a.id === id ? { ...a, ...patch } : a)) })
  }, [persist])

  const admit = useCallback((attendee: DoorAttendee, force = false) => {
    if (full && !force) {
      setResult({ tone: 'bad', title: 'Cupo lleno', detail: `${inside} de ${capacity} adentro.`, attendee })
      beep(false)
      return
    }
    const now = new Date().toISOString()
    updateLocal(attendee.id, { status: 'ingreso', checked_in_at: attendee.checked_in_at ?? now })
    enqueue({ id: uuid(), attendee_id: attendee.id, action: 'ingreso', scanned_at: now })
    setResult({ tone: 'ok', title: 'Puede pasar', attendee: { ...attendee, status: 'ingreso' } })
    beep(true)
    void sync()
  }, [capacity, enqueue, full, inside, sync, updateLocal])

  const evaluate = useCallback((attendee: DoorAttendee) => {
    if (attendee.status === 'ingreso') {
      setResult({ tone: 'warn', title: 'Ya ingresó', attendee, detail: `A las ${hhmm(attendee.checked_in_at)}${attendee.checked_in_device ? ` · ${attendee.checked_in_device === 'equipo' ? 'equipo' : 'otra puerta'}` : ''}. Puede ser una entrada compartida: decidí vos.` })
      beep(false)
      return
    }
    admit(attendee)
  }, [admit])

  const handleScan = useCallback(async (raw: string) => {
    const value = extractToken(raw)
    const now = Date.now()
    if (resultRef.current || (value === lastScan.current.value && now - lastScan.current.at < 4000)) return
    lastScan.current = { value, at: now }
    const attendee = index.get(value) ?? index.get(value.toUpperCase())
    if (attendee) return evaluate(attendee)
    beep(false)
    const snap = snapshotRef.current
    setResult({ tone: 'bad', title: 'No está en la lista', detail: 'Buscalo por nombre o DNI por si el QR falló.', canAdd: snap?.event.allowWalkins })
    const lookup = await sync(value)
    if (lookup) setResult({ tone: 'bad', title: 'Es de otro evento', detail: `Esta entrada es para “${lookup.eventName}”.` })
  }, [evaluate, index, sync])

  // El lector queda abierto: su callback tiene que usar siempre el índice actual.
  const handleScanRef = useRef(handleScan)
  handleScanRef.current = handleScan

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 })
      controlsRef.current?.stop()
      controlsRef.current = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: 'environment' } } },
        videoRef.current ?? undefined,
        (decoded) => { if (decoded) void handleScanRef.current(decoded.getText()) },
      )
      setCameraOn(true)
    } catch {
      setCameraError('No pudimos abrir la cámara. Dale permiso o buscá por nombre.')
      setCameraOn(false)
    }
  }, [])

  function stopCamera() {
    controlsRef.current?.stop()
    controlsRef.current = null
    setCameraOn(false)
  }

  function dismiss() {
    setResult(null)
    lastScan.current = { value: '', at: Date.now() }
  }

  useEffect(() => {
    if (result?.tone !== 'ok') return
    const timer = setTimeout(dismiss, 2200)
    return () => clearTimeout(timer)
  }, [result])

  function companionIn(attendee: DoorAttendee) {
    if (attendee.companions_in >= attendee.companions) return
    updateLocal(attendee.id, { companions_in: attendee.companions_in + 1 })
    enqueue({ id: uuid(), attendee_id: attendee.id, action: 'acompanante', scanned_at: new Date().toISOString() })
    setResult((r) => (r && 'attendee' in r && r.attendee ? { ...r, attendee: { ...r.attendee, companions_in: r.attendee.companions_in + 1 } } as Result : r))
    beep(true)
  }

  function checkout(attendee: DoorAttendee) {
    updateLocal(attendee.id, { status: 'salio' })
    enqueue({ id: uuid(), attendee_id: attendee.id, action: 'salida', scanned_at: new Date().toISOString() })
  }

  async function addWalkin(e: FormEvent) {
    e.preventDefault()
    if (!walkin?.trim()) return
    const response = await fetch(`/api/gestion/door/${eventId}/walkin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: walkin }) })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      alert(data.error || 'No se pudo dar de alta. ¿Hay señal?')
      return
    }
    setWalkin(null)
    setResult(null)
    await loadList()
    beep(true)
  }

  async function logout() {
    await fetch(`/api/gestion/door/${eventId}/session`, { method: 'DELETE' }).catch(() => null)
    stopCamera()
    setPhase('pin')
  }

  const matches = useMemo(() => {
    const q = norm(query.trim())
    if (q.length < 2) return []
    return (snapshot?.attendees ?? [])
      .filter((a) => norm(a.name).includes(q) || a.dni_last3 === q || a.app_code?.toLowerCase() === q)
      .slice(0, 30)
  }, [query, snapshot])

  if (phase === 'loading') return <div className="grid min-h-dvh place-items-center bg-[#0E1411] text-white">Cargando lista…</div>
  if (phase === 'pin') return <PinForm eventId={eventId} onDone={() => loadList().then((ok) => ok && setPhase('ready'))} />
  if (!snapshot) return null

  const tone = result?.tone
  return (
    <div className="min-h-dvh bg-[#0E1411] text-white select-none">
      <header className="sticky top-0 z-20 bg-[#0E1411]/95 px-4 pt-3 pb-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm text-white/70">{snapshot.event.name}</p>
          <div className="flex items-center gap-3 text-xs">
            {online ? <Wifi className="size-4 text-[#7BE0A9]" /> : <WifiOff className="size-4 text-[#FFB4A3]" />}
            <button onClick={logout} title="Salir"><LogOut className="size-4 text-white/60" /></button>
          </div>
        </div>
        <p className="mt-1 text-4xl font-black tabular-nums">{inside}{capacity ? <span className="text-white/50"> / {capacity}</span> : null} <span className="text-base font-semibold text-white/60">adentro</span></p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs">
          {queue.length > 0 && <span className="rounded-full bg-[#806113] px-2 py-0.5 font-semibold">{queue.length} ingreso(s) sin sincronizar</span>}
          {duplicates > 0 && <span className="rounded-full bg-white/15 px-2 py-0.5">{duplicates} duplicado(s) para revisar</span>}
          {revoked && <span className="rounded-full bg-[#B14D3B] px-2 py-0.5 font-semibold">PIN revocado o vencido</span>}
        </div>
        {nearFull && <p className="mt-2 rounded-md bg-[#C49A2D] px-3 py-2 text-sm font-bold text-black">{full ? 'Cupo lleno' : `Atención: ${Math.round((inside / capacity!) * 100)}% del cupo`}</p>}
      </header>

      <main className="space-y-4 px-4 pb-10">
        <div className={`relative overflow-hidden rounded-2xl bg-black ${cameraOn ? 'aspect-square' : 'h-0'}`}>
          <video ref={videoRef} className="size-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/70" />
        </div>
        <button onClick={cameraOn ? stopCamera : startCamera} className={`flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-xl font-black ${cameraOn ? 'bg-white/10' : 'bg-[#EBFA61] text-black'}`}>
          {cameraOn ? <><CameraOff className="size-6" />Pausar cámara</> : <><Camera className="size-6" />Escanear</>}
        </button>
        {cameraError && <p className="text-sm text-[#FFB4A3]">{cameraError}</p>}

        <div className="relative">
          <Search className="absolute top-4 left-4 size-5 text-white/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre, DNI (3 últimos) o código" className="h-14 w-full rounded-2xl bg-white/10 pr-4 pl-12 text-lg outline-none placeholder:text-white/40 focus:ring-2 focus:ring-[#EBFA61]" />
        </div>
        {matches.length > 0 && (
          <ul className="divide-y divide-white/10 rounded-2xl bg-white/5">
            {matches.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{a.name}</p>
                  <p className="truncate text-sm text-white/60">{KIND_LABEL[a.kind] ?? a.kind}{a.companions ? ` · +${a.companions}` : ''}{a.dni_last3 ? ` · DNI …${a.dni_last3}` : ''}{a.notes ? ` · ${a.notes}` : ''}</p>
                </div>
                {a.status === 'ingreso' ? (
                  snapshot.event.allowReentry
                    ? <button onClick={() => checkout(a)} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">Salió</button>
                    : <span className="text-sm font-semibold text-[#EBFA61]">Ingresó {hhmm(a.checked_in_at)}</span>
                ) : (
                  <button onClick={() => { setQuery(''); evaluate(a) }} className="rounded-xl bg-[#0B6B43] px-4 py-2 font-bold">Ingresar</button>
                )}
              </li>
            ))}
          </ul>
        )}
        {query.trim().length >= 2 && matches.length === 0 && (
          <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/70">
            Nadie con “{query}”.
            {snapshot.event.allowWalkins && <button onClick={() => setWalkin(query)} className="mt-2 flex items-center gap-2 font-bold text-[#EBFA61]"><UserPlus className="size-4" />Dar de alta</button>}
          </div>
        )}
        <p className="pt-4 text-center text-xs text-white/40">{snapshot.attendees.length} en la lista · operador: {snapshot.operator} · funciona sin señal y sincroniza solo</p>
      </main>

      {result && (
        <div onClick={dismiss} className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center ${tone === 'ok' ? 'bg-[#0B8F57]' : tone === 'warn' ? 'bg-[#E0B020] text-black' : 'bg-[#C2402A]'}`}>
          <p className="text-5xl font-black">{result.title}</p>
          {'attendee' in result && result.attendee && (
            <>
              <p className="mt-4 text-3xl font-bold">{result.attendee.name}</p>
              <p className="mt-1 text-xl">{KIND_LABEL[result.attendee.kind] ?? result.attendee.kind}{result.attendee.companions ? ` · +${result.attendee.companions} permitido(s)` : ''}</p>
              {result.attendee.notes && <p className="mt-2 rounded-lg bg-black/20 px-3 py-1 text-lg font-semibold">{result.attendee.notes}</p>}
            </>
          )}
          {'detail' in result && <p className="mt-3 max-w-md text-lg">{result.detail}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3" onClick={(e) => e.stopPropagation()}>
            {'attendee' in result && result.attendee && result.attendee.companions > result.attendee.companions_in && result.tone !== 'bad' && (
              <button onClick={() => companionIn(result.attendee!)} className="rounded-xl bg-black/25 px-5 py-3 text-lg font-bold">+1 ingresó ({result.attendee.companions_in}/{result.attendee.companions})</button>
            )}
            {result.tone === 'warn' && <button onClick={() => { admit(result.attendee, true); }} className="rounded-xl bg-black/25 px-5 py-3 text-lg font-bold">Dejar pasar igual</button>}
            {result.tone === 'bad' && result.attendee && <button onClick={() => admit(result.attendee!, true)} className="rounded-xl bg-black/25 px-5 py-3 text-lg font-bold">Dejar pasar igual</button>}
            {result.tone === 'bad' && result.canAdd && <button onClick={() => { setResult(null); setWalkin('') }} className="rounded-xl bg-white px-5 py-3 text-lg font-bold text-black"><UserPlus className="mr-1 inline size-5" />Dar de alta</button>}
            {result.tone === 'bad' && !result.canAdd && !result.attendee && snapshot.event.ownerPhone && (
              <a href={`tel:${snapshot.event.ownerPhone}`} className="rounded-xl bg-white px-5 py-3 text-lg font-bold text-black"><Phone className="mr-1 inline size-5" />Llamar a {snapshot.event.ownerName ?? 'responsable'}</a>
            )}
            {result.tone === 'bad' && !result.canAdd && !result.attendee && !snapshot.event.ownerPhone && <p className="text-lg">Llamá a {snapshot.event.ownerName ?? 'el responsable'}.</p>}
            <button onClick={dismiss} className="rounded-xl bg-black/25 px-5 py-3 text-lg font-bold">Siguiente</button>
          </div>
        </div>
      )}

      {walkin !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6">
          <form onSubmit={addWalkin} className="w-full max-w-sm space-y-3 rounded-2xl bg-[#1B231F] p-5">
            <p className="text-xl font-bold">Dar de alta e ingresar</p>
            <input autoFocus value={walkin} onChange={(e) => setWalkin(e.target.value)} placeholder="Nombre y apellido" className="h-14 w-full rounded-xl bg-white/10 px-4 text-lg outline-none" />
            <p className="text-xs text-white/50">Necesita señal. Queda registrado como alta en puerta.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setWalkin(null)} className="h-12 flex-1 rounded-xl bg-white/10 font-bold">Cancelar</button>
              <button className="h-12 flex-1 rounded-xl bg-[#EBFA61] font-bold text-black">Ingresar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function PinForm({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [pin, setPin] = useState('')
  const [operator, setOperator] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => setOperator(storage<string>('gestion-door-operator', '')), [])
  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    let device = storage<string>('gestion-door-device', '')
    if (!device) {
      device = uuid().slice(0, 8)
      save('gestion-door-device', device)
    }
    save('gestion-door-operator', operator)
    try {
      const response = await fetch(`/api/gestion/door/${eventId}/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, operator, device }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No pudimos validar el PIN.')
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="grid min-h-dvh place-items-center bg-[#0E1411] p-6 text-white">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <p className="text-sm font-semibold text-[#EBFA61]">Eventos Pasito · Puerta</p>
        <h1 className="text-3xl font-black">Ingresá el PIN</h1>
        <input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Tu nombre" className="h-14 w-full rounded-xl bg-white/10 px-4 text-lg outline-none" />
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" className="h-16 w-full rounded-xl bg-white/10 px-4 text-center font-mono text-3xl tracking-[0.4em] outline-none" />
        {error && <p className="text-[#FFB4A3]">{error}</p>}
        <button disabled={pin.length !== 6 || loading} className="h-14 w-full rounded-xl bg-[#EBFA61] text-lg font-black text-black disabled:opacity-40">{loading ? 'Validando…' : 'Entrar'}</button>
        <p className="text-xs text-white/50">¿Sos del equipo? <a className="underline" href={`/gestion/login?next=/gestion/puerta/${eventId}`}>Entrá con tu mail</a>.</p>
      </form>
    </div>
  )
}
