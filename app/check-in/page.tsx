import type { Metadata } from 'next'

import { UnifiedCheckinClient } from './UnifiedCheckinClient'

export const metadata: Metadata = {
  title: 'Check-in · Pasito',
  robots: { index: false, follow: false },
}

export default function UnifiedCheckinPage() {
  return <UnifiedCheckinClient />
}
