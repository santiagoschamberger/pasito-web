import { NextRequest, NextResponse } from 'next/server'

import {
  PASITO50_CAMPAIGN_CODE,
  isPasito50ChallengeId,
  isPasito50Otp,
  normalizePasito50Otp,
  normalizePasito50SupportId,
  pasito50MessageForStatus,
} from '@/lib/pasito50'
import {
  getPasito50SigningSecret,
  pasito50CodeHash,
} from '@/lib/pasito50-verification'
import { getTomateSupabase, requestIpHash } from '@/lib/tomate-server'
import { isTomateSupportId } from '@/lib/tomate-support-id'

type ClaimResult = {
  ok?: boolean
  status?: string
  amount?: number
  already_credited?: boolean
}

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: NextRequest) {
  let body: {
    challengeId?: unknown
    otp?: unknown
    supportId?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  const supportId = normalizePasito50SupportId(
    typeof body.supportId === 'string' ? body.supportId : '',
  )
  const otp = normalizePasito50Otp(typeof body.otp === 'string' ? body.otp : '')
  const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : ''
  if (
    !isTomateSupportId(supportId)
    || !isPasito50Otp(otp)
    || !isPasito50ChallengeId(challengeId)
  ) {
    return NextResponse.json(
      { error: 'Revisá el ID y el código ingresados.' },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }

  const codeHash = pasito50CodeHash({
    challengeId,
    code: otp,
    supportId,
    secret: getPasito50SigningSecret(),
  })
  const db = getTomateSupabase()

  try {
    // A QR activation can put many legitimate users behind the same event
    // Wi-Fi IP. Keep a generous IP ceiling plus a tight per-challenge limit.
    const { data: ipAllowed, error: ipRateError } = await db.rpc(
      'event_consume_rate_limit',
      {
        p_scope: 'pasito50-claim-ip',
        p_key_hash: requestIpHash(request, 'pasito50-claim-ip'),
        p_limit: 300,
        p_window_seconds: 3600,
      },
    )
    if (ipRateError) throw ipRateError

    const { data: challengeAllowed, error: challengeRateError } = await db.rpc(
      'event_consume_rate_limit',
      {
        p_scope: 'pasito50-claim-challenge',
        p_key_hash: requestIpHash(request, `pasito50-claim-challenge:${challengeId}`),
        p_limit: 5,
        p_window_seconds: 900,
      },
    )
    if (challengeRateError) throw challengeRateError
    if (!ipAllowed || !challengeAllowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Pedí un código nuevo.' },
        { status: 429, headers: NO_STORE_HEADERS },
      )
    }

    const { data, error } = await db.rpc('claim_pasito_link_with_challenge', {
      p_code: PASITO50_CAMPAIGN_CODE,
      p_support_id: supportId,
      p_challenge_id: challengeId,
      p_code_hash: codeHash,
    })
    if (error) throw error

    const result = (data ?? {}) as ClaimResult
    if (result.ok && (result.status === 'awarded' || result.status === 'already_credited')) {
      return NextResponse.json(
        {
          ok: true,
          status: result.status,
          amount: result.amount ?? 50,
          alreadyCredited: Boolean(result.already_credited),
        },
        { headers: NO_STORE_HEADERS },
      )
    }

    const status = result.status ?? 'unknown'
    const httpStatus = status === 'account_too_old'
      ? 403
      : status === 'campaign_full'
        ? 409
        : status === 'campaign_inactive'
          ? 410
          : status === 'verification_invalid'
            ? 422
            : 400

    return NextResponse.json(
      { error: pasito50MessageForStatus(status), status },
      { status: httpStatus, headers: NO_STORE_HEADERS },
    )
  } catch (error) {
    console.error('[pasito50] No se pudieron acreditar los Pasitos:', error)
    return NextResponse.json(
      { error: pasito50MessageForStatus('unknown') },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }
}
