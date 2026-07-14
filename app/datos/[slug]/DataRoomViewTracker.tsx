'use client'

import { useEffect } from 'react'

export function DataRoomViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    void fetch('/api/data-room/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
      keepalive: true,
    })
  }, [slug])

  return null
}
