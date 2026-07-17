import { permanentRedirect } from 'next/navigation'

export default async function LegacyTomateTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  permanentRedirect(`/evento-pasito/ticket/${encodeURIComponent(token)}`)
}
