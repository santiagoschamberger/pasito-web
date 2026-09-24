import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { LegalLayout } from '@/components/legal/LegalLayout'

const termsFilePath = path.join(
  process.cwd(),
  'content',
  'terminos-rexona.txt',
)

export const metadata = {
  title: 'Términos del desafío Rexona — Pasito',
  description:
    'Bases particulares del desafío Rexona x Pasito',
}

export default async function RexonaTermsPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <LegalLayout
      eyebrow="Pasito / Legal"
      title="Bases del desafío Rexona"
      description="Las condiciones particulares del desafío Rexona x Pasito."
      updatedAt="Última actualización: 24 de septiembre de 2026"
      backHref="/terminos"
    >
      <LegalDocument content={termsContent} />
    </LegalLayout>
  )
}
