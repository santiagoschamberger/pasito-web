import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react'
import { MarketingNav } from '@/components/marketing/Marketing'
import marketingStyles from '../marketing.module.css'
import styles from './events.module.css'
export const metadata: Metadata = {
  title: 'Eventos · Pasito',
  description:
    'Planes para salir, caminar y encontrarnos. Conocé Silver Walks by Nutren, un encuentro organizado por Pasito + Kiwell en colaboración.',
  alternates: { canonical: 'https://www.pasito.app/eventos' },
}
export default function EventsPage() {
  return (
    <main className={`${marketingStyles.page} ${styles.page}`}>
      <MarketingNav
        contextualLink={{ href: '/silver', label: 'Silver Walks' }}
      />
      <section className={styles.container}>
        <p className={styles.eyebrow}>NOS ENCONTRAMOS AFUERA</p>
        <h1>
          Un buen plan empieza
          <br />
          con <em>un pasito.</em>
        </h1>
        <p className={styles.lead}>
          Experiencias para movernos, compartir y disfrutar la ciudad.
        </p>
        <Link href="/silver" className={styles.event}>
          <div className={styles.photo}>
            <Image
              src="/silver/walk-photo.webp"
              alt="Movimiento y encuentro al aire libre"
              fill
              priority
              sizes="(max-width:760px) 100vw, 42vw"
            />
          </div>
          <div className={styles.copy}>
            <span className={styles.eyebrow}>
              PRÓXIMO ENCUENTRO · BIENESTAR
            </span>
            <h2>
              Silver Walks
              <br />
              by Nutren
            </h2>
            <p>
              Una mañana para vos. Caminata guiada, charla de longevidad y
              brunch para personas de 45 años en adelante. Organizan Pasito +
              Kiwell en colaboración.
            </p>
            <span className={styles.fact}>
              <CalendarDays size={18} />
              27 de septiembre · 09:30 a 13:00
            </span>
            <span className={styles.fact}>
              <MapPin size={18} />
              Augusta, Palermo
            </span>
            <span className={styles.link}>
              Conocer la experiencia <ArrowUpRight size={21} />
            </span>
          </div>
        </Link>
      </section>
      <footer className={styles.footer}>
        <Link href="/">Volver a Pasito</Link>
        <Link href="/contacto">Contacto</Link>
      </footer>
    </main>
  )
}
