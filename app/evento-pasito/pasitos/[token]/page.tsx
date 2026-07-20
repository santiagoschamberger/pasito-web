import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getTomateSupabase } from '@/lib/tomate-server'
import { readPasitosClaimToken } from '@/lib/tomate-ticket-security'
import { PasitosClaimForm } from '../PasitosClaimForm'
import styles from '../pasitos.module.css'

export const dynamic = 'force-dynamic'

type RewardRow = {
  amount: number
  status: 'pending' | 'credited' | 'reversed'
}

export default async function PasitosClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const orderId = readPasitosClaimToken(token)
  if (!orderId) notFound()

  const { data, error } = await getTomateSupabase()
    .from('event_pasito_rewards')
    .select('amount, status')
    .eq('order_id', orderId)
    .maybeSingle()
  if (error || !data) notFound()
  const reward = data as RewardRow

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Image className={styles.logo} src="/pasitohorizontal.png" alt="Pasito" width={236} height={70} priority />
        <header className={styles.heading}>
          <p>Pasito Walking Club × TOMATE</p>
          <h1>Tus Pasitos<br />de la entrada</h1>
        </header>

        {reward.status === 'pending' ? (
          <PasitosClaimForm token={token} amount={reward.amount} />
        ) : (
          <div className={styles.statusCard}>
            <strong>{reward.status === 'credited' ? `${reward.amount} Pasitos ya acreditados` : 'Premio no disponible'}</strong>
            <p>{reward.status === 'credited'
              ? 'Este premio ya fue enviado a una cuenta de Pasito.'
              : 'La compra no está aprobada o fue reembolsada.'}</p>
          </div>
        )}
        <Link className={styles.back} href="/evento-pasito">Volver al evento</Link>
      </div>
    </main>
  )
}
