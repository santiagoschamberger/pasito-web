import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { RecoveryForm } from './RecoveryForm'
import styles from './recovery.module.css'

export const metadata: Metadata = {
  title: 'Recuperar entradas · Pasito x TOMATE',
  description: 'Reenviá los QR y códigos de tus entradas para Pasito Walking Club x TOMATE.',
  robots: { index: false, follow: false },
}

export default function RecoverTomateTicketsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/evento-pasito" className={styles.back}><ArrowLeft size={17} /> Volver al evento</Link>
        <Image src="/brand/logo-green.svg" alt="Pasito" width={112} height={27} priority />
        <p className={styles.eyebrow}>Pasito Walking Club × TOMATE</p>
        <h1>¿No encontrás<br />tus entradas?</h1>
        <p className={styles.lead}>Ingresá el mismo email que usaste al pagar y te reenviamos los QR con sus códigos manuales.</p>
        <RecoveryForm />
        <p className={styles.support}>Si cambiaste de email o seguís sin recibirlas, <Link href="/contacto">contactanos</Link>.</p>
      </div>
    </main>
  )
}
