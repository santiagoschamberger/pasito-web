import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import marketingStyles from '../../marketing.module.css'
import { MarketingFooter, MarketingNav } from '@/components/marketing/Marketing'
import {
  BANNER_PRICE_VALID_UNTIL,
  BANNER_PLACEMENTS,
  MINIMUM_CAMPAIGN_ARS,
  MINIMUM_CAMPAIGN_USD,
  getBannerPlacementCpm,
} from '@/lib/banner-campaign-pricing'
import { formatCompactCountryCount, formatCountryCount } from '@/lib/country-audience'
import { getCountryAudienceMetrics } from '@/lib/country-audience-metrics'

import { BannerPlanner } from './BannerPlanner'
import styles from './calculator.module.css'

function formatArs(value: number) {
  return `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value)}`
}

function formatUsd(value: number) {
  return `USD ${new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(value)}`
}

export const revalidate = 259_200

export const metadata: Metadata = {
  title: 'Calculadora de banners — Pasito para Marcas',
  description: 'Estimá inversión, impresiones y resultados para una campaña de banners en Pasito.',
  openGraph: {
    title: 'Calculadora de banners — Pasito para Marcas',
    description: 'Elegí ubicación, mercado y duración para estimar tu campaña en Pasito.',
    type: 'website',
  },
}

export default async function BannerCalculatorPage() {
  const countryAudience = await getCountryAudienceMetrics()
  const lowestArgentinaCpm = Math.min(...BANNER_PLACEMENTS.map((placement) => getBannerPlacementCpm(placement.id, 'AR')))
  const lowestUruguayCpm = Math.min(...BANNER_PLACEMENTS.map((placement) => getBannerPlacementCpm(placement.id, 'UY')))

  return (
    <main className={marketingStyles.page}>
      <MarketingNav active="marcas" contextualLink={{ href: '/marcas', label: 'Ver Marcas' }} />

      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.container}>
          <Link className={styles.backLink} href="/marcas"><ArrowLeft size={16} /> Pasito para Marcas</Link>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Planificador de campaña</span>
            <h1>Elegí dónde aparecer.<br /><span>Calculá cuánto invertir.</span></h1>
            <p>Armá una campaña a medida según ubicación, mercado y duración. En menos de un minuto tenés una estimación lista para compartir.</p>
          </div>
          <div className={styles.heroFacts}>
            <div><strong>Desde {formatArs(lowestArgentinaCpm)}</strong><span>CPM vigente en Argentina</span></div>
            <div><strong>Desde {formatUsd(lowestUruguayCpm)}</strong><span>CPM vigente en Uruguay</span></div>
            <div><strong>{formatArs(MINIMUM_CAMPAIGN_ARS)} / {formatUsd(MINIMUM_CAMPAIGN_USD)}</strong><span>inversión mínima por mercado</span></div>
          </div>
          <p className={styles.priceValidity}>Tarifas vigentes hasta el {BANNER_PRICE_VALID_UNTIL}.</p>
        </div>
      </header>

      <BannerPlanner />

      <section className={styles.audienceSection} aria-labelledby="market-audience-title">
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <span>Alcance por país</span>
            <h2 id="market-audience-title">Dos mercados.<br />Dos escalas distintas.</h2>
            <p>La calculadora adapta moneda y precio según el país. Estas cifras ayudan a entender el tamaño disponible antes de segmentar.</p>
          </div>
          <div className={styles.audienceGrid}>
            {countryAudience.map((country) => (
              <article key={country.code}>
                <header>
                  <div><span>{country.name}</span><strong>{formatCountryCount(country.registered)}</strong><small>personas registradas</small></div>
                  <em>{country.code === 'AR' ? 'Precios vigentes en ARS' : 'Precios vigentes en USD'}</em>
                </header>
                <div className={styles.audienceStats}>
                  <div><strong>+{formatCompactCountryCount(country.active30d)}</strong><span>activas en 30 días</span></div>
                  <div><strong>+{formatCompactCountryCount(country.newUsers30d)}</strong><span>nuevas en 30 días</span></div>
                  <div><strong>{country.youngShare}%</strong><span>tiene entre 18 y 34</span></div>
                </div>
                <p>Mayor densidad: {country.cities.slice(0, 3).map((city) => city.label).join(', ')}.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.creativeSection}`} aria-labelledby="creative-spec-title">
        <div className={styles.creativeSpec}>
          <div className={styles.creativeCopy}>
            <span>Especificación creativa</span>
            <h2 id="creative-spec-title">La pieza que necesitamos.</h2>
            <p>Recomendado: imagen horizontal 16:5, ideal 2400 × 750 px o más. La app la recorta con <strong>cover</strong> y esquinas redondeadas.</p>
          </div>
          <div className={styles.creativeAsset}>
            <div className={styles.ratioPreview} aria-hidden="true"><span>16:5</span><i>Tu banner</i></div>
            <div><small>Tamaño ideal</small><strong>2400 × 750 px</strong><span>o una resolución mayor con la misma proporción</span></div>
          </div>
        </div>
      </section>

      <MarketingFooter brands pressTone="white" />
    </main>
  )
}
