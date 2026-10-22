import { NextRequest, NextResponse } from 'next/server'

import { db, handleError, HttpError, logActivity, readJson, requireUser } from '@/lib/gestion/server'
import { formatMoney, normalizeValue, SECTIONS, type GestionRow } from '@/lib/gestion/schema'

type Params = { params: Promise<{ id: string }> }

async function loadRow(id: string, includeDeleted = false) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, 'Fila no encontrada.')
  let query = db().from('gestion_rows').select('*, gestion_events!inner(status)').eq('id', id)
  if (!includeDeleted) query = query.is('deleted_at', null)
  const { data } = await query.maybeSingle()
  if (!data) throw new HttpError(404, 'Fila no encontrada.')
  if ((data.gestion_events as { status: string }).status === 'cerrado') throw new HttpError(409, 'El evento está cerrado.')
  return data as GestionRow & { deleted_at: string | null }
}

function rowLabel(row: GestionRow): string {
  const d = row.data
  return String(d.titulo || d.concepto || d.marca || d.proveedor || d.persona || d.item || d.nombre || d.tramite || d.texto || SECTIONS[row.kind].singular).slice(0, 60)
}

function display(type: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'vacío'
  if (type === 'money') return formatMoney(Number(value))
  if (type === 'bool') return value ? 'sí' : 'no'
  return String(value).slice(0, 60)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    const body = await readJson<{ field?: string; value?: unknown; restore?: boolean; position?: number }>(request)

    if (body.restore) {
      const row = await loadRow(id, true)
      await db().from('gestion_rows').update({ deleted_at: null, updated_by: user.email }).eq('id', id)
      await logActivity({ eventId: row.event_id, actor: user.email, action: 'restore', entity: row.kind, entityId: id, summary: `recuperó "${rowLabel(row)}" en ${SECTIONS[row.kind].title}` })
      return NextResponse.json({ ok: true })
    }

    const row = await loadRow(id)
    const column = SECTIONS[row.kind].columns.find((c) => c.key === body.field)
    if (!column) throw new HttpError(400, 'Campo inválido.')
    const value = normalizeValue(column, body.value)
    if (value === undefined) throw new HttpError(400, `Valor inválido para ${column.label}.`)

    const { data, error } = await db().rpc('gestion_set_row_field', { p_id: id, p_field: column.key, p_value: value, p_actor: user.email })
    if (error) throw error
    if (!data) throw new HttpError(404, 'Fila no encontrada.')
    const result = data as { before: unknown; row: GestionRow }
    if (JSON.stringify(result.before ?? null) !== JSON.stringify(value)) {
      const option = (v: unknown) => column.options?.find((o) => o.value === v)?.label ?? v
      await logActivity({
        eventId: row.event_id,
        actor: user.email,
        action: 'update',
        entity: row.kind,
        entityId: id,
        summary: `cambió ${column.label} de "${rowLabel(result.row)}": ${display(column.type, option(result.before))} → ${display(column.type, option(value))}`,
        before: { [column.key]: result.before },
        after: { [column.key]: value },
      })
    }
    return NextResponse.json({ row: result.row })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    const row = await loadRow(id)
    await db().from('gestion_rows').update({ deleted_at: new Date().toISOString(), updated_by: user.email }).eq('id', id)
    await logActivity({ eventId: row.event_id, actor: user.email, action: 'delete', entity: row.kind, entityId: id, summary: `borró "${rowLabel(row)}" de ${SECTIONS[row.kind].title}`, before: row.data })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
