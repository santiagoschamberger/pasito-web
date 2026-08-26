import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { LegalLayout } from '@/components/legal/LegalLayout'

const termsFilePath = path.join(
  process.cwd(),
  'content',
  'terminos-road-to-21k.txt',
)

export const metadata = {
  title: 'Términos y condiciones Road to 21K — Pasito',
  description: 'Términos y condiciones del desafío Decathlon x Pasito',
}

export default async function DecathlonTermsPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <LegalLayout
      eyebrow="Pasito / Legal"
      title="Términos de Road to 21K"
      description="Las condiciones particulares del desafío Decathlon x Pasito."
      updatedAt="Última actualización: 17 de agosto de 2026"
      backHref="/terminos"
    >
      <LegalDocument content={termsContent} />
    </LegalLayout>
  )
}
