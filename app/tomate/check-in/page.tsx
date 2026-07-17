import { permanentRedirect } from 'next/navigation'

export default function LegacyTomateCheckinPage() {
  permanentRedirect('/evento-pasito/check-in')
}
