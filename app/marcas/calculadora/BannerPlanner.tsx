'use client'

import { useState } from 'react'
import Image from 'next/image'

import {
  BANNER_PLACEMENTS,
  type BannerPlacementId,
} from '@/lib/banner-campaign-pricing'
import { BannerCalculator } from './BannerCalculator'
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

function guideIsSelected(guidePlacementId: BannerPlacementId, selectedPlacementId: BannerPlacementId) {
  if (guidePlacementId === 'all') {
    return selectedPlacementId !== 'home' && selectedPlacementId !== 'home_before_rewards'
  }

  return guidePlacementId === selectedPlacementId
}

function formatDailyImpressions(value: number) {
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value / 1_000)} mil`
}

export function BannerPlanner() {
  const [placementId, setPlacementId] = useState<BannerPlacementId>('home')

  const selectFromPreview = (nextPlacementId: BannerPlacementId) => {
    setPlacementId(nextPlacementId)
    window.requestAnimationFrame(() => {
      document.getElementById('calculadora-banners')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <>
      <section className={`${styles.container} ${styles.placementGuide}`} aria-labelledby="placement-guide-title">
        <div className={styles.sectionHeading}>
          <span>Ubicaciones en la app</span>
          <h2 id="placement-guide-title">Mirá exactamente dónde aparece.</h2>
          <p>Hacé click en una preview para elegirla. Todas las ubicaciones comparten el mismo CPM base; el precio cambia según las impresiones diarias de cada una.</p>
        </div>
        <div className={styles.guideGrid}>
          {PLACEMENT_GUIDE.map(({ placement, badge, copy, ...guide }) => {
            const isSelected = guideIsSelected(placement.id, placementId)

            return (
              <article className={isSelected ? styles.guideSelected : undefined} key={placement.id}>
                <button
                  type="button"
                  className={styles.guideVisualButton}
                  aria-label={`Elegir ${placement.label}`}
                  aria-pressed={isSelected}
                  onClick={() => selectFromPreview(placement.id)}
                >
                  <span className={styles.guideVisual} data-placement-preview={placement.id}>
                    <Image src={placement.previewSrc} alt={placement.previewAlt} width={1392} height={2880} sizes="(max-width: 760px) 82vw, 31vw" loading="eager" />
                    <span className={styles.guidePin}>Tu banner</span>
                    <span className={styles.guideChoice}>{isSelected ? 'Seleccionado' : 'Elegir ubicación'}</span>
                  </span>
                </button>
                <div className={styles.guideBody}>
                  <div><span>{placement.family}</span><em>{badge}</em></div>
                  <h3>{placement.label}</h3>
                  <p>{copy}</p>
                  <div className={styles.guideInventory}>
                    <strong>{formatDailyImpressions(placement.dailyImpressions)}</strong>
                    <span>{placement.id === 'all' ? 'impresiones/día en Catálogo general' : 'impresiones por día'}</span>
                  </div>
                  {'tabs' in guide && guide.tabs && (
                    <div className={styles.guideTabs} aria-label="Elegir una tab del Catálogo">
                      {guide.tabs.map((tab) => (
                        <button
                          type="button"
                          aria-pressed={placementId === tab.id}
                          onClick={() => selectFromPreview(tab.id)}
                          key={tab.id}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section id="calculadora-banners" className={`${styles.container} ${styles.calculatorSection}`}>
        <BannerCalculator placementId={placementId} onPlacementChange={setPlacementId} />
        <p className={styles.segmentDisclaimer}>Se puede segmentar por barrio, ciudad, provincia y edad. La disponibilidad se confirma antes de activar la campaña.</p>
      </section>
    </>
  )
}
