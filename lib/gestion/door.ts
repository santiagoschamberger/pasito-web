import 'server-only'

import { db } from './server'

// Lo mínimo que ve la puerta: sin emails, teléfonos ni plata.
export const DOOR_ATTENDEE_COLUMNS = 'id, name, kind, origin, companions, companions_in, notes, qr_token, app_code, dni_last3, status, checked_in_at, checked_in_device, updated_at'

export async function doorAttendees(eventId: string, since?: string) {
  const all = []
  for (let from = 0; ; from += 1000) {
    let query = db().from('gestion_attendees').select(`${DOOR_ATTENDEE_COLUMNS}, deleted_at`).eq('event_id', eventId).order('id').range(from, from + 999)
    query = since ? query.gt('updated_at', since) : query.is('deleted_at', null)
    const { data, error } = await query
    if (error) throw error
    all.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return all
}
