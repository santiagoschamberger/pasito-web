import type { Metadata } from 'next'
import { ConnectAndroidGuide } from './ConnectAndroidGuide'

export const metadata: Metadata = {
  title: 'Pasito Android',
  description:
    'Guía rápida para resetear permisos de Health Connect y revisar pasos en Pasito Android.',
}

export default function ConectarAndroidPage() {
  return <ConnectAndroidGuide />
}
