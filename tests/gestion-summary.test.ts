import assert from 'node:assert/strict'
import test from 'node:test'

import { mapAttendeeRows, parseCsv } from '../lib/gestion/csv.ts'
import type { GestionEvent, GestionRow, RowData, RowKind } from '../lib/gestion/schema.ts'
import { normalizeValue, SECTIONS } from '../lib/gestion/schema.ts'
import { arrivalsBy15Min, closeBlockers, duplicateSeeds, effectiveStatus, eventAlerts, moneySummary } from '../lib/gestion/summary.ts'

let n = 0
const row = (kind: RowKind, data: RowData): GestionRow => ({
  id: `r${++n}`, event_id: 'e1', kind, data, position: n, created_by: null, updated_by: null, created_at: '', updated_at: '',
})

const event = (over: Partial<GestionEvent> = {}): GestionEvent => ({
  id: 'e1', name: 'Test', type: 'otro', status: 'confirmado', start_date: '2026-11-20', start_time: null, end_date: null,
  venue: null, city: null, capacity: null, owner_email: 'a@pasito.app', drive_url: null, objective: null, notes: null,
  pasito_event_ids: [], web_tiers: [], series: null, cover_url: null, door_allow_walkins: false, door_allow_reentry: false, archived_at: null, created_by: null,
  created_at: '', updated_at: '', ...over,
})

test('sponsors only count once confirmed, in-kind never hits cash, vendors add to expenses', () => {
  const money = moneySummary([
    row('budget', { tipo: 'egreso', categoria: 'venue', presupuestado: 1000, real: 800, estado: 'pagado' }),
    row('budget', { tipo: 'ingreso', presupuestado: 500, estado: 'pendiente' }),
    row('sponsor', { etapa: 'negociacion', dinero: 9999 }),
    row('sponsor', { etapa: 'confirmado', dinero: 2000, canje: 300 }),
    row('sponsor', { etapa: 'cobrado', dinero: 1000 }),
    row('vendor', { total: 600, sena: 200, sena_pagada: true }),
  ])
  assert.equal(money.incomeProjected, 3500)
  assert.equal(money.expenseProjected, 1600)
  assert.equal(money.resultProjected, 1900)
  assert.equal(money.incomeReal, 1000)
  assert.equal(money.expenseReal, 1000)
  assert.equal(money.toCollect, 2500)
  assert.equal(money.toPay, 400)
  assert.equal(money.inKind, 300)
})

test('status turns en curso / realizado from the date', () => {
  assert.equal(effectiveStatus(event(), '2026-11-19'), 'confirmado')
  assert.equal(effectiveStatus(event(), '2026-11-20'), 'en_curso')
  assert.equal(effectiveStatus(event({ end_date: '2026-11-22' }), '2026-11-22'), 'en_curso')
  assert.equal(effectiveStatus(event(), '2026-11-21'), 'realizado')
  assert.equal(effectiveStatus(event({ status: 'cancelado' }), '2026-11-20'), 'cancelado')
  assert.equal(effectiveStatus(event({ status: 'idea' }), '2026-11-21'), 'idea')
})

test('alerts flag overdue tasks, unsigned sponsors and late permits', () => {
  const alerts = eventAlerts(event({ status: 'produccion' }), [
    row('task', { titulo: 'Vencida', due: '2026-11-01', owner: 'a@pasito.app' }),
    row('task', { titulo: 'Hecha', due: '2026-11-01', estado: 'hecha' }),
    row('task', { titulo: 'Sin dueño' }),
    row('sponsor', { marca: 'Marca B', etapa: 'confirmado', contrato: 'enviado', dinero: 1000 }),
    row('permit', { tramite: 'Municipio', estado: 'pendiente' }),
  ], '2026-11-12')
  const texts = alerts.map((a) => a.text)
  assert.ok(texts.includes('Tarea vencida: Vencida'))
  assert.ok(texts.includes('Tarea sin responsable: Sin dueño'))
  assert.ok(texts.includes('Marca B: confirmado sin contrato firmado'))
  assert.ok(texts.some((t) => t.startsWith('Permiso pendiente a 8 días')))
  assert.ok(!texts.some((t) => t.includes('Hecha')))
  assert.equal(alerts[0].level, 'critical')
})

