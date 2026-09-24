'use client'

import { useEffect, useState } from 'react'
import { buildEventLinks } from '@/lib/event-links'

export default function EventOpenButton({ eventId }: { eventId: string }) {
  const links = buildEventLinks(eventId)
  const [href, setHref] = useState(links.appUrl)

  useEffect(() => {
    if (/android/i.test(navigator.userAgent)) setHref(links.androidIntent)
  }, [links.androidIntent])

  return (
    <a href={href} className="flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold"
      style={{ background: '#EEFA7A', color: '#0C6B45' }}>
      Abrir evento en Pasito
    </a>
  )
}
