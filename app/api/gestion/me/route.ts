import { NextRequest, NextResponse } from 'next/server'

import { db, handleError, listUsers, readJson, requireUser } from '@/lib/gestion/server'

export async function GET() {
  try {
    const user = await requireUser()
    return NextResponse.json({ user, users: await listUsers() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await readJson<{ name?: unknown; phone?: unknown }>(request)
    const updates: Record<string, string | null> = {}
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim().slice(0, 80)
    if (typeof body.phone === 'string') updates.phone = body.phone.trim().slice(0, 40) || null
    const { error } = await db().from('gestion_users').update(updates).eq('email', user.email)
    if (error) throw error
    return NextResponse.json({ users: await listUsers() })
  } catch (error) {
    return handleError(error)
  }
}
