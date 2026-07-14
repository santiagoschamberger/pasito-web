import { createHash, createHmac } from 'node:crypto'
import { cookies } from 'next/headers'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const DATA_ROOM_COOKIE = 'pasito_data_room_session'
export const DATA_ROOM_SESSION_HOURS = 12

let serviceClient: SupabaseClient | null = null

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Falta configurar Supabase para la sala de datos.')
  }

  return { url, serviceRoleKey }
}
export function getDataRoomClient() {
  if (!serviceClient) {
    const { url, serviceRoleKey } = getSupabaseConfig()
    serviceClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  return serviceClient
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function getDataRoomClientHash(requestHeaders: Headers) {
  const { serviceRoleKey } = getSupabaseConfig()
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || requestHeaders.get('x-real-ip') || 'unknown'

  return createHmac('sha256', serviceRoleKey)
    .update(`data-room-client:${ip}`)
    .digest('hex')
}

export type DataRoomAccess = {
  id: string
  brand_name: string
  slug: string
  is_active: boolean
  expires_at: string | null
}

export type ValidDataRoomSession = {
  id: string
  accessId: string
  brandName: string
  slug: string
  expiresAt: string
}

export async function getValidDataRoomSession(slug: string): Promise<ValidDataRoomSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(DATA_ROOM_COOKIE)?.value
  if (!token) return null

  const db = getDataRoomClient()
  const now = new Date().toISOString()
  const { data: session } = await db
    .from('brand_data_room_sessions')
    .select('id, access_id, expires_at')
    .eq('token_hash', hashSessionToken(token))
    .gt('expires_at', now)
    .maybeSingle()

  if (!session) return null

  const { data: access } = await db
    .from('brand_data_room_accesses')
    .select('id, brand_name, slug, is_active, expires_at')
    .eq('id', session.access_id)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!access || (access.expires_at && access.expires_at <= now)) return null

  return {
    id: session.id,
    accessId: access.id,
    brandName: access.brand_name,
    slug: access.slug,
    expiresAt: session.expires_at,
  }
}
