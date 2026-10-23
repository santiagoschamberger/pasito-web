import { pickupInstructionsEmail } from './web-email-templates.ts'
import { emailActionLink, emailParagraph } from './email-layout.ts'
import { pickupWhatsAppUrl, PICKUP_WHATSAPP_NUMBER_DISPLAY, type PickupLocation } from './store-fulfillment.ts'
export { pickupInstructionsEmail }
export function pickupInstructionsEmailHtml(params: Parameters<typeof pickupInstructionsEmail>[0]) { return pickupInstructionsEmail(params).html }
export function pickupCoordinationBlockHtml(customerName?:string|null,pickupLocation?:PickupLocation|null) {
 return emailParagraph(`Coordiná tu retiro por WhatsApp al ${PICKUP_WHATSAPP_NUMBER_DISPLAY}. Indicá tu nombre, día y horario.`)+emailActionLink('Coordinar por WhatsApp',pickupWhatsAppUrl(customerName,pickupLocation))
}
