import type { Metadata } from 'next'
import { ConnectAndroidGuide } from './ConnectAndroidGuide'

export const metadata: Metadata = {
  title: 'Conectar pasos a Pasito',
  description:
    'Guía paso a paso para conectar una app de pasos con Pasito en Android o iPhone.',
}

export default function ConectarAndroidPage() {
  return <ConnectAndroidGuide />
}
