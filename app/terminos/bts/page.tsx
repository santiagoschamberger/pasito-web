import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { LegalLayout } from '@/components/legal/LegalLayout'

const termsFilePath = path.join(
  process.cwd(),
  'content',
  'terminos-bts.txt',
)

export const metadata = {
  title: 'Términos del desafío BTS — Pasito',
  description:
    'Bases particulares del desafío BTS — sorteo de entradas para BTS WORLD TOUR ARIRANG',
}

export default async function BtsTermsPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <LegalLayout
      eyebrow="Pasito / Legal"
      title="Bases del desafío BTS"
      description="Las condiciones particulares del desafío BTS."
      updatedAt="Última actualización: 17 de octubre de 2026"
      backHref="/terminos"
    >
      <LegalDocument content={termsContent} />
    </LegalLayout>
  )
}
