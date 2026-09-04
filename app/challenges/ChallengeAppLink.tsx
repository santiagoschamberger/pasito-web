'use client'

import { useEffect, useState } from 'react'
import { buildChallengeAppUrl } from './challenge-link'

export default function ChallengeAppLink({
  challengeId,
  isClosed,
}: {
  challengeId: string
  isClosed: boolean
}) {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop')

  useEffect(() => {
    const ua = navigator.userAgent
    if (/android/i.test(ua)) setPlatform('android')
    else if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
      setPlatform('ios')
    }
  }, [])

  return (
    <a
      href={buildChallengeAppUrl(challengeId, platform)}
      className="flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      style={{ background: '#EEFA7A', color: '#0C6B45' }}
    >
      {isClosed ? 'Ver ganadores en la app' : 'Abrir desafío en la app'}
    </a>
  )
}
