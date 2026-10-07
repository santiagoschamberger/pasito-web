// Both NEXT_PUBLIC_* reads must stay literal so Next inlines them at build time.
const NO_IVA_PUBLIC_KEY = process.env.NEXT_PUBLIC_REBILL_NO_IVA_PUBLIC_KEY ?? ''
const FALLBACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_REBILL_PUBLIC_KEY ?? ''

export const REBILL_PUBLIC_KEY = NO_IVA_PUBLIC_KEY || FALLBACK_PUBLIC_KEY
