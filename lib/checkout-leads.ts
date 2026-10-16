import type { SupabaseClient } from '@supabase/supabase-js'

export type CheckoutLeadSource = 'pasito_club' | 'silver' | 'tomate' | 'walking_club_uy' | 'tienda'

export function normalizeCheckoutEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null
  return email
}

// Guarda el email de quien inicia un checkout para retargeting. Nunca rompe la
// compra: si falla, sólo queda logueado.
export async function recordCheckoutLead(
  db: SupabaseClient,
  lead: { email: string; source: CheckoutLeadSource },
): Promise<void> {
  try {
    const { error } = await db.rpc('record_checkout_lead', {
      p_email: lead.email,
      p_source: lead.source,
    })
    if (error) console.error(`[checkout-leads] No se pudo guardar el lead (${lead.source}):`, error)
  } catch (error) {
    console.error(`[checkout-leads] No se pudo guardar el lead (${lead.source}):`, error)
  }
}
