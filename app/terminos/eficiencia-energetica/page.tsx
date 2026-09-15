import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { LegalLayout } from '@/components/legal/LegalLayout'

const termsFilePath = path.join(
  process.cwd(),
  'content',
  'terminos-eficiencia-energetica.txt',
)

export const metadata = {
  title: 'Términos del desafío Eficiencia Energética — Pasito',
  description:
    'Bases particulares del desafío Eficiencia Energética x Pasito (Uruguay)',
}

export default async function EficienciaEnergeticaTermsPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <LegalLayout
      eyebrow="Pasito / Legal"
      title="Bases del desafío Eficiencia Energética"
      description="Las condiciones particulares del desafío Eficiencia Energética x Pasito (Uruguay)."
      updatedAt="Última actualización: 9 de septiembre de 2026"
      backHref="/terminos"
    >
      <LegalDocument content={termsContent} />
    </LegalLayout>
  )
}
