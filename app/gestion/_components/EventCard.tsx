'use client'

import Link from 'next/link'
import { AlertTriangle, Check, Clock, MapPin, Ticket } from 'lucide-react'

import { EVENT_TYPES, formatMoney, personLabel, type EffectiveStatus, type GestionEvent, type TeamUser } from '@/lib/gestion/schema'
import { cn } from '@/lib/utils'
import { Avatar, card, StatusPill } from './ui'

export type EventCardData = GestionEvent & {
  effective_status: EffectiveStatus
  result_projected: number
  checklist: { done: number; total: number }
  alerts_critical?: number
  alerts_warning?: number
  web?: { tickets: number; revenue: number; checkedIn: number; capacity: number | null } | null
  tasks?: { open: number; overdue: number }
}

// Estado de lo pendiente del evento, en una etiqueta.
export function PendingBadge({ open = 0, overdue = 0, critical = 0, warning = 0 }: { open?: number; overdue?: number; critical?: number; warning?: number }) {
  if (overdue || critical) {
    const parts = [overdue ? `${overdue} vencida${overdue > 1 ? 's' : ''}` : '', critical ? `${critical} alerta${critical > 1 ? 's' : ''}` : ''].filter(Boolean)
    return <span className="inline-flex items-center gap-1 rounded-full bg-[#FDECE8] px-2 py-0.5 text-xs font-bold text-[#B14D3B]"><AlertTriangle className="size-3" />{parts.join(' · ')}</span>
  }
  if (open || warning) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-[#FBF3DA] px-2 py-0.5 text-xs font-bold text-[#806113]"><Clock className="size-3" />{open ? `${open} pendiente${open > 1 ? 's' : ''}` : `${warning} aviso${warning > 1 ? 's' : ''}`}</span>
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-[#E3F2E8] px-2 py-0.5 text-xs font-bold text-[#006D42]"><Check className="size-3" />Al día</span>
}

const TYPE_EMOJI: Record<string, string> = { activacion: '🛍️', fiesta: '🎉', corporativo: '🏢', caminata: '👟', otro: '✨' }

export function eventEmoji(type: string) {
  return TYPE_EMOJI[type] ?? '✨'
}

function DateBadge({ iso }: { iso: string | null }) {
  if (!iso) return <span className="grid size-12 place-items-center rounded-xl bg-white/95 text-lg shadow-sm">📅</span>
  const date = new Date(`${iso}T12:00:00-03:00`)
  return (
    <span className="flex size-12 flex-col items-center justify-center rounded-xl bg-white/95 leading-none shadow-sm">
      <span className="text-[10px] font-bold text-[#B14D3B] uppercase">{date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</span>
      <span className="g-display text-xl font-extrabold text-[#171D1A]">{date.getDate()}</span>
    </span>
  )
}

export function EventCard({ event, users }: { event: EventCardData; users: TeamUser[] }) {
  const pct = event.checklist.total ? Math.round((event.checklist.done / event.checklist.total) * 100) : 0
  const owner = event.owner_email ? users.find((u) => u.email === event.owner_email) : null
  return (
    <Link href={`/gestion/eventos/${event.id}`} className={cn(card, 'group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md')}>
      <div className="relative h-28 shrink-0 overflow-hidden bg-gradient-to-br from-[#006D42] to-[#00402E]">
        {event.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.cover_url} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <span className="absolute right-3 bottom-1 text-5xl opacity-90">{eventEmoji(event.type)}</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute top-3 left-3"><DateBadge iso={event.start_date} /></div>
        <div className="absolute top-3 right-3"><StatusPill status={event.effective_status} className="shadow-sm" /></div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {event.series && <p className="text-[11px] font-bold tracking-wide text-[#006D42] uppercase">{event.series}</p>}
        <h3 className="g-display truncate text-lg leading-6 font-bold">{event.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-[#5F6761]">
          <MapPin className="size-3.5 shrink-0" />
          {[event.venue, event.city].filter(Boolean).join(', ') || EVENT_TYPES.find((t) => t.value === event.type)?.label}
          {event.start_time ? ` · ${event.start_time}` : ''}
        </p>
        <div className="mt-3 mb-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] font-semibold text-[#7A837D] uppercase">Resultado</p>
            <p className={`font-bold tabular-nums ${event.result_projected < 0 ? 'text-[#B14D3B]' : 'text-[#171D1A]'}`}>{formatMoney(event.result_projected)}</p>
          </div>
          {event.web ? (
            <div>
              <p className="text-[11px] font-semibold text-[#7A837D] uppercase">Entradas</p>
              <p className="flex items-center gap-1 font-bold tabular-nums"><Ticket className="size-3.5 text-[#006D42]" />{event.web.tickets}{event.web.capacity ? <span className="font-medium text-[#7A837D]">/{event.web.capacity}</span> : null}</p>
            </div>
          ) : (
            <div>
              <p className="text-[11px] font-semibold text-[#7A837D] uppercase">Checklist {pct}%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E8EDE9]"><div className="h-full rounded-full bg-[#006D42]" style={{ width: `${pct}%` }} /></div>
            </div>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-[#EDF1EB] pt-3 text-xs text-[#5F6761]">
          <span className="flex items-center gap-1.5">
            {event.owner_email ? <><Avatar name={owner?.name} email={event.owner_email} size={22} />{personLabel(event.owner_email, users)}</> : 'Sin responsable'}
          </span>
          <PendingBadge open={event.tasks?.open} overdue={event.tasks?.overdue} critical={event.alerts_critical} warning={event.alerts_warning} />
        </div>
      </div>
    </Link>
  )
}