test('closing requires real expenses, settled sponsors and a learning', () => {
  const rows = [row('budget', { tipo: 'egreso', presupuestado: 100 }), row('sponsor', { etapa: 'confirmado' })]
  assert.equal(closeBlockers(rows).length, 3)
  assert.deepEqual(closeBlockers([row('budget', { tipo: 'egreso', real: 90 }), row('sponsor', { etapa: 'caido' }), row('learning', { texto: 'ok' })]), [])
})

test('duplicating keeps structure, drops real amounts and turns "a mejorar" into tasks', () => {
  const seeds = duplicateSeeds([
    row('budget', { tipo: 'egreso', concepto: 'Sonido', presupuestado: 100, real: 120, estado: 'pagado' }),
    row('task', { titulo: 'Flyer', due: '2026-01-01', estado: 'hecha' }),
    row('learning', { tipo: 'mejorar', texto: 'Llegar antes' }),
    row('learning', { tipo: 'bien', texto: 'Todo' }),
    row('sponsor', { marca: 'X' }),
  ])
  assert.deepEqual(seeds.find((s) => s.kind === 'budget')?.data, { tipo: 'egreso', categoria: undefined, concepto: 'Sonido', presupuestado: 100, responsable: undefined, estado: 'pendiente' })
  assert.equal(seeds.find((s) => s.data.titulo === 'Flyer')?.data.due, undefined)
  assert.ok(seeds.some((s) => s.kind === 'task' && s.data.titulo === 'Mejorar: Llegar antes'))
  assert.deepEqual(seeds.find((s) => s.kind === 'sponsor')?.data.etapa, 'contacto')
})

test('values are validated per column', () => {
  const money = SECTIONS.budget.columns.find((c) => c.key === 'presupuestado')!
  assert.equal(normalizeValue(money, '1.500.000'), 1500000)
  assert.equal(normalizeValue(money, 'abc'), undefined)
  const select = SECTIONS.task.columns.find((c) => c.key === 'estado')!
  assert.equal(normalizeValue(select, 'hecha'), 'hecha')
  assert.equal(normalizeValue(select, 'otra'), undefined)
  const url = SECTIONS.budget.columns.find((c) => c.key === 'comprobante')!
  assert.equal(normalizeValue(url, 'javascript:alert(1)'), undefined)
})

test('CSV import maps ticketing exports and keeps only DNI last 3', () => {
  const rows = parseCsv('Nombre;Apellido;E-mail;DNI;Nro Ticket\n"Ana";Pérez;ana@x.com;30.123.456;A-1\nJuan;"Gómez, h";;;A-2\n')
  const { items } = mapAttendeeRows(rows)
  assert.equal(items.length, 2)
  assert.deepEqual(items[0], { name: 'Ana Pérez', email: 'ana@x.com', phone: undefined, dni_last3: '456', companions: undefined, notes: undefined, origin_ref: 'A-1', kind: undefined })
  assert.equal(items[1].name, 'Juan Gómez, h')
  assert.equal(mapAttendeeRows(parseCsv('Ana\nBeto')).items.length, 2)
})

test('arrivals are bucketed by 15 minutes in chronological order', () => {
  const slots = arrivalsBy15Min(['2026-11-20T23:50:00Z', '2026-11-20T23:05:00Z', '2026-11-20T23:14:59Z', '2026-11-21T00:01:00Z'])
  assert.deepEqual(slots.map((s) => s.count), [2, 1, 1])
  assert.equal(slots[0].slot, '20:00')
})
