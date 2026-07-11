import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { LegalLayout } from '@/components/legal/LegalLayout'

const termsFilePath = path.join(
  process.cwd(),
  'content',
  'terminos-clv.txt',
)

export const metadata = {
  title: 'Términos y condiciones desafío Cuan Lejos Voy — Pasito',
  description: 'Términos y condiciones del desafío Cuan Lejos Voy x Pasito',
}

export default async function CuanLejosVoyTermsPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <LegalLayout
      eyebrow="Pasito / Legal"
      title="Términos del desafío"
      description="Las condiciones particulares del desafío Cuan Lejos Voy x Pasito."
      updatedAt="Última actualización: 2 de julio de 2026"
      backHref="/terminos"
    >
      <LegalDocument content={termsContent} />
    </LegalLayout>
  )
}
