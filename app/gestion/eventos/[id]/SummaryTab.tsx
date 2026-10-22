'use client'

import { AlertTriangle, ArrowRight, CheckCircle2, OctagonAlert, Ticket } from 'lucide-react'

import { BUDGET_CATEGORIES, formatMoney, personLabel, SPONSOR_STAGES, type GestionEvent, type GestionRow, type TeamUser } from '@/lib/gestion/schema'
import { checklistProgress, eventAlerts, moneySummary, todayISO } from '@/lib/gestion/summary'
import { cn } from '@/lib/utils'
import { Avatar, card, formatDate, Logo } from '../../_components/ui'
import type { WebSalesLite } from './EventClient'

function Kpi({ label, value, tone, sub, dark }: { label: string; value: string; tone?: 'bad' | 'good' | 'warn'; sub?: string; dark?: boolean }) {
  const color = tone === 'bad' ? 'text-[#B14D3B]' : tone === 'good' ? 'text-[#006D42]' : tone === 'warn' ? 'text-[#806113]' : ''
  return (
    <div className={cn(dark ? 'rounded-xl bg-[#00402E] p-4 text-white' : `${card} p-4`)}>
      <p className={cn('text-[12px] font-bold uppercase', dark ? 'text-[#EBFA61]' : 'text-[#7A837D]')}>{label}</p>
      <p className={cn('g-display mt-1 text-[26px] leading-8 font-extrabold tabular-nums', dark ? (tone === 'bad' ? 'text-[#FFB4A3]' : 'text-white') : color)}>{value}</p>
      {sub && <p className={cn('mt-0.5 text-xs', dark ? 'text-white/70' : 'text-[#5F6761]')}>{sub}</p>}
    </div>
  )
}

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

  return (
    <div className="space-y-[18px]">
      <div className="grid grid-cols-2 gap-[14px] lg:grid-cols-4">
        <Kpi dark label="Resultado proyectado" value={formatMoney(money.resultProjected)} tone={money.resultProjected < 0 ? 'bad' : undefined} sub={`${formatMoney(money.incomeProjected)} ingresos − ${formatMoney(money.expenseProjected)} gastos`} />
        <Kpi label="Resultado a hoy" value={formatMoney(money.resultReal)} tone={money.resultReal < 0 ? 'bad' : 'good'} sub="Cobrado − pagado" />
        <Kpi label="Falta cobrar" value={formatMoney(money.toCollect)} tone={money.toCollect ? 'warn' : undefined} sub={money.inKind ? `+ ${formatMoney(money.inKind)} en canjes` : undefined} />
        <Kpi label="Falta pagar" value={formatMoney(money.toPay)} tone={money.toPay ? 'warn' : undefined} />
      </div>

      {(web.tickets > 0 || web.revenue > 0) && (
        <button onClick={() => onGoTo('asistentes')} className={cn(card, 'flex w-full flex-wrap items-center gap-4 p-4 text-left transition hover:shadow-md')}>
          <span className="grid size-11 place-items-center rounded-xl bg-[#EBFA61] text-[#00402E]"><Ticket className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#7A837D] uppercase">Entradas web · se actualiza solo con Rebill</p>
            <p className="g-display text-xl font-extrabold">{web.tickets}{capacity ? <span className="text-[#7A837D]"> / {capacity}</span> : null} vendidas · {formatMoney(web.revenue)}</p>
            {capacity ? <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-[#E8EDE9]"><div className="h-full rounded-full bg-[#006D42]" style={{ width: `${Math.min(100, (web.tickets / capacity) * 100)}%` }} /></div> : null}
          </div>
          <div className="text-sm text-[#5F6761]">
            <p><strong className="text-[#171D1A]">{web.checkedIn}</strong> con check-in</p>
            {web.refunded > 0 && <p>{web.refunded} reembolsadas</p>}
          </div>
          <ArrowRight className="size-5 text-[#9AA39D]" />
        </button>
      )}

      <div className="grid items-start gap-[18px] lg:grid-cols-3">
        <section className={`${card} p-4 sm:p-5 lg:col-span-2`}>
          <h3 className="g-display mb-2 text-lg font-bold">Qué está en riesgo</h3>
          {alerts.length === 0 ? <p className="flex items-center gap-2 rounded-lg bg-[#F2F6F1] px-3 py-2.5 text-sm font-semibold text-[#006D42]"><CheckCircle2 className="size-4" />Nada en riesgo por ahora.</p> : (
            <ul className="divide-y divide-[#EDF1EB]">
              {alerts.map((alert, i) => (
                <li key={i}>
                  <button onClick={() => onGoTo(alert.kind === 'event' || alert.kind === 'permit' ? 'ficha' : alert.kind)} className="flex w-full items-center gap-3 py-2.5 text-left text-sm">
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full ${alert.level === 'critical' ? 'bg-[#FDECE8] text-[#B14D3B]' : 'bg-[#FBF3DA] text-[#806113]'}`}>
                      {alert.level === 'critical' ? <OctagonAlert className="size-4" /> : <AlertTriangle className="size-4" />}
                    </span>
                    {alert.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} p-4 sm:p-5`}>
          <h3 className="g-display mb-2 text-lg font-bold">{checklist.total ? 'Checklist' : 'Objetivos'}</h3>
          {checklist.total > 0 && (
            <div className="flex items-center gap-4">
              <div className="relative size-20 shrink-0">
                <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E8EDE9" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#006D42" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${pct} 100`} />
                </svg>
                <span className="g-display absolute inset-0 grid place-items-center text-lg font-extrabold">{pct}%</span>
              </div>
              <div className="text-sm text-[#5F6761]">
                <p>{checklist.done} de {checklist.total} ítems</p>
                <button onClick={() => onGoTo('checklist')} className="mt-1 font-semibold text-[#006D42]">Ver checklist</button>
              </div>
            </div>
          )}
          {kpis.length > 0 && (
            <div className={cn('space-y-2', checklist.total > 0 && 'mt-4 border-t border-[#EDF1EB] pt-3')}>
              {checklist.total > 0 && <p className="text-xs font-bold text-[#7A837D] uppercase">Objetivos</p>}
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
          )}
        </section>

        {sponsors.length > 0 && (
          <section className={`${card} p-4 sm:p-5 lg:col-span-3`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="g-display text-lg font-bold">Sponsors</h3>
              <button onClick={() => onGoTo('sponsor')} className="text-sm font-semibold text-[#006D42]">Gestionar</button>
            </div>
            <div className="flex flex-wrap gap-3">
              {sponsors.map((s) => {
                const stage = SPONSOR_STAGES.find((x) => x.value === s.data.etapa)?.label ?? ''
                const confirmed = s.data.etapa === 'confirmado' || s.data.etapa === 'cobrado'
                return (
                  <div key={s.id} className={cn('flex w-[150px] flex-col items-center gap-2 rounded-xl border p-3 text-center', s.data.nivel === 'principal' ? 'border-[#006D42] bg-[#F2F6F1]' : 'border-[#E3E8DF]', !confirmed && 'opacity-60')}>
                    <Logo src={typeof s.data.logo === 'string' ? s.data.logo : null} name={String(s.data.marca || '?')} size={56} rounded="rounded-xl" />
                    <p className="w-full truncate text-sm font-bold">{String(s.data.marca || 'Sin nombre')}</p>
                    <p className="text-[11px] text-[#5F6761]">{s.data.nivel === 'principal' ? 'Main sponsor · ' : ''}{stage}</p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className={`${card} p-4 sm:p-5`}>
          <h3 className="g-display mb-2 text-lg font-bold">Próximas tareas</h3>
          {tasks.length === 0 ? <p className="text-sm text-[#5F6761]">No hay tareas pendientes.</p> : (
            <ul className="space-y-2.5">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  {t.data.owner ? <Avatar name={users.find((u) => u.email === t.data.owner)?.name} email={String(t.data.owner)} size={26} /> : <span className="size-[26px] rounded-full border border-dashed border-[#C3CCC5]" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{String(t.data.titulo || 'Tarea')}</span>
                    <span className="text-xs text-[#5F6761]">{t.data.owner ? personLabel(String(t.data.owner), users) : 'Sin responsable'}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-bold ${typeof t.data.due === 'string' && t.data.due < today ? 'text-[#B14D3B]' : 'text-[#5F6761]'}`}>{t.data.due ? formatDate(String(t.data.due)) : ''}</span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => onGoTo('task')} className="mt-3 text-sm font-semibold text-[#006D42]">Ver todas</button>
        </section>

        {money.byCategory.length > 0 && <section className={`${card} p-4 sm:p-5`}>
          <h3 className="g-display mb-3 text-lg font-bold">Gastos por categoría</h3>
          {money.byCategory.length === 0 ? <p className="text-sm text-[#5F6761]">Sin gastos cargados.</p> : (
            <ul className="space-y-3">
              {money.byCategory.map((c) => (
                <li key={c.category} className="text-sm">
                  <div className="flex justify-between"><span>{categoryLabel(c.category)}</span><span className="font-bold tabular-nums">{formatMoney(c.projected)}</span></div>
                  <div className="relative mt-1 h-2 rounded-full bg-[#E8EDE9]">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-[#006D42]/30" style={{ width: `${(c.projected / maxCategory) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-[#006D42]" style={{ width: `${(c.real / maxCategory) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-[#5F6761]">Claro: presupuestado · Oscuro: pagado</p>
        </section>}

        {money.sponsorPipeline.length > 0 && <section className={`${card} p-4 sm:p-5`}>
          <h3 className="g-display mb-3 text-lg font-bold">Pipeline de sponsors</h3>
          {money.sponsorPipeline.length === 0 ? <p className="text-sm text-[#5F6761]">Sin sponsors cargados.</p> : (
            <ul className="space-y-2">
              {SPONSOR_STAGES.map((stage) => {
                const entry = money.sponsorPipeline.find((p) => p.stage === stage.value)
                if (!entry) return null
                return (
                  <li key={stage.value} className="flex justify-between text-sm">
                    <span className={stage.value === 'caido' ? 'text-[#9AA39D] line-through' : ''}>{stage.label} · {entry.count}</span>
                    <span className="font-bold tabular-nums">{formatMoney(entry.amount)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>}
      </div>
    </div>
  )
}
