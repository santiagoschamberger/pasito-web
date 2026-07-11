import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import styles from '@/app/legal.module.css'

type LegalLayoutProps = {
  title: string
  eyebrow: string
  description: string
  updatedAt: string
  backHref?: string
  children: React.ReactNode
}

export function LegalLayout({
  title,
  eyebrow,
  description,
  updatedAt,
  backHref = '/',
  children,
}: LegalLayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo} aria-label="Pasito, inicio">
            <Image src="/brand/logo-green.svg" alt="Pasito" width={96} height={23} priority />
          </Link>
          <Link href={backHref} className={styles.backLink}>
            <ArrowLeft size={17} aria-hidden="true" />
            Volver a Pasito
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <span className={styles.updatedAt}>{updatedAt}</span>
        </section>

        <div className={styles.documentGrid}>
          <aside className={styles.aside} aria-label="Documentos legales">
            <span>Documentos</span>
            <Link href="/privacidad">Política de privacidad</Link>
            <Link href="/terminos">Términos y condiciones</Link>
            <Link href="/terminos/clv">Términos del desafío</Link>
          </aside>
          <article className={styles.document}>{children}</article>
        </div>
      </main>

      <footer className={styles.footer}>
        <div>
          <Image src="/brand/logo-green.svg" alt="Pasito" width={80} height={20} />
          <p>© {new Date().getFullYear()} Pasito. Todos los derechos reservados.</p>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/terminos">Términos y condiciones</Link>
          <Link href="/terminos/clv">Términos del desafío</Link>
        </div>
      </footer>
    </div>
  )
}
