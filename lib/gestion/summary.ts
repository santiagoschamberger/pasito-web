// Cálculos puros del Resumen, alertas y plantillas. Sin dependencias de servidor
// para poder testearlos y usarlos en el cliente.

import type { EffectiveStatus, EventType, GestionEvent, GestionRow, RowData, RowKind } from './schema'

export const TIMEZONE = 'America/Argentina/Buenos_Aires'

export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(`${toISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`)) / 86_400_000)
}

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

// "En curso" y "Realizado" salen solos de la fecha; el resto lo define el responsable.
export function effectiveStatus(event: Pick<GestionEvent, 'status' | 'start_date' | 'end_date'>, today = todayISO()): EffectiveStatus {
  if (event.status === 'cerrado' || event.status === 'cancelado' || event.status === 'idea') return event.status
  if (!event.start_date) return event.status
  const end = event.end_date || event.start_date
  if (today >= event.start_date && today <= end) return 'en_curso'
  if (today > end) return event.status === 'planificacion' ? 'planificacion' : 'realizado'
  return event.status
}

export type MoneySummary = {
  incomeProjected: number
  expenseProjected: number
  resultProjected: number
  incomeReal: number
  expenseReal: number
  resultReal: number
  toCollect: number
  toPay: number
  inKind: number
  byCategory: { category: string; projected: number; real: number }[]
  sponsorPipeline: { stage: string; count: number; amount: number }[]
}

const byKind = (rows: GestionRow[], kind: RowKind) => rows.filter((r) => r.kind === kind)

// `web`: entradas vendidas en la web (Rebill), que entran solas como ingreso cobrado.
export function moneySummary(rows: GestionRow[], web?: { revenue: number } | null): MoneySummary {
  let incomeProjected = 0
  let expenseProjected = 0
  let incomeReal = 0
  let expenseReal = 0
  let toCollect = 0
  let toPay = 0
  let inKind = 0
  const categories = new Map<string, { projected: number; real: number }>()
  const addCategory = (category: string, projected: number, real: number) => {
    const current = categories.get(category) ?? { projected: 0, real: 0 }
    current.projected += projected
    current.real += real
    categories.set(category, current)
  }

  for (const { data } of byKind(rows, 'budget')) {
    const projected = num(data.presupuestado)
    const real = num(data.real)
    if (data.tipo === 'ingreso') {
      incomeProjected += projected
      incomeReal += real
      if (data.estado !== 'cobrado') toCollect += Math.max(projected - real, 0)
    } else {
      expenseProjected += projected
      expenseReal += real
      if (data.estado !== 'pagado') toPay += Math.max(projected - real, 0)
      addCategory(String(data.categoria || 'otros'), projected, real)
    }
  }

  const pipeline = new Map<string, { count: number; amount: number }>()
  for (const { data } of byKind(rows, 'sponsor')) {
    const stage = String(data.etapa || 'contacto')
    const money = num(data.dinero)
    const entry = pipeline.get(stage) ?? { count: 0, amount: 0 }
    entry.count += 1
    entry.amount += money
    pipeline.set(stage, entry)
    // El dinero de un sponsor suma recién cuando está confirmado. Los canjes nunca suman a la caja.
    if (stage === 'confirmado' || stage === 'cobrado') {
      incomeProjected += money
      inKind += num(data.canje)
      if (stage === 'cobrado') incomeReal += money
      else toCollect += money
    }
  }

  if (web?.revenue) {
    incomeProjected += web.revenue
    incomeReal += web.revenue
  }

  for (const { data } of byKind(rows, 'vendor')) {
    const total = num(data.total)
    const deposit = num(data.sena)
    expenseProjected += total
    const paid = data.saldo_pagado ? total : data.sena_pagada ? deposit : 0
    expenseReal += paid
    toPay += total - paid
    addCategory('proveedores', total, paid)
  }

  return {
    incomeProjected,
    expenseProjected,
    resultProjected: incomeProjected - expenseProjected,
    incomeReal,
    expenseReal,
    resultReal: incomeReal - expenseReal,
    toCollect,
    toPay,
    inKind,
    byCategory: [...categories.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.projected - a.projected),
    sponsorPipeline: [...pipeline.entries()].map(([stage, v]) => ({ stage, ...v })),
  }
}

