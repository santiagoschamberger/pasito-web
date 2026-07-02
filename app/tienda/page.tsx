import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { StoreClient } from './StoreClient'

export const metadata: Metadata = {
  title: 'Tienda Pasito — Remera oficial',
  description: 'La remera oficial de Pasito. Algodón premium, edición limitada.',
}

// Stock siempre fresco en cada carga.
export const revalidate = 0

type StockMap = Record<string, Record<string, number>>

async function getStock(): Promise<StockMap | undefined> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return undefined
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
  const { data, error } = await supabase.from('tienda_stock').select('base, size, qty')
  if (error || !data || data.length === 0) {
    if (error) console.error('Tienda stock error:', error.message)
    return undefined // StoreClient usa su stock por defecto
  }
  const map: StockMap = {}
  for (const row of data as { base: string; size: string; qty: number }[]) {
    ;(map[row.base] ??= {})[row.size] = row.qty
  }
  return map
}

export default async function TiendaPage() {
  const stock = await getStock()

  return (
    <main className="flex min-h-[100dvh] flex-col" style={{ background: '#FFFFFF', color: '#1B1B1B' }}>
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" aria-label="Pasito">
          <img src="/logoverde.png" alt="Pasito" className="h-6 w-auto sm:h-7" />
        </Link>
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#0C6B45' }}>
          Tienda
        </span>
      </header>

      <div className="flex-1">
        <StoreClient stock={stock} />
      </div>

      <footer className="px-5 pb-6 pt-4 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-medium" style={{ color: '#9A9A92' }}>
          <Link href="/privacidad" className="underline-offset-4 hover:underline">
            Política de privacidad
          </Link>
          <Link href="/terminos" className="underline-offset-4 hover:underline">
            Términos y condiciones
          </Link>
          <Link href="/contacto" className="underline-offset-4 hover:underline">
            Contacto
          </Link>
        </nav>
      </footer>
    </main>
  )
}
