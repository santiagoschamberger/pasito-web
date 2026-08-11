import Image from 'next/image'

import { BANNER_PLACEMENTS } from '@/lib/banner-campaign-pricing'
import styles from './calculator.module.css'

const PLACEMENT_GUIDE = [
  {
    placement: BANNER_PLACEMENTS[0],
    badge: 'Mayor visibilidad',
    copy: 'Es la primera pieza publicitaria después de los grupos. Tiene el mayor alcance y por eso es la ubicación premium.',
  },
  {
    placement: BANNER_PLACEMENTS[1],
    badge: 'Contexto de premios',
    copy: 'Aparece más abajo en Inicio, inmediatamente antes de que la persona explore los premios disponibles.',
  },
  {
    placement: BANNER_PLACEMENTS[2],
    badge: 'Alta intención',
    copy: 'Se muestra debajo de los filtros. El Catálogo general entrega 390 mil impresiones diarias; cada tab usa un inventario estimado 10% menor y permite elegir un contexto específico.',
    tabs: [
      { id: 'all', label: 'Todas' },
      { id: 'locales', label: 'Locales' },
      { id: 'recompensas', label: 'Premios' },
      { id: 'online', label: 'Online' },
      { id: 'descuentos', label: 'Descuentos' },
      { id: 'reservas', label: 'Reservas' },
    ],
  },
] as const

function formatDailyImpressions(value: number) {
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value / 1_000)} mil`
}

export function BannerPlanner() {
  return (
    <section className={`${styles.container} ${styles.placementGuide}`} aria-labelledby="placement-guide-title">
      <div className={styles.sectionHeading}>
        <span>Ubicaciones en la app</span>
        <h2 id="placement-guide-title">Mirá exactamente dónde aparece.</h2>
        <p>Compará las ubicaciones disponibles y su inventario diario. Dentro de cada mercado, todas comparten la misma tarifa.</p>
      </div>
      <div className={styles.guideGrid}>
        {PLACEMENT_GUIDE.map(({ placement, badge, copy, ...guide }) => (
          <article key={placement.id}>
            <div className={styles.guideVisual} data-placement-preview={placement.id}>
              <Image src={placement.previewSrc} alt={placement.previewAlt} width={1392} height={2880} sizes="(max-width: 760px) 78vw, 31vw" loading="eager" />
              <span className={styles.guidePin}>Tu banner</span>
            </div>
            <div className={styles.guideBody}>
              <div><span>{placement.family}</span><em>{badge}</em></div>
              <h3>{placement.label}</h3>
              <p>{copy}</p>
              <div className={styles.guideInventory}>
                <strong>
                  {placement.id === 'home'
                    ? `${formatDailyImpressions(placement.dailyImpressions.AR)} AR · ${formatDailyImpressions(placement.dailyImpressions.UY)} UY`
                    : formatDailyImpressions(placement.dailyImpressions.AR)}
                </strong>
                <span>
                  {placement.id === 'home'
                    ? 'impresiones por día según mercado'
                    : placement.id === 'all'
                      ? 'impresiones/día en Catálogo general'
                      : 'impresiones por día'}
                </span>
              </div>
              {'tabs' in guide && guide.tabs && (
                <div className={styles.guideTabs} aria-label="Tabs disponibles en el Catálogo">
                  {guide.tabs.map((tab) => <span key={tab.id}>{tab.label}</span>)}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
