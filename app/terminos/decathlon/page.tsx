import { readFile } from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const termsFilePath = path.join(
  process.cwd(),
  'content',
  'terminos-decathlon.txt',
)

export const metadata = {
  title: 'Términos y condiciones desafío Cuan Lejos Voy — Pasito',
  description: 'Términos y condiciones del desafío Cuan Lejos Voy x Pasito',
}

export default async function CuanLejosVoyTermsPage() {
  const termsContent = await readFile(termsFilePath, 'utf8')

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/terminos"
            className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-70 transition-opacity"
            style={{ color: '#0C6B45' }}
          >
            <ArrowLeft size={18} />
            Volver
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <pre className="whitespace-pre-wrap break-words font-sans text-base leading-7 text-gray-700">{termsContent}</pre>

        <div className="mt-16 pt-8 border-t border-gray-200">
          <Link
            href="/terminos"
            className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-70 transition-opacity"
            style={{ color: '#0C6B45' }}
          >
            <ArrowLeft size={18} />
            Volver
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-10 mt-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} Pasito. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
