import type { Metadata } from 'next'

import { TOMATE_EVENT } from '@/lib/tomate-event'
import { CheckinClient } from './CheckinClient'

export const metadata: Metadata = {
  title: 'Check-in · Pasito x TOMATE',
  robots: { index: false, follow: false },
}

export default function TomateCheckinPage() {
  return <CheckinClient eventSlug={TOMATE_EVENT.slug} />
}
