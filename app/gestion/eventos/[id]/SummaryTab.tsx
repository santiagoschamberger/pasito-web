'use client'

import { AlertTriangle, CheckCircle2, OctagonAlert, Ticket } from 'lucide-react'

import { BUDGET_CATEGORIES, formatMoney, personLabel, SPONSOR_STAGES, type GestionEvent, type GestionRow, type TeamUser } from '@/lib/gestion/schema'
import { checklistProgress, eventAlerts, moneySummary, todayISO } from '@/lib/gestion/summary'
import { cn } from '@/lib/utils'
import { Avatar, card, formatDate, Logo } from '../../_components/ui'
import type { WebSalesLite } from './EventClient'

const categoryLabel = (key: string) => (key === 'proveedores' ? 'Proveedores' : BUDGET_CATEGORIES.find((c) => c.value === key)?.label ?? key)
const LEVEL_ORDER = ['principal', 'oro', 'plata', 'apoyo', '']

export function SummaryTab({ event, rows, users, web, onGoTo }: { event: GestionEvent; rows: GestionRow[]; users: TeamUser[]; web: WebSalesLite; onGoTo: (tab: string) => void }) {
  const today = todayISO()
  const money = moneySummary(rows, web)
  const alerts = eventAlerts(event, rows, today)
  const checklist = checklistProgress(rows)
  const tasks = rows
    .filter((r) => r.kind === 'task' && r.data.estado !== 'hecha')
    .sort((a, b) => String(a.data.due || '9999').localeCompare(String(b.data.due || '9999')))
    .slice(0, 6)
  const maxCategory = Math.max(1, ...money.byCategory.map((c) => Math.max(c.projected, c.real)))
  const kpis = rows.filter((r) => r.kind === 'kpi')
  const sponsors = rows
    .filter((r) => r.kind === 'sponsor' && r.data.etapa !== 'caido')
    .sort((a, b) => LEVEL_ORDER.indexOf(String(a.data.nivel ?? '')) - LEVEL_ORDER.indexOf(String(b.data.nivel ?? '')))
  const capacity = web.capacity ?? event.capacity
  const pct = checklist.total ? Math.round((checklist.done / checklist.total) * 100) : 0

  const stat = (label: string, value: number, tone?: 'warn' | 'bad' | 'good') => (
    <div>
      <p className="text-xs font-semibold text-[#7A837D]">{label}</p>
      <p className={cn('g-display text-[15px] font-extrabold tabular-nums sm:text-lg', tone === 'warn' && value ? 'text-[#806113]' : tone === 'bad' && value < 0 ? 'text-[#B14D3B]' : '')}>{formatMoney(value, event.currency)}</p>
    </div>
  )

  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-3">
      <div className="min-w-0 space-y-4 sm:space-y-5 lg:col-span-2">
        <section className={`${card} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#7A837D] uppercase">Resultado proyectado</p>
              <p className={cn('g-display text-3xl font-extrabold tabular-nums sm:text-4xl', money.resultProjected < 0 ? 'text-[#B14D3B]' : 'text-[#006D42]')}>{formatMoney(money.resultProjected, event.currency)}</p>
              <p className="mt-0.5 text-sm text-[#5F6761]">{formatMoney(money.incomeProjected, event.currency)} de ingresos − {formatMoney(money.expenseProjected, event.currency)} de gastos{money.inKind ? ` · ${formatMoney(money.inKind, event.currency)} en canjes` : ''}</p>
            </div>
            <button onClick={() => onGoTo('budget')} className="text-sm font-semibold text-[#006D42]">Ver presupuesto</button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#EDF1EB] pt-4 sm:gap-4">
            {stat('Resultado a hoy', money.resultReal, 'bad')}
            {stat('Falta cobrar', money.toCollect, 'warn')}
            {stat('Falta pagar', money.toPay, 'warn')}
          </div>
        </section>

        {(web.tickets > 0 || web.revenue > 0) && (
          <button onClick={() => onGoTo('asistentes')} className={cn(card, 'flex w-full items-center gap-3 p-4 text-left sm:gap-4 sm:p-5 transition hover:shadow-md')}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#EBFA61] text-[#00402E]"><Ticket className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="g-display text-lg font-extrabold">{web.tickets}{capacity ? <span className="font-bold text-[#9AA39D]"> / {capacity}</span> : null} entradas vendidas</p>
                <p className="text-sm text-[#5F6761]">{formatMoney(web.revenue, event.currency)} · {web.checkedIn} entraron{web.refunded ? ` · ${web.refunded} reembolsadas` : ''}</p>
              </div>
              {capacity ? <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EDE9]"><div className="h-full rounded-full bg-[#006D42]" style={{ width: `${Math.min(100, (web.tickets / capacity) * 100)}%` }} /></div> : null}
              <p className="mt-1.5 text-xs text-[#7A837D]">Se actualiza solo con Rebill / dLocal</p>
            </div>
          </button>
        )}

        <section className={`${card} p-4 sm:p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="g-display text-lg font-bold">Para hacer</h3>
            <button onClick={() => onGoTo('task')} className="text-sm font-semibold text-[#006D42]">Ver tareas</button>
          </div>
          {alerts.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {alerts.map((alert, i) => (
                <li key={i}>
                  <button onClick={() => onGoTo(alert.kind === 'event' || alert.kind === 'permit' ? 'ficha' : alert.kind)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold', alert.level === 'critical' ? 'bg-[#FDECE8] text-[#B14D3B]' : 'bg-[#FBF3DA] text-[#806113]')}>
                    {alert.level === 'critical' ? <OctagonAlert className="size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
                    {alert.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {tasks.length === 0 && alerts.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg bg-[#F2F6F1] px-3 py-2.5 text-sm font-semibold text-[#006D42]"><CheckCircle2 className="size-4" />Nada pendiente ni en riesgo.</p>
          ) : (
            <ul className="divide-y divide-[#EDF1EB]">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                  {t.data.owner ? <Avatar name={users.find((u) => u.email === t.data.owner)?.name} email={String(t.data.owner)} size={26} /> : <span className="size-[26px] shrink-0 rounded-full border border-dashed border-[#C3CCC5]" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{String(t.data.titulo || 'Tarea')}</span>
                    <span className="text-xs text-[#5F6761]">{t.data.owner ? personLabel(String(t.data.owner), users) : 'Sin responsable'}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-bold ${typeof t.data.due === 'string' && t.data.due < today ? 'text-[#B14D3B]' : 'text-[#5F6761]'}`}>{t.data.due ? formatDate(String(t.data.due)) : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {sponsors.length > 0 && (
          <section className={`${card} p-4 sm:p-5`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="g-display text-lg font-bold">Sponsors</h3>
              <button onClick={() => onGoTo('sponsor')} className="text-sm font-semibold text-[#006D42]">Gestionar</button>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
              {sponsors.map((sp) => {
                const confirmed = sp.data.etapa === 'confirmado' || sp.data.etapa === 'cobrado'
                return (
                  <div key={sp.id} className={cn('flex flex-col items-center gap-2 rounded-xl border p-3 text-center', sp.data.nivel === 'principal' ? 'border-[#006D42] bg-[#F2F6F1]' : 'border-[#E3E8DF]', !confirmed && 'opacity-60')}>
                    <Logo src={typeof sp.data.logo === 'string' ? sp.data.logo : null} name={String(sp.data.marca || '?')} size={52} rounded="rounded-xl" />
                    <p className="w-full truncate text-xs font-bold">{String(sp.data.marca || 'Sin nombre')}</p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {(money.byCategory.length > 0 || money.sponsorPipeline.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {money.byCategory.length > 0 && (
              <section className={`${card} p-4 sm:p-5`}>
                <h3 className="g-display mb-3 text-lg font-bold">Gastos por categoría</h3>
                <ul className="space-y-3">
                  {money.byCategory.map((c) => (
                    <li key={c.category} className="text-sm">
                      <div className="flex justify-between"><span>{categoryLabel(c.category)}</span><span className="font-bold tabular-nums">{formatMoney(c.projected, event.currency)}</span></div>
                      <div className="relative mt-1 h-2 rounded-full bg-[#E8EDE9]">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-[#006D42]/30" style={{ width: `${(c.projected / maxCategory) * 100}%` }} />
                        <div className="absolute inset-y-0 left-0 rounded-full bg-[#006D42]" style={{ width: `${(c.real / maxCategory) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-[#7A837D]">Claro: presupuestado · Oscuro: pagado</p>
              </section>
            )}
            {money.sponsorPipeline.length > 0 && (
              <section className={`${card} p-4 sm:p-5`}>
                <h3 className="g-display mb-3 text-lg font-bold">Pipeline de sponsors</h3>
                <ul className="space-y-2">
                  {SPONSOR_STAGES.map((stage) => {
                    const entry = money.sponsorPipeline.find((p) => p.stage === stage.value)
                    if (!entry) return null
                    return (
                      <li key={stage.value} className="flex justify-between text-sm">
                        <span className={stage.value === 'caido' ? 'text-[#9AA39D] line-through' : ''}>{stage.label} · {entry.count}</span>
                        <span className="font-bold tabular-nums">{formatMoney(entry.amount, event.currency)}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      <aside className="min-w-0 space-y-4 sm:space-y-5">
        <section className={`${card} p-4 sm:p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="g-display text-lg font-bold">Checklist</h3>
            <button onClick={() => onGoTo('checklist')} className="text-sm font-semibold text-[#006D42]">Abrir</button>
          </div>
          {checklist.total === 0 ? <p className="text-sm text-[#5F6761]">Sin ítems todavía.</p> : (
            <div className="flex items-center gap-4">
              <div className="relative size-16 shrink-0">
                <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E8EDE9" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#006D42" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${pct} 100`} />
                </svg>
                <span className="g-display absolute inset-0 grid place-items-center text-base font-extrabold">{pct}%</span>
              </div>
              <p className="text-sm text-[#5F6761]">{checklist.done} de {checklist.total} ítems hechos</p>
            </div>
          )}
        </section>
        {kpis.length > 0 && (
          <section className={`${card} p-4 sm:p-5`}>
            <h3 className="g-display mb-3 text-lg font-bold">Objetivos</h3>
            <div className="space-y-3">
              {kpis.map((k) => {
                const goal = Number(k.data.objetivo) || 0
                const real = Number(k.data.real) || 0
                return (
                  <div key={k.id} className="text-sm">
                    <div className="flex justify-between"><span className="text-[#5F6761]">{String(k.data.nombre || 'Objetivo')}</span><span className="font-bold tabular-nums">{k.data.real ?? '—'} / {k.data.objetivo ?? '—'}</span></div>
                    {goal > 0 && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E8EDE9]"><div className={cn('h-full rounded-full', real >= goal ? 'bg-[#006D42]' : 'bg-[#C49A2D]')} style={{ width: `${Math.min(100, (real / goal) * 100)}%` }} /></div>}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </aside>
    </div>
  )
}
