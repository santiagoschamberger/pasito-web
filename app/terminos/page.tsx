import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { LegalLayout } from '@/components/legal/LegalLayout'

const termsFilePath = path.join(
  process.cwd(),
  'content',
  'terminos-y-condiciones.txt',
)

export const metadata = {
  title: 'Términos y Condiciones — Pasito',
  description: 'Términos y condiciones de uso de Pasito',
}

export default async function TerminosPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <LegalLayout
      eyebrow="Pasito / Legal"
      title="Términos y condiciones"
      description="Las reglas que hacen que la experiencia de Pasito sea clara, justa y segura para todas las personas."
      updatedAt="Última actualización: junio de 2026"
    >
      <LegalDocument content={termsContent} />
    </LegalLayout>
  )
}
