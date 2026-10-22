import type { Metadata } from 'next'
import Link from 'next/link'

import { db, getEvent, getRows } from '@/lib/gestion/server'
import { ORIGIN_LABEL, type AttendeeOrigin } from '@/lib/gestion/schema'
import { arrivalsBy15Min, attendanceStats } from '@/lib/gestion/summary'
import { syncSources, webSales } from '@/lib/gestion/sources'
import { pageSession } from '../../../_components/session'
import { PrintButton } from './PrintButton'
import { Logo } from '../../../_components/ui'

export const metadata: Metadata = { title: 'Reporte' }
export const dynamic = 'force-dynamic'

async function all<T>(query: (from: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

// Reporte para sponsors y comercios: solo números agregados, sin datos personales.
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await pageSession(`/gestion/eventos/${id}/reporte`)
  const event = await getEvent(id)
  if (event.status !== 'cerrado') await syncSources(event, { minIntervalMs: 15_000 }).catch(() => null)
  const [rows, web, attendees, arrivals] = await Promise.all([
    getRows([id]),
    webSales(event),
    all<{ origin: string; status: string; companions_in: number }>((from) => db().from('gestion_attendees').select('origin, status, companions_in').eq('event_id', id).is('deleted_at', null).order('id').range(from, from + 999)),
    all<{ scanned_at: string }>((from) => db().from('gestion_checkins').select('scanned_at').eq('event_id', id).eq('action', 'ingreso').eq('duplicate', false).order('id').range(from, from + 999)),
  ])
  const stats = attendanceStats(attendees)
  const slots = arrivalsBy15Min(arrivals.map((a) => a.scanned_at))
  const maxSlot = Math.max(1, ...slots.map((s) => s.count))
  const inside = stats.inside + stats.companionsIn
  const registered = Math.max(stats.total, web.tickets)
  const showRate = registered ? Math.round((stats.inside / registered) * 100) : 0
  const sponsors = rows.filter((r) => r.kind === 'sponsor' && (r.data.etapa === 'confirmado' || r.data.etapa === 'cobrado'))
  const kpis = rows.filter((r) => r.kind === 'kpi')
  const appShare = stats.total ? Math.round(((stats.byOrigin.find((o) => o.origin === 'app')?.total ?? 0) / stats.total) * 100) : 0
  const rawWhen = event.start_date ? new Date(`${event.start_date}T12:00:00-03:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const when = rawWhen.charAt(0).toUpperCase() + rawWhen.slice(1)
  const peak = slots.reduce((best, s) => (s.count > best.count ? s : best), { slot: '', count: 0 })

  return (
    <div className="min-h-dvh bg-[#F6F7EF] py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between px-4">
        <Link href={`/gestion/eventos/${id}`} className="text-sm font-semibold text-[#006D42]">← Volver al evento</Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-sm print:rounded-none print:shadow-none">
        <header className="relative bg-[#00402E] px-8 py-10 text-white">
          {event.cover_url && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.cover_url} alt="" className="absolute inset-0 size-full object-cover opacity-35" />
            </>
          )}
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-white.svg" alt="Pasito" className="h-6 w-auto" />
            <p className="mt-8 text-sm font-bold tracking-wider text-[#EBFA61] uppercase">Reporte del evento</p>
            <h1 className="g-display mt-1 text-4xl font-extrabold">{event.name}</h1>
            <p className="mt-2 text-white/85">{when}{event.venue ? ` · ${event.venue}` : ''}{event.city ? `, ${event.city}` : ''}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-px bg-[#EDF1EB] sm:grid-cols-4">
          {[
            { label: 'Personas anotadas', value: registered.toLocaleString('es-AR') },
            { label: 'Asistentes', value: inside.toLocaleString('es-AR') },
            { label: 'Presentismo', value: `${showRate}%` },
            { label: 'Llegaron por la app Pasito', value: `${appShare}%` },
          ].map((k) => (
            <div key={k.label} className="bg-white p-6">
              <p className="g-display text-4xl font-extrabold text-[#006D42]">{k.value}</p>
              <p className="mt-1 text-sm text-[#5F6761]">{k.label}</p>
            </div>
          ))}
        </section>

        <div className="space-y-10 p-8">
          {slots.length > 0 && (
            <section>
              <h2 className="g-display text-2xl font-bold">Cómo llegó la gente</h2>
              <p className="text-sm text-[#5F6761]">Ingresos cada 15 minutos.{peak.count ? ` Pico: ${peak.slot} (${peak.count} personas).` : ''}</p>
              <div className="mt-4 flex h-40 items-end gap-1">
                {slots.map((s) => (
                  <div key={s.slot} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-[#5F6761]">{s.count}</span>
                    <div className="w-full rounded-t bg-[#006D42]" style={{ height: `${(s.count / maxSlot) * 110}px` }} />
                    <span className="text-[10px] text-[#5F6761]">{s.slot}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {stats.byOrigin.length > 0 && (
            <section>
              <h2 className="g-display text-2xl font-bold">Por canal</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {stats.byOrigin.map((o) => (
                  <div key={o.origin} className="rounded-xl border border-[#E3E8DF] p-4">
                    <p className="text-sm font-bold">{ORIGIN_LABEL[o.origin as AttendeeOrigin] ?? o.origin}</p>
                    <p className="g-display text-2xl font-extrabold">{o.inside} <span className="text-base font-semibold text-[#7A837D]">de {o.total}</span></p>
                    <p className="text-xs text-[#5F6761]">{o.total ? Math.round((o.inside / o.total) * 100) : 0}% vino</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {kpis.length > 0 && (
            <section>
              <h2 className="g-display text-2xl font-bold">Objetivos</h2>
              <ul className="mt-3 divide-y divide-[#EDF1EB]">
                {kpis.map((k) => (
                  <li key={k.id} className="flex justify-between py-2 text-sm">
                    <span>{String(k.data.nombre || 'Objetivo')}</span>
                    <span className="font-bold">{String(k.data.real ?? '—')} / {String(k.data.objetivo ?? '—')} {String(k.data.unidad ?? '')}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sponsors.length > 0 && (
            <section>
              <h2 className="g-display text-2xl font-bold">Gracias a</h2>
              <div className="mt-4 flex flex-wrap items-center gap-6">
                {sponsors.map((s) => (
                  <div key={s.id} className="flex flex-col items-center gap-1.5">
                    <Logo src={typeof s.data.logo === 'string' ? s.data.logo : null} name={String(s.data.marca || '')} size={84} rounded="rounded-2xl" />
                    <span className="text-xs font-semibold text-[#5F6761]">{String(s.data.marca || '')}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          <p className="text-xs text-[#9AA39D]">Números agregados, sin datos personales. Generado por Eventos Pasito el {new Date().toLocaleDateString('es-AR')}.</p>
        </div>
      </article>
    </div>
  )
}
