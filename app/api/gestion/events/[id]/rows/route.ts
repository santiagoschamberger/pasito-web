import { NextRequest, NextResponse } from 'next/server'

import { db, getEvent, handleError, HttpError, logActivity, readJson, requireUser } from '@/lib/gestion/server'
import { isRowKind, normalizeValue, SECTIONS, type RowData } from '@/lib/gestion/schema'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser({ edit: true })
    const { id } = await params
    const event = await getEvent(id)
    if (event.status === 'cerrado') throw new HttpError(409, 'El evento está cerrado.')
    const body = await readJson<{ kind?: unknown; data?: Record<string, unknown> }>(request)
    if (!isRowKind(body.kind)) throw new HttpError(400, 'Sección inválida.')
    const section = SECTIONS[body.kind]
    const data: RowData = {}
    for (const column of section.columns) {
      const value = body.data?.[column.key]
      if (value === undefined) continue
      const clean = normalizeValue(column, value)
      if (clean !== undefined && clean !== null) data[column.key] = clean
    }
    if (body.kind === 'learning') data.autor = user.email

    const { data: last } = await db().from('gestion_rows').select('position').eq('event_id', id).eq('kind', body.kind).order('position', { ascending: false }).limit(1).maybeSingle()
    const { data: row, error } = await db()
      .from('gestion_rows')
      .insert({ event_id: id, kind: body.kind, data, position: (last?.position ?? 0) + 1, created_by: user.email, updated_by: user.email })
      .select('id, event_id, kind, data, position, created_by, updated_by, created_at, updated_at')
      .single()
    if (error) throw error
    await logActivity({ eventId: id, actor: user.email, action: 'create', entity: body.kind, entityId: row.id, summary: `agregó ${section.singular} en ${section.title}` })
    return NextResponse.json({ row })
  } catch (error) {
    return handleError(error)
  }
}
