import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { LegalLayout } from '@/components/legal/LegalLayout'

const termsFilePath = path.join(
  process.cwd(),
  'content',
  'terminos-flux.txt',
)

export const metadata = {
  title: 'Términos del desafío Flux — Pasito',
  description:
    'Bases particulares del desafío Flux x Pasito, con auspicio de OSDE',
}

export default async function FluxTermsPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <LegalLayout
      eyebrow="Pasito / Legal"
      title="Bases del desafío Flux"
      description="Las condiciones particulares del desafío Flux x Pasito, con auspicio de OSDE."
      updatedAt="Última actualización: 28 de septiembre de 2026"
      backHref="/terminos"
    >
      <LegalDocument content={termsContent} />
    </LegalLayout>
  )
}
