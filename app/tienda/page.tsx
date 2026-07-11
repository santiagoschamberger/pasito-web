import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { MarketingNav, PressSection } from '@/components/marketing/Marketing'
import { StoreClient } from './StoreClient'
import marketingStyles from '../marketing.module.css'
import styles from './tienda.module.css'

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
    <main className={`${styles.storePage} ${marketingStyles.page}`}>
      <MarketingNav active="merch" />

      <StoreClient stock={stock} />

      <PressSection />

      <footer className={styles.storeFooter}>
        <nav>
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
