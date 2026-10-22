import { NextRequest, NextResponse } from 'next/server'

import { db, handleError, requireUser } from '@/lib/gestion/server'

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80)
    let query = db().from('partner_events').select('id, title, start_at, city, max_participants, participant_count, partner_name').order('start_at', { ascending: false }).limit(20)
    if (q) query = query.ilike('title', `%${q.replace(/[%_,()]/g, ' ')}%`)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ events: data ?? [] })
  } catch (error) {
    return handleError(error)
  }
}
