import { after, NextRequest, NextResponse } from 'next/server'

import { retryEmailDelivery } from '@/lib/email-retry'
import {
  PASITO50_CAMPAIGN_CODE,
  isPasito50Email,
  normalizePasito50Email,
  normalizePasito50SupportId,
} from '@/lib/pasito50'
import { sendPasito50VerificationEmail } from '@/lib/pasito50-email'
import {
  createPasito50Verification,
  getPasito50SigningSecret,
} from '@/lib/pasito50-verification'
import { getTomateSupabase, requestIpHash } from '@/lib/tomate-server'
import { isTomateSupportId } from '@/lib/tomate-support-id'

type PrepareResult = { ok?: boolean; status?: string; delivery_email?: string }

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }
const GENERIC_MESSAGE =
  'Si el ID corresponde a una cuenta elegible, vas a recibir un código en el email asociado.'

export async function POST(request: NextRequest) {
  let body: { supportId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  const supportId = normalizePasito50SupportId(
    typeof body.supportId === 'string' ? body.supportId : '',
  )
  if (!isTomateSupportId(supportId)) {
    return NextResponse.json(
      { error: 'Revisá el ID de soporte ingresado.' },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }

  const verification = createPasito50Verification({
    supportId,
    secret: getPasito50SigningSecret(),
  })
  const db = getTomateSupabase()

  try {
    const { data: ipAllowed, error: ipRateError } = await db.rpc('event_consume_rate_limit', {
      p_scope: 'pasito50-code-ip',
      p_key_hash: requestIpHash(request, 'pasito50-code-ip'),
      p_limit: 200,
      p_window_seconds: 3600,
    })
    if (ipRateError) throw ipRateError

    const { data: identityAllowed, error: identityRateError } = await db.rpc(
      'event_consume_rate_limit',
      {
        p_scope: 'pasito50-code-identity',
        p_key_hash: requestIpHash(
          request,
          `pasito50-code-identity:${supportId}`,
        ),
        p_limit: 3,
        p_window_seconds: 3600,
      },
    )
    if (identityRateError) throw identityRateError
    if (!ipAllowed || !identityAllowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Esperá unos minutos antes de pedir otro código.' },
        { status: 429, headers: NO_STORE_HEADERS },
      )
    }

    const { data, error } = await db.rpc('prepare_pasito_link_challenge', {
      p_code: PASITO50_CAMPAIGN_CODE,
      p_support_id: supportId,
      p_challenge_id: verification.challengeId,
      p_code_hash: verification.codeHash,
      p_expires_at: verification.expiresAt.toISOString(),
    })
    if (error) throw error

    const result = (data ?? {}) as PrepareResult
    const deliveryEmail = normalizePasito50Email(
      typeof result.delivery_email === 'string' ? result.delivery_email : '',
    )
    if (result.ok && isPasito50Email(deliveryEmail)) {
      // Send after responding so a caller cannot infer a valid ID/email pair
      // from the external mail provider's variable response time.
      after(async () => {
        try {
          await retryEmailDelivery(
            () => sendPasito50VerificationEmail({ email: deliveryEmail, code: verification.code }),
            { maxAttempts: 2 },
          )
        } catch (emailError) {
          await db
            .from('pasito_link_campaign_challenges')
            .update({ consumed_at: new Date().toISOString() })
            .eq('id', verification.challengeId)
          console.error('[pasito50] No se pudo enviar el código de verificación:', emailError)
        }
      })
    }

    // Always return the same shape, including a random challenge ID, so the
    // endpoint does not reveal whether the Support ID exists or is eligible.
    return NextResponse.json(
      { ok: true, challengeId: verification.challengeId, message: GENERIC_MESSAGE },
      { status: 202, headers: NO_STORE_HEADERS },
    )
  } catch (error) {
    console.error('[pasito50] No se pudo preparar la verificación:', error)
    return NextResponse.json(
      { error: 'No pudimos enviar el código. Probá nuevamente en unos minutos.' },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }
}
