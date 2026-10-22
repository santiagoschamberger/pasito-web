'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

import { EVENT_TYPES } from '@/lib/gestion/schema'
import { api } from './api'
import { btnPrimary, btnSecondary, card, input, label } from './ui'

type EventOption = { id: string; name: string; start_date: string | null }

export function NewEventButton({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('activacion')
  const [date, setDate] = useState('')
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
      const result = await api<{ event: { id: string } }>('/api/gestion/events', { body: { name, type, start_date: date || null, duplicateFrom: duplicateFrom || undefined } })
      router.push(`/gestion/eventos/${result.event.id}`)
    } catch {
      setSaving(false)
    }
  }

  return (
    <>
      <button className={btnPrimary} disabled={disabled} onClick={() => setOpen(true)}><Plus className="size-4" />Nuevo evento</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 sm:place-items-center" onClick={() => setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className={`${card} w-full max-w-md space-y-4 rounded-b-none p-5 sm:rounded-lg`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Nuevo evento</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-[#5F6761]"><X className="size-5" /></button>
            </div>
            <label className="block space-y-1.5">
              <span className={label}>Nombre</span>
              <input className={input} required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Caminata Palermo noviembre" />
            </label>
            <label className="block space-y-1.5">
              <span className={label}>Fecha (si ya la tenés)</span>
              <input className={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className={label}>Duplicar un evento anterior</span>
              <select className={input} value={duplicateFrom} onChange={(e) => setDuplicateFrom(e.target.value)}>
                <option value="">No, empezar de una plantilla</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}{e.start_date ? ` (${e.start_date.slice(0, 7)})` : ''}</option>)}
              </select>
              {duplicateFrom && <span className="block text-xs text-[#5F6761]">Copia equipo, tareas, checklist y presupuesto estimado. Los “a mejorar” pasan a tareas.</span>}
            </label>
            {!duplicateFrom && (
              <label className="block space-y-1.5">
                <span className={label}>Plantilla</span>
                <select className={input} value={type} onChange={(e) => setType(e.target.value)}>
                  {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <span className="block text-xs text-[#5F6761]">Trae checklist, tareas y gastos típicos. Después se edita todo.</span>
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>Cancelar</button>
              <button className={btnPrimary} disabled={saving}>{saving ? 'Creando…' : 'Crear'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
