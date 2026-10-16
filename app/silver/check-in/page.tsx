import type { Metadata } from 'next'

import { SILVER_EVENT } from '@/lib/silver-event'
import { CheckinClient } from '@/app/evento-pasito/check-in/CheckinClient'

export const metadata: Metadata = {
  title: 'Check-in · Silver Walks',
  robots: { index: false, follow: false },
}

export default function SilverCheckinPage() {
  return <CheckinClient eventSlug={SILVER_EVENT.slug} title="Silver Walks × Nutren" label="Check-in" />
}
