import { NextRequest, NextResponse } from 'next/server'

import { db, handleError, HttpError, listUsers, logActivity, readJson, requireUser } from '@/lib/gestion/server'

// Admin: invitar a alguien (incluso sin mail @pasito.app) o cambiarle el rol.
export async function POST(request: NextRequest) {
  try {
    const admin = await requireUser({ admin: true })
    const body = await readJson<{ email?: string; name?: string; role?: string; phone?: string }>(request)
    const email = (body.email ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Email inválido.')
    const role = ['admin', 'equipo', 'lectura'].includes(body.role ?? '') ? body.role : 'equipo'
    const { error } = await db().from('gestion_users').upsert({
      email,
      role,
      ...(body.name ? { name: body.name.slice(0, 80) } : {}),
      ...(body.phone !== undefined ? { phone: body.phone.slice(0, 40) } : {}),
    })
    if (error) throw error
    await logActivity({ eventId: null, actor: admin.email, action: 'user', entity: 'user', entityId: email, summary: `dio rol ${role} a ${email}` })
    return NextResponse.json({ users: await listUsers() })
  } catch (error) {
    return handleError(error)
  }
}
