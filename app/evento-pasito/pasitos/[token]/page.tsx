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

type RewardEntryRow = {
  amount: number
  status: 'pending' | 'credited' | 'reversed'
  ticket_number: number
}

export default async function PasitosClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const orderId = readPasitosClaimToken(token)
  if (!orderId) notFound()

  const db = getTomateSupabase()
  const [rewardResult, entriesResult] = await Promise.all([
    db.from('event_pasito_rewards').select('amount, status').eq('order_id', orderId).maybeSingle(),
    db.from('event_pasito_reward_entries').select('amount, status, ticket_number').eq('order_id', orderId).order('ticket_number'),
  ])
  if (rewardResult.error || !rewardResult.data || entriesResult.error || !entriesResult.data?.length) notFound()
  const reward = rewardResult.data as RewardRow
  const entries = entriesResult.data as RewardEntryRow[]

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Image className={styles.logo} src="/pasitohorizontal.png" alt="Pasito" width={236} height={70} priority />
        <header className={styles.heading}>
          <p>Pasito Walking Club × TOMATE</p>
          <h1>Repartí los Pasitos<br />de tus entradas</h1>
        </header>

        {reward.status === 'pending' ? (
          <PasitosClaimForm
            token={token}
            amount={reward.amount}
            entries={entries.map((entry) => ({ amount: entry.amount, ticketNumber: entry.ticket_number }))}
          />
        ) : (
          <div className={styles.statusCard}>
            <strong>{reward.status === 'credited' ? `${reward.amount} Pasitos ya acreditados` : 'Premio no disponible'}</strong>
            <p>{reward.status === 'credited'
              ? 'Este enlace ya fue utilizado y no puede volver a acreditar Pasitos.'
              : 'La compra no está aprobada o fue reembolsada.'}</p>
          </div>
        )}
        <Link className={styles.back} href="/evento-pasito">Volver al evento</Link>
      </div>
    </main>
  )
}
