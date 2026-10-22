import type { Metadata, Viewport } from 'next'

import { DoorClient } from './DoorClient'

export const metadata: Metadata = { title: 'Puerta' }
export const viewport: Viewport = { themeColor: '#0E1411' }

export default async function DoorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DoorClient eventId={id} />
}
