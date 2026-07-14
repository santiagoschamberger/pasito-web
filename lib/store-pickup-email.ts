import {
  PICKUP_WHATSAPP_NUMBER_DISPLAY,
  pickupWhatsAppUrl,
} from './store-fulfillment.ts'

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }
    return entities[character]
  })
}

export function pickupCoordinationBlockHtml(customerName?: string | null) {
  const whatsappUrl = escapeHtml(pickupWhatsAppUrl(customerName))

  return `
    <div style="background:#f2f8f4;border:1px solid #cfe5d7;border-radius:14px;padding:22px 20px;margin:0 0 24px;">
      <p style="font-size:16px;color:#004027;margin:0 0 8px;font-weight:700;">Coordiná tu retiro en Belgrano por WhatsApp</p>
      <p style="font-size:14px;color:#405149;margin:0 0 18px;line-height:1.6;">
        Enviá un mensaje al <strong>${PICKUP_WHATSAPP_NUMBER_DISPLAY}</strong> indicando tu nombre y apellido, qué día y a qué hora vas a pasar a buscarla.
      </p>
      <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#006d42;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 20px;border-radius:999px;">Ir a WhatsApp</a>
      <p style="font-size:12px;color:#6b7771;margin:14px 0 0;line-height:1.5;">El mensaje ya incluye tu nombre. Completá [DÍA] y [HORA] antes de enviarlo.</p>
    </div>
  `
}

export function pickupInstructionsEmailHtml(params: {
  customerName?: string | null
  variant: string
  size: string
  qty: number
}) {
  const firstName = params.customerName?.trim().split(/\s+/)[0]

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#fafafa;">
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:48px 28px;background:#ffffff;">
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://pasito.app/pasitohorizontal.png" alt="Pasito" width="100" style="display:inline-block;" />
    </div>
    <h2 style="font-size:22px;color:#111;margin:0 0 14px;font-weight:700;">Coordinemos el retiro de tu remera</h2>
    <p style="font-size:15px;color:#555;margin:0 0 22px;line-height:1.6;">
      ${firstName ? `${escapeHtml(firstName)}, ` : ''}tu pedido está registrado para retiro en Belgrano.
    </p>
    <div style="background:#f7f7f4;border-radius:12px;padding:17px 20px;margin:0 0 22px;">
      <p style="font-size:14px;color:#333;margin:0 0 6px;"><strong>${escapeHtml(params.variant)}</strong></p>
      <p style="font-size:14px;color:#555;margin:0;">Talle ${escapeHtml(params.size)} · ${params.qty} ${params.qty === 1 ? 'unidad' : 'unidades'}</p>
    </div>
    ${pickupCoordinationBlockHtml(params.customerName)}
    <div style="margin-top:34px;padding-top:22px;border-top:1px solid #f0f0f0;">
      <p style="font-size:14px;color:#333;margin:0;">Nos vemos en la calle,<br/><strong>Pasito</strong></p>
    </div>
    <div style="margin-top:38px;text-align:center;">
      <p style="font-size:11px;color:#bbb;margin:0;letter-spacing:0.03em;">pasito.app</p>
    </div>
  </div>
</body>
</html>`
}
