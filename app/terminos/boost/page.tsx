import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { LegalLayout } from '@/components/legal/LegalLayout'

const termsFilePath = path.join(process.cwd(), 'content', 'terminos-boost.txt')

export const metadata = {
  title: 'Términos del boost de pasos — Pasito',
  description:
    'Bases particulares de las campañas de multiplicación de pasos activadas por QR en Pasito',
}

export default async function BoostTermsPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <LegalLayout
      eyebrow="Pasito / Legal"
      title="Bases del boost de pasos"
      description="Las condiciones particulares de las campañas de Pasitos extra activadas con un QR."
      updatedAt="Última actualización: 14 de septiembre de 2026"
      backHref="/terminos"
    >
      <LegalDocument content={termsContent} />
    </LegalLayout>
  )
}
