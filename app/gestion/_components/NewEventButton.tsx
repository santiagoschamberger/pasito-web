'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Plus, X } from 'lucide-react'

import { EVENT_TYPES } from '@/lib/gestion/schema'
import { cn } from '@/lib/utils'
import { api } from './api'
import { eventEmoji } from './EventCard'
import { btnPrimary, btnSecondary, input, label } from './ui'

type EventOption = { id: string; name: string; start_date: string | null }

const TEMPLATE_HINT: Record<string, string> = {
  activacion: 'Comercios, premios en la app, piezas',
  fiesta: 'Venue, line-up, seguridad, ticketera',
  corporativo: 'Brief, propuesta, catering',
  caminata: 'Recorrido, permisos, hidratación',
  otro: 'Checklist básico',
}

export function NewEventButton({ disabled, label: text = 'Nuevo evento' }: { disabled?: boolean; label?: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('caminata')
  const [date, setDate] = useState('')
  const [mode, setMode] = useState<'template' | 'duplicate'>('template')
  const [duplicateFrom, setDuplicateFrom] = useState('')
  const [events, setEvents] = useState<EventOption[]>([])
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    Promise.all([api<{ events: EventOption[] }>('/api/gestion/events', { quiet: true }), api<{ events: EventOption[] }>('/api/gestion/events?archived=1', { quiet: true })])
      .then(([a, b]) => setEvents([...a.events, ...b.events]))
      .catch(() => null)
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await api<{ event: { id: string } }>('/api/gestion/events', { body: { name, type, start_date: date || null, duplicateFrom: mode === 'duplicate' ? duplicateFrom || undefined : undefined } })
      router.push(`/gestion/eventos/${result.event.id}`)
    } catch {
      setSaving(false)
    }
  }

  return (
    <>
      <button className={cn(btnPrimary, 'h-9 px-3 sm:h-10 sm:px-3.5')} disabled={disabled} onClick={() => setOpen(true)}><Plus className="size-4" /><span className="sm:hidden">{text.split(' ')[0]}</span><span className="hidden sm:inline">{text}</span></button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-[#00402E]/40 backdrop-blur-[2px] sm:place-items-center" onClick={() => setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-lg space-y-5 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="g-display text-2xl font-extrabold">Nuevo evento</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full text-[#5F6761] hover:bg-[#F2F6F1]"><X className="size-5" /></button>
            </div>
            <label className="block space-y-1.5">
              <span className={label}>¿Cómo se llama?</span>
              <input className={cn(input, 'h-12 text-base')} required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Pasito Club #9 · Mié 9/12" />
            </label>
            <label className="block space-y-1.5">
              <span className={label}>Fecha (si ya la tenés)</span>
              <input className={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <div className="space-y-2">
              <div className="flex gap-1 rounded-lg bg-[#F2F6F1] p-1 text-sm font-semibold">
                <button type="button" onClick={() => setMode('template')} className={cn('flex-1 rounded-md py-1.5', mode === 'template' ? 'bg-white shadow-sm' : 'text-[#5F6761]')}>Desde plantilla</button>
                <button type="button" onClick={() => setMode('duplicate')} className={cn('flex-1 rounded-md py-1.5', mode === 'duplicate' ? 'bg-white shadow-sm' : 'text-[#5F6761]')}><Copy className="mr-1 inline size-3.5" />Copiar uno anterior</button>
              </div>
              {mode === 'template' ? (
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => setType(t.value)}
                      className={cn('rounded-xl border-2 p-3 text-left transition', type === t.value ? 'border-[#006D42] bg-[#F2F6F1]' : 'border-[#E3E8DF] hover:border-[#B9CBBE]')}
                    >
                      <span className="text-2xl">{eventEmoji(t.value)}</span>
                      <span className="mt-1 block text-sm font-bold">{t.label}</span>
                      <span className="block text-xs text-[#5F6761]">{TEMPLATE_HINT[t.value]}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <select className={input} value={duplicateFrom} required onChange={(e) => setDuplicateFrom(e.target.value)}>
                    <option value="">Elegí el evento a copiar</option>
                    {events.map((e) => <option key={e.id} value={e.id}>{e.name}{e.start_date ? ` (${e.start_date.slice(0, 7)})` : ''}</option>)}
                  </select>
                  <p className="text-xs text-[#5F6761]">Copia equipo, tareas, checklist, presupuesto estimado y sponsors (vuelven a “Primer contacto”). Los “a mejorar” pasan a ser tareas.</p>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>Cancelar</button>
              <button className={btnPrimary} disabled={saving}>{saving ? 'Creando…' : 'Crear evento'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
