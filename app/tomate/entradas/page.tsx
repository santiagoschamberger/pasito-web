import { permanentRedirect } from 'next/navigation'

export default function LegacyTomateRecoveryPage() {
  permanentRedirect('/evento-pasito/entradas')
}