export type AlertLevel = 'critical' | 'warning'
export type Alert = { level: AlertLevel; text: string; kind: RowKind | 'event'; rowId?: string; eventId: string; eventName: string }

export function eventAlerts(event: GestionEvent, rows: GestionRow[], today = todayISO()): Alert[] {
  const alerts: Alert[] = []
  const status = effectiveStatus(event, today)
  if (status === 'cerrado' || status === 'cancelado') return alerts
  const base = { eventId: event.id, eventName: event.name }
  const push = (level: AlertLevel, kind: Alert['kind'], text: string, rowId?: string) => alerts.push({ level, kind, text, rowId, ...base })
  const daysToEvent = event.start_date ? daysBetween(today, event.start_date) : null
  const committed = status === 'confirmado' || status === 'produccion' || status === 'en_curso'

  if (!event.owner_email && status !== 'idea') push('warning', 'event', 'El evento no tiene responsable')

  for (const row of rows) {
    const d: RowData = row.data
    if (row.kind === 'task' && d.estado !== 'hecha') {
      const title = String(d.titulo || 'Tarea sin título')
      if (typeof d.due === 'string' && d.due < today) push('critical', 'task', `Tarea vencida: ${title}`, row.id)
      else if (!d.owner && status !== 'idea') push('warning', 'task', `Tarea sin responsable: ${title}`, row.id)
    }
    if (row.kind === 'budget' && d.tipo !== 'ingreso' && d.estado !== 'pagado' && typeof d.vence === 'string') {
      const label = String(d.concepto || 'Pago')
      if (d.vence < today) push('critical', 'budget', `Pago vencido: ${label}`, row.id)
      else if (daysBetween(today, d.vence) <= 7) push('warning', 'budget', `Pago en ${daysBetween(today, d.vence)} días: ${label}`, row.id)
    }
    if (row.kind === 'sponsor') {
      const brand = String(d.marca || 'Sponsor')
      if (status !== 'realizado' && num(d.dinero) > 0 && (d.etapa === 'confirmado' || d.etapa === 'cobrado') && d.contrato !== 'firmado') push('warning', 'sponsor', `${brand}: confirmado sin contrato firmado`, row.id)
      if (d.etapa === 'confirmado' && typeof d.fecha_cobro === 'string' && d.fecha_cobro < today) push('critical', 'sponsor', `${brand}: cobro vencido`, row.id)
    }
    if (row.kind === 'vendor' && !d.saldo_pagado && typeof d.fecha_pago === 'string' && d.fecha_pago < today) {
      push('critical', 'vendor', `Saldo vencido: ${String(d.proveedor || 'Proveedor')}`, row.id)
    }
    if (row.kind === 'permit' && d.estado !== 'aprobado') {
      const label = String(d.tramite || 'Permiso')
      if (d.estado === 'rechazado') push('critical', 'permit', `Permiso rechazado: ${label}`, row.id)
      else if (committed && daysToEvent !== null) {
        const strict = status === 'produccion' || status === 'en_curso'
        if (daysToEvent <= (strict ? 10 : 5)) push('critical', 'permit', `Permiso pendiente a ${daysToEvent} días: ${label}`, row.id)
        else if (daysToEvent <= 30) push('warning', 'permit', `Permiso pendiente: ${label}`, row.id)
      }
    }
  }
  return alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === 'critical' ? -1 : 1))
}

export function checklistProgress(rows: GestionRow[]): { done: number; total: number } {
  const items = byKind(rows, 'checklist')
  return { done: items.filter((r) => r.data.hecho === true).length, total: items.length }
}

