import type { Metadata } from 'next'
import Link from 'next/link'
import { Footprints, Gift } from 'lucide-react'

import { MarketingFooter, MarketingNav, StoreButtons } from '@/components/marketing/Marketing'
import marketing from '@/app/marketing.module.css'
import styles from './beneficios.module.css'

export const metadata: Metadata = {
  title: 'Beneficios — Pasito',
  description: 'Descubrí los beneficios de Pasito y convertí tus pasos en experiencias.',
  alternates: { canonical: 'https://www.pasito.app/beneficios' },
  // Remove when the real catalog is ready to be indexed.
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Beneficios — Pasito',
    description: 'Tus pasos te llevan a cosas lindas. Descubrí los beneficios de Pasito.',
    url: 'https://www.pasito.app/beneficios',
    type: 'website',
  },
}

export default function BenefitsPage() {
  return (
    <div className={marketing.page}>
      <MarketingNav contextualLink={{ href: '#catalogo', label: 'Beneficios' }} />
      <main className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}><Footprints size={18} aria-hidden="true" /> Beneficios Pasito</p>
          <h1>Tus pasos te llevan a <span>cosas lindas.</span></h1>
          <p className={styles.intro}>Caminá, sumá Pasitos y descubrí nuevos lugares para disfrutar.</p>
        </header>

        <section id="catalogo" className={styles.catalog} aria-labelledby="catalogo-title">
          <span className={styles.gift}><Gift size={32} aria-hidden="true" /></span>
          <p className={styles.eyebrow}>Próximamente en la web</p>
          <h2 id="catalogo-title">Estamos preparando el catálogo de beneficios.</h2>
          <p>Mientras tanto, explorá los premios y comercios disponibles desde la app de Pasito.</p>
          <StoreButtons />
        </section>

        <div className={styles.commerce}>
          <p>¿Querés que tu comercio sea parte?</p>
          <Link href="/comercios">Conocé cómo sumarte <span aria-hidden="true">↗</span></Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  )
}
