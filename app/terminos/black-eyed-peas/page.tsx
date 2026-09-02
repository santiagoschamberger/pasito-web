import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { LegalLayout } from '@/components/legal/LegalLayout'

const termsFilePath = path.join(
  process.cwd(),
  'content',
  'terminos-black-eyed-peas.txt',
)

export const metadata = {
  title: 'Términos del desafío Black Eyed Peas — Pasito',
  description:
    'Bases particulares del desafío Black Eyed Peas Express 24h',
}

export default async function BlackEyedPeasTermsPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <LegalLayout
      eyebrow="Pasito / Legal"
      title="Bases del desafío Black Eyed Peas"
      description="Las condiciones particulares del desafío Black Eyed Peas — Express 24 h."
      updatedAt="Última actualización: 2 de septiembre de 2026"
      backHref="/terminos"
    >
      <LegalDocument content={termsContent} />
    </LegalLayout>
  )
}