// Requisitos para pasar un evento a "Cerrado".
export function closeBlockers(rows: GestionRow[]): string[] {
  const blockers: string[] = []
  const missingReal = byKind(rows, 'budget').filter((r) => r.data.tipo !== 'ingreso' && (r.data.real === undefined || r.data.real === null))
  if (missingReal.length) blockers.push(`Faltan gastos reales en ${missingReal.length} línea(s) del presupuesto`)
  const openSponsors = byKind(rows, 'sponsor').filter((r) => r.data.etapa === 'confirmado')
  if (openSponsors.length) blockers.push(`${openSponsors.length} sponsor(s) confirmado(s) sin cobrar ni marcar incobrables`)
  const unpaidVendors = byKind(rows, 'vendor').filter((r) => !r.data.saldo_pagado)
  if (unpaidVendors.length) blockers.push(`${unpaidVendors.length} proveedor(es) con saldo sin pagar`)
  if (!byKind(rows, 'learning').some((r) => String(r.data.texto || '').trim())) blockers.push('Cargá al menos un aprendizaje')
  return blockers
}

type Seed = { kind: RowKind; data: RowData }

const check = (fase: 'antes' | 'durante' | 'despues', ...items: string[]): Seed[] =>
  items.map((item) => ({ kind: 'checklist', data: { fase, item, hecho: false } }))
const task = (titulo: string, area: string): Seed => ({ kind: 'task', data: { titulo, area, estado: 'pendiente', prioridad: 'media' } })
const expense = (categoria: string, concepto: string): Seed => ({ kind: 'budget', data: { tipo: 'egreso', categoria, concepto, estado: 'pendiente' } })
const kpi = (nombre: string, unidad: string): Seed => ({ kind: 'kpi', data: { nombre, unidad } })

const COMMON: Seed[] = [
  ...check('antes', 'Fecha y lugar confirmados por escrito', 'Presupuesto aprobado', 'Responsable por área asignado', 'Seguro y permisos gestionados', 'Plan de comunicación armado', 'Lista de invitados / asistentes cargada', 'Prueba de puerta (20 QR, 2 celulares, uno en modo avión)'),
  ...check('durante', 'Armado y llegada de proveedores', 'Puerta abierta con PIN activo', 'Fotos y contenido para redes', 'Registro de incidentes'),
  ...check('despues', 'Gastos reales cargados', 'Sponsors cobrados', 'Proveedores pagados', 'Reporte para sponsors enviado', 'Aprendizajes cargados'),
  kpi('Asistentes', 'personas'),
  task('Definir responsables por área', 'produccion'),
  task('Armar presupuesto estimado', 'finanzas'),
]

export const TEMPLATES: Record<EventType, Seed[]> = {
  activacion: [
    ...COMMON,
    ...check('antes', 'Comercios adheridos confirmados', 'Premios / beneficios cargados en la app'),
    task('Confirmar comercios participantes', 'comercial'),
    task('Cargar evento en la app Pasito', 'producto'),
    task('Piezas para redes y push', 'comunicacion'),
    expense('produccion', 'Ambientación / stand'),
    expense('merch', 'Premios y merch'),
    expense('comunicacion', 'Pauta y piezas'),
    kpi('Usuarios que canjearon', 'usuarios'),
    kpi('Comercios participantes', 'comercios'),
  ],
  fiesta: [
    ...COMMON,
    ...check('antes', 'Contrato de venue firmado', 'Line-up confirmado', 'Seguridad y ambulancia contratadas', 'Ticketera configurada'),
    task('Cerrar line-up', 'produccion'),
    task('Configurar ticketera', 'producto'),
    task('Contratar seguridad y ambulancia', 'produccion'),
    expense('venue', 'Alquiler del venue'),
    expense('tecnica', 'Sonido e iluminación'),
    expense('personal', 'Seguridad'),
    expense('permisos', 'Seguro / ambulancia'),
    expense('produccion', 'Artistas'),
    kpi('Entradas vendidas', 'entradas'),
  ],
  corporativo: [
    ...COMMON,
    ...check('antes', 'Brief del cliente aprobado', 'Propuesta y presupuesto firmados'),
    task('Brief con el cliente', 'comercial'),
    task('Propuesta y cotización', 'comercial'),
    expense('venue', 'Espacio'),
    expense('catering', 'Catering'),
    expense('produccion', 'Producción y ambientación'),
    kpi('Participantes de la empresa', 'personas'),
  ],
  caminata: [
    ...COMMON,
    ...check('antes', 'Recorrido definido y validado', 'Hidratación y puestos', 'Permiso municipal para vía pública'),
    task('Definir recorrido', 'produccion'),
    task('Pedir permiso de vía pública', 'legales'),
    task('Cargar desafío / evento en la app', 'producto'),
    expense('logistica', 'Hidratación'),
    expense('permisos', 'Seguro de participantes'),
    expense('merch', 'Remeras / kits'),
    kpi('Kilómetros / pasos totales', 'pasos'),
  ],
  otro: COMMON,
}

