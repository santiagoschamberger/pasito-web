import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

import { renderDecathlonRegistrationEmail } from '../lib/decathlon-registration-email.ts'

const EVENT_SLUG = 'todos-a-decathlon'
const CAMPAIGN = 'registration_confirmation_2026'
// Production preflight on 2026-08-04: 460 active registrations, 459 with email.
const EXPECTED_RECIPIENTS = 459
const DEFAULT_FUNCTION_URL = 'https://trsbowwcigzayhdpfxvd.supabase.co/functions/v1/partner-event-registration'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FROM = 'Pasito <soporte@pasito.app>'
const REPLY_TO = 'soporte@pasito.app'

type ClaimedDelivery = {
  delivery_id: string
  event_id: string
  user_id: string
  email: string
  display_name: string | null
  token: string
  token_expires_at: string
  attempt_number: number
}

function argument(name: string): string | null {
  const prefix = `--${name}=`
  const match = process.argv.slice(2).find((value) => value.startsWith(prefix))
  return match ? match.slice(prefix.length).trim() : null
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`)
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Falta ${name}.`)
  return value
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function sendTestEmail(testEmail: string, resend: Resend, functionUrl: string): Promise<void> {
  if (!EMAIL_PATTERN.test(testEmail)) throw new Error('El email de prueba no es válido.')
  const email = renderDecathlonRegistrationEmail({
    displayName: 'Santiago',
    withdrawalUrl: `${functionUrl}?preview=1`,
    isTest: true,
  })
  const { data, error } = await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: testEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  }, { idempotencyKey: `decathlon-registration-test-${Date.now()}` })

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Resend no devolvió un identificador de email.')
  console.log(`Prueba enviada a ${testEmail}. Resend id: ${data.id}`)
}

async function sendAll(resend: Resend, functionUrl: string): Promise<void> {
  const confirmation = Number(argument('confirm-count'))
  if (confirmation !== EXPECTED_RECIPIENTS) {
    throw new Error(`Para el envío real usá --send-all --confirm-count=${EXPECTED_RECIPIENTS}.`)
  }

  const supabase = createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  let sent = 0
  let failed = 0
  const attemptedDeliveryIds = new Set<string>()

  for (;;) {
    const { data, error } = await supabase.rpc('partner_event_claim_confirmation_email_batch', {
      p_event_slug: EVENT_SLUG,
      p_campaign: CAMPAIGN,
      p_limit: 25,
    })
    if (error) throw error
    const batch = (data ?? []) as ClaimedDelivery[]
    if (batch.length === 0) break

    for (const delivery of batch) {
      if (attemptedDeliveryIds.has(delivery.delivery_id)) continue
      attemptedDeliveryIds.add(delivery.delivery_id)
      let emailId: string | null = null
      let errorMessage: string | null = null
      try {
        if (!EMAIL_PATTERN.test(delivery.email)) throw new Error('Email inválido.')
        const email = renderDecathlonRegistrationEmail({
          displayName: delivery.display_name,
          withdrawalUrl: `${functionUrl}?token=${delivery.token}`,
        })
        const result = await resend.emails.send({
          from: FROM,
          replyTo: REPLY_TO,
          to: delivery.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        }, {
          idempotencyKey: `decathlon-registration-${delivery.delivery_id}-${delivery.attempt_number}`,
        })
        if (result.error) throw new Error(result.error.message)
        if (!result.data?.id) throw new Error('Resend no devolvió un identificador de email.')
        emailId = result.data.id
        sent += 1
      } catch (error) {
        errorMessage = error instanceof Error ? error.message.slice(0, 1_000) : String(error).slice(0, 1_000)
        failed += 1
      }

      const { error: trackingError } = await supabase.rpc('partner_event_record_confirmation_email_attempt', {
        p_delivery_id: delivery.delivery_id,
        p_resend_email_id: emailId,
        p_error: errorMessage,
      })
      if (trackingError) throw trackingError
      await wait(550)
    }

    console.log(`Progreso: ${sent} enviados, ${failed} fallidos, ${attemptedDeliveryIds.size}/${EXPECTED_RECIPIENTS} procesados.`)
    if (attemptedDeliveryIds.size >= EXPECTED_RECIPIENTS) break
  }

  console.log(`Envío terminado: ${sent} enviados, ${failed} fallidos.`)
  if (attemptedDeliveryIds.size !== EXPECTED_RECIPIENTS) {
    throw new Error(`La audiencia procesada fue ${attemptedDeliveryIds.size}; se esperaban ${EXPECTED_RECIPIENTS}.`)
  }
  if (failed > 0) process.exitCode = 1
}

async function main(): Promise<void> {
  const testEmail = argument('test-email')
  const sendAllFlag = hasFlag('send-all')
  if (Boolean(testEmail) === sendAllFlag) {
    throw new Error('Elegí exactamente un modo: --test-email=email o --send-all.')
  }

  const functionUrl = (process.env.PARTNER_EVENT_REGISTRATION_URL || DEFAULT_FUNCTION_URL).replace(/\/$/, '')
  const resend = new Resend(requiredEnv('RESEND_API_KEY'))

  if (testEmail) {
    await sendTestEmail(testEmail, resend, functionUrl)
    return
  }
  await sendAll(resend, functionUrl)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
