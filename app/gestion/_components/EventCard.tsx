'use client'

import Link from 'next/link'
import { AlertTriangle, MapPin } from 'lucide-react'

import { formatMoney, personLabel, type EffectiveStatus, type GestionEvent, type TeamUser } from '@/lib/gestion/schema'
import { card, formatDate, StatusPill } from './ui'

export type EventCardData = GestionEvent & {
  effective_status: EffectiveStatus
  result_projected: number
  checklist: { done: number; total: number }
  alerts_critical?: number
  alerts_warning?: number
}

export function EventCard({ event, users }: { event: EventCardData; users: TeamUser[] }) {
  const pct = event.checklist.total ? Math.round((event.checklist.done / event.checklist.total) * 100) : 0
  return (
    <Link href={`/gestion/eventos/${event.id}`} className={`${card} block p-4 transition hover:border-[#0B6B43]/40 hover:shadow-sm`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-[#66706B]">{formatDate(event.start_date, { weekday: 'short', day: 'numeric', month: 'short' })}{event.start_time ? ` · ${event.start_time}` : ''}</p>
          <h3 className="mt-0.5 truncate text-base font-bold">{event.name}</h3>
        </div>
        <StatusPill status={event.effective_status} />
      </div>
      {(event.venue || event.city) && <p className="mt-1 flex items-center gap-1 truncate text-sm text-[#5F6761]"><MapPin className="size-3.5 shrink-0" />{[event.venue, event.city].filter(Boolean).join(', ')}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-[#66706B]">Resultado proyectado</p>
          <p className={`font-bold ${event.result_projected < 0 ? 'text-[#B14D3B]' : 'text-[#171D1A]'}`}>{formatMoney(event.result_projected)}</p>
        </div>
        <div>
          <p className="text-xs text-[#66706B]">Checklist</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E8EDE9]"><div className="h-full bg-[#0B6B43]" style={{ width: `${pct}%` }} /></div>
          <p className="mt-0.5 text-xs text-[#5F6761]">{event.checklist.done}/{event.checklist.total}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[#5F6761]">
        <span>{event.owner_email ? personLabel(event.owner_email, users) : 'Sin responsable'}</span>
        {!!(event.alerts_critical || event.alerts_warning) && (
          <span className={`flex items-center gap-1 font-semibold ${event.alerts_critical ? 'text-[#B14D3B]' : 'text-[#806113]'}`}>
            <AlertTriangle className="size-3.5" />{(event.alerts_critical ?? 0) + (event.alerts_warning ?? 0)} alertas
          </span>
        )}
      </div>
    </Link>
  )
}
