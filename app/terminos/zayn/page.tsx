import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { LegalLayout } from '@/components/legal/LegalLayout'

const termsFilePath = path.join(
  process.cwd(),
  'content',
  'terminos-zayn.txt',
)

export const metadata = {
  title: 'Términos del desafío ZAYN — Pasito',
  description:
    'Bases particulares del desafío ZAYN Express 24h',
}

export default async function ZaynTermsPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <LegalLayout
      eyebrow="Pasito / Legal"
      title="Bases del desafío ZAYN"
      description="Las condiciones particulares del desafío ZAYN — Express 24 h."
      updatedAt="Última actualización: 4 de octubre de 2026"
      backHref="/terminos"
    >
      <LegalDocument content={termsContent} />
    </LegalLayout>
  )
}
