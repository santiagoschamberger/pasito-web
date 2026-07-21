import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { LegalDocument } from '@/components/legal/LegalDocument'
import { LegalLayout } from '@/components/legal/LegalLayout'

const termsFilePath = path.join(process.cwd(), 'content', 'terminos-evento-pasito.txt')

export const metadata = {
  title: 'Bases y condiciones Pasito Walking Club x TOMATE — Pasito',
  description: 'Bases y condiciones particulares del evento Pasito Walking Club x TOMATE',
}

export default async function EventTermsPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <LegalLayout
      eyebrow="Pasito / Legal / Evento"
      title="Bases del evento"
      description="Las condiciones particulares para comprar entradas y participar de Pasito Walking Club x TOMATE."
      updatedAt="Última actualización: julio de 2026"
      backHref="/evento-pasito"
    >
      <LegalDocument content={termsContent} />
    </LegalLayout>
  )
}
