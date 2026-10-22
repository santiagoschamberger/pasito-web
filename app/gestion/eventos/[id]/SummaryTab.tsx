'use client'

import { AlertTriangle, CheckCircle2, OctagonAlert } from 'lucide-react'

import { BUDGET_CATEGORIES, formatMoney, personLabel, SPONSOR_STAGES, type GestionEvent, type GestionRow, type TeamUser } from '@/lib/gestion/schema'
import { checklistProgress, daysBetween, eventAlerts, moneySummary, todayISO } from '@/lib/gestion/summary'
import { card, Empty, formatDate } from '../../_components/ui'

function Kpi({ label, value, tone, sub }: { label: string; value: string; tone?: 'bad' | 'good' | 'warn'; sub?: string }) {
  const color = tone === 'bad' ? 'text-[#B14D3B]' : tone === 'good' ? 'text-[#0B6B43]' : tone === 'warn' ? 'text-[#806113]' : 'text-[#171D1A]'
  return (
    <div className={`${card} p-4`}>
      <p className="text-[13px] font-semibold text-[#66706B]">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#5F6761]">{sub}</p>}
    </div>
  )
}

const categoryLabel = (key: string) => (key === 'proveedores' ? 'Proveedores' : BUDGET_CATEGORIES.find((c) => c.value === key)?.label ?? key)

