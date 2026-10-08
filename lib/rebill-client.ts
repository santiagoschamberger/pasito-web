/**
 * Client-side Rebill configuration helpers.
 * 
 * These helpers ensure the client sends its build-time Rebill account
 * configuration to the server, allowing detection of stale browser tabs
 * that were built with an old Rebill public key.
 */

export type ClientRebillAccount = 'SIN_IVA' | 'CON_IVA' | 'SILVER_LEGACY' | null

/**
 * Determine which Rebill account this client bundle was built for.
 * Returns null if Rebill routing is disabled or keys are not configured.
 * 
 * This function should be called when creating checkout intents to ensure
 * the server can detect stale browser tabs with mismatched keys.
 */
export function getClientRebillAccount(): ClientRebillAccount {
  const routingEnabled = process.env.NEXT_PUBLIC_REBILL_ACCOUNT_ROUTING_ENABLED === 'true'
  
  if (!routingEnabled) {
    // Legacy mode: use the historical CON_IVA key
    return process.env.NEXT_PUBLIC_REBILL_PUBLIC_KEY ? 'CON_IVA' : null
  }
  
  // When routing is enabled, determine which account based on the public key used
  const sinIvaKey = process.env.NEXT_PUBLIC_REBILL_NO_IVA_PUBLIC_KEY
  const conIvaKey = process.env.NEXT_PUBLIC_REBILL_PUBLIC_KEY
  
  // For SIN_IVA mode (standard checkout)
  if (sinIvaKey && sinIvaKey.trim()) {
    return 'SIN_IVA'
  }
  
  // Fallback to CON_IVA if only legacy key is available
  if (conIvaKey && conIvaKey.trim()) {
    return 'CON_IVA'
  }
  
  return null
}

/**
 * Get which Rebill account Silver event checkout was built for.
 * Silver may use either a dedicated key or route to one of the standard accounts.
 */
export function getClientRebillAccountForSilver(): ClientRebillAccount {
  const routingEnabled = process.env.NEXT_PUBLIC_REBILL_ACCOUNT_ROUTING_ENABLED === 'true'
  
  if (!routingEnabled) {
    // Legacy: Silver uses its dedicated key or falls back to standard
    return process.env.NEXT_PUBLIC_SILVER_REBILL_PUBLIC_KEY ? 'SILVER_LEGACY' 
      : process.env.NEXT_PUBLIC_REBILL_PUBLIC_KEY ? 'CON_IVA'
      : null
  }
  
  // When routing is enabled, Silver routes to SIN_IVA by default
  const sinIvaKey = process.env.NEXT_PUBLIC_REBILL_NO_IVA_PUBLIC_KEY
  const silverKey = process.env.NEXT_PUBLIC_SILVER_REBILL_PUBLIC_KEY
  const conIvaKey = process.env.NEXT_PUBLIC_REBILL_PUBLIC_KEY
  
  // Silver-specific key takes precedence (though it may route to same account)
  if (silverKey && silverKey.trim()) {
    // If Silver has a dedicated key, it's likely routed to SIN_IVA or remains legacy
    // For the stale-tab check, treat it as routing to SIN_IVA when routing is enabled
    return 'SIN_IVA'
  }
  
  if (sinIvaKey && sinIvaKey.trim()) {
    return 'SIN_IVA'
  }
  
  if (conIvaKey && conIvaKey.trim()) {
    return 'CON_IVA'
  }
  
  return null
}
