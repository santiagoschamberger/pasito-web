import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { LegalDocument } from '@/components/legal/LegalDocument'
import { LegalLayout } from '@/components/legal/LegalLayout'

const termsFilePath = path.join(process.cwd(), 'content', 'terminos-walking-club-uy.txt')

export const metadata = {
  title: 'Términos y Condiciones - Pasito Walking Club Uruguay',
  description: 'Bases y condiciones particulares del evento Pasito Walking Club en Uruguay.',
  robots: 'noindex',
}

export default async function WalkingClubUyTermsPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <LegalLayout
      eyebrow="Pasito / Legal / Evento Uruguay"
      title="Bases del evento"
      description="Las condiciones particulares para comprar entradas y participar de Pasito Walking Club en Uruguay."
      updatedAt="Última actualización: septiembre de 2026"
      backHref="/walking-club-uy"
    >
      <LegalDocument content={termsContent} />
    </LegalLayout>
  )
}