// Duplicar un evento: copia estructura, sin fechas ni montos reales; los "a mejorar" pasan a tareas.
export function duplicateSeeds(rows: GestionRow[]): Seed[] {
  const seeds: Seed[] = []
  for (const row of rows) {
    const d = { ...row.data }
    switch (row.kind) {
      case 'team':
      case 'contact':
        seeds.push({ kind: row.kind, data: d })
        break
      case 'task':
        seeds.push({ kind: 'task', data: { titulo: d.titulo, area: d.area, owner: d.owner, prioridad: d.prioridad, estado: 'pendiente' } })
        break
      case 'checklist':
        seeds.push({ kind: 'checklist', data: { ...d, hecho: false } })
        break
      case 'budget':
        seeds.push({ kind: 'budget', data: { tipo: d.tipo, categoria: d.categoria, concepto: d.concepto, presupuestado: d.presupuestado, responsable: d.responsable, estado: 'pendiente' } })
        break
      case 'kpi':
        seeds.push({ kind: 'kpi', data: { nombre: d.nombre, objetivo: d.objetivo, unidad: d.unidad } })
        break
      case 'sponsor':
        // Los sponsors vuelven al inicio del pipeline para recontactarlos.
        seeds.push({ kind: 'sponsor', data: { marca: d.marca, logo: d.logo, nivel: d.nivel, contacto: d.contacto, responsable: d.responsable, etapa: 'contacto', contrato: 'no' } })
        break
      case 'learning':
        if (d.tipo === 'mejorar' && d.texto) seeds.push({ kind: 'task', data: { titulo: `Mejorar: ${String(d.texto)}`, estado: 'pendiente', prioridad: 'alta' } })
        break
      default:
        break
    }
  }
  return seeds
}

export type AttendanceStats = {
  total: number
  inside: number
  companionsIn: number
  byOrigin: { origin: string; total: number; inside: number }[]
}

export function attendanceStats(attendees: { origin: string; status: string; companions_in: number }[]): AttendanceStats {
  const byOrigin = new Map<string, { total: number; inside: number }>()
  let inside = 0
  let companionsIn = 0
  for (const a of attendees) {
    const entry = byOrigin.get(a.origin) ?? { total: 0, inside: 0 }
    entry.total += 1
    if (a.status !== 'anotado') {
      entry.inside += 1
      inside += 1
    }
    companionsIn += a.companions_in
    byOrigin.set(a.origin, entry)
  }
  return {
    total: attendees.length,
    inside,
    companionsIn,
    byOrigin: [...byOrigin.entries()].map(([origin, v]) => ({ origin, ...v })),
  }
}

// Ingresos por franja de 15 minutos (hora local) para ver picos en la puerta.
export function arrivalsBy15Min(timestamps: string[]): { slot: string; count: number }[] {
  const slots = new Map<number, number>()
  for (const ts of timestamps) {
    const time = Date.parse(ts)
    if (Number.isNaN(time)) continue
    const slot = Math.floor(time / 900_000) * 900_000
    slots.set(slot, (slots.get(slot) ?? 0) + 1)
  }
  const fmt = new Intl.DateTimeFormat('es-AR', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false })
  return [...slots.entries()].sort((a, b) => a[0] - b[0]).map(([slot, count]) => ({ slot: fmt.format(new Date(slot)), count }))
}