export function SummaryTab({ event, rows, users, onGoTo }: { event: GestionEvent; rows: GestionRow[]; users: TeamUser[]; onGoTo: (tab: string) => void }) {
  const today = todayISO()
  const money = moneySummary(rows)
  const alerts = eventAlerts(event, rows, today)
  const checklist = checklistProgress(rows)
  const days = event.start_date ? daysBetween(today, event.start_date) : null
  const tasks = rows
    .filter((r) => r.kind === 'task' && r.data.estado !== 'hecha')
    .sort((a, b) => String(a.data.due || '9999').localeCompare(String(b.data.due || '9999')))
    .slice(0, 6)
  const maxCategory = Math.max(1, ...money.byCategory.map((c) => Math.max(c.projected, c.real)))
  const kpis = rows.filter((r) => r.kind === 'kpi')

  return (
    <div className="space-y-[18px]">
      <div className="grid grid-cols-2 gap-[14px] lg:grid-cols-5">
        <Kpi label="Resultado proyectado" value={formatMoney(money.resultProjected)} tone={money.resultProjected < 0 ? 'bad' : 'good'} sub={`${formatMoney(money.incomeProjected)} − ${formatMoney(money.expenseProjected)}`} />
        <Kpi label="Resultado a hoy" value={formatMoney(money.resultReal)} tone={money.resultReal < 0 ? 'bad' : undefined} sub="Cobrado − pagado" />
        <Kpi label="Falta cobrar" value={formatMoney(money.toCollect)} tone={money.toCollect ? 'warn' : undefined} />
        <Kpi label="Falta pagar" value={formatMoney(money.toPay)} tone={money.toPay ? 'warn' : undefined} />
        <Kpi label={days === null ? 'Fecha' : days > 0 ? 'Faltan' : days === 0 ? 'Es hoy' : 'Pasó hace'} value={days === null ? 'Sin fecha' : days === 0 ? '🎉' : `${Math.abs(days)} días`} sub={money.inKind ? `Canjes: ${formatMoney(money.inKind)} (no suman a caja)` : event.start_date ? formatDate(event.start_date, { weekday: 'long', day: 'numeric', month: 'long' }) : undefined} />
      </div>

      <div className="grid gap-[18px] lg:grid-cols-3">
        <section className={`${card} p-4 lg:col-span-2`}>
          <h3 className="mb-2 font-bold">Alertas</h3>
          {alerts.length === 0 ? <Empty><CheckCircle2 className="mx-auto mb-1 size-5 text-[#0B6B43]" />Nada en riesgo.</Empty> : (
            <ul className="divide-y divide-[#E8EDE9]">
              {alerts.map((alert, i) => (
                <li key={i}>
                  <button onClick={() => onGoTo(alert.kind === 'event' || alert.kind === 'permit' ? 'ficha' : alert.kind)} className="flex w-full items-center gap-2 py-2 text-left text-sm">
                    {alert.level === 'critical' ? <OctagonAlert className="size-4 shrink-0 text-[#B14D3B]" /> : <AlertTriangle className="size-4 shrink-0 text-[#C49A2D]" />}
                    {alert.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} p-4`}>
          <h3 className="mb-2 font-bold">Checklist</h3>
          <p className="text-3xl font-extrabold">{checklist.total ? Math.round((checklist.done / checklist.total) * 100) : 0}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EDE9]"><div className="h-full bg-[#0B6B43]" style={{ width: `${checklist.total ? (checklist.done / checklist.total) * 100 : 0}%` }} /></div>
          <p className="mt-1 text-sm text-[#5F6761]">{checklist.done} de {checklist.total} ítems</p>
          {kpis.length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-[#E8EDE9] pt-3">
              {kpis.map((k) => (
                <div key={k.id} className="flex justify-between text-sm">
                  <span className="text-[#5F6761]">{String(k.data.nombre || 'Objetivo')}</span>
                  <span className="font-semibold tabular-nums">{k.data.real ?? '—'} / {k.data.objetivo ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${card} p-4`}>
          <h3 className="mb-2 font-bold">Próximas tareas</h3>
          {tasks.length === 0 ? <p className="text-sm text-[#5F6761]">No hay tareas pendientes.</p> : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{String(t.data.titulo || 'Tarea')}</span>
                    <span className="text-xs text-[#5F6761]">{t.data.owner ? personLabel(String(t.data.owner), users) : 'Sin responsable'}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-semibold ${typeof t.data.due === 'string' && t.data.due < today ? 'text-[#B14D3B]' : 'text-[#5F6761]'}`}>{t.data.due ? formatDate(String(t.data.due)) : ''}</span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => onGoTo('task')} className="mt-3 text-sm font-semibold text-[#0B6B43]">Ver todas</button>
        </section>

        <section className={`${card} p-4`}>
          <h3 className="mb-3 font-bold">Gastos por categoría</h3>
          {money.byCategory.length === 0 ? <p className="text-sm text-[#5F6761]">Sin gastos cargados.</p> : (
            <ul className="space-y-2.5">
              {money.byCategory.map((c) => (
                <li key={c.category} className="text-sm">
                  <div className="flex justify-between"><span>{categoryLabel(c.category)}</span><span className="font-semibold tabular-nums">{formatMoney(c.projected)}</span></div>
                  <div className="relative mt-1 h-1.5 rounded-full bg-[#E8EDE9]">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-[#0B6B43]/30" style={{ width: `${(c.projected / maxCategory) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-[#0B6B43]" style={{ width: `${(c.real / maxCategory) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-[#5F6761]">Claro: presupuestado · Oscuro: real</p>
        </section>

        <section className={`${card} p-4`}>
          <h3 className="mb-3 font-bold">Pipeline de sponsors</h3>
          {money.sponsorPipeline.length === 0 ? <p className="text-sm text-[#5F6761]">Sin sponsors cargados.</p> : (
            <ul className="space-y-1.5">
              {SPONSOR_STAGES.map((stage) => {
                const entry = money.sponsorPipeline.find((p) => p.stage === stage.value)
                if (!entry) return null
                return (
                  <li key={stage.value} className="flex justify-between text-sm">
                    <span className={stage.value === 'caido' ? 'text-[#9AA39D] line-through' : ''}>{stage.label} · {entry.count}</span>
                    <span className="font-semibold tabular-nums">{formatMoney(entry.amount)}</span>
                  </li>
                )
              })}
            </ul>
          )}
          <button onClick={() => onGoTo('sponsor')} className="mt-3 text-sm font-semibold text-[#0B6B43]">Ver sponsors</button>
        </section>
      </div>
    </div>
  )
}
