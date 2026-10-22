import { NextRequest, NextResponse } from 'next/server'

import { db, getEvent, handleError, requireUser } from '@/lib/gestion/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser()
    const { id } = await params
    await getEvent(id)
    const before = request.nextUrl.searchParams.get('before')
    let query = db().from('gestion_activity').select('id, event_id, actor, action, entity, summary, created_at').eq('event_id', id).order('id', { ascending: false }).limit(100)
    if (before && /^\d+$/.test(before)) query = query.lt('id', Number(before))
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ activity: data ?? [] })
  } catch (error) {
    return handleError(error)
  }
}
