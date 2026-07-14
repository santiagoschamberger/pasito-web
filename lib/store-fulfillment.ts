export const PICKUP_LOCATIONS = ['belgrano', 'palermo'] as const
export type PickupLocation = (typeof PICKUP_LOCATIONS)[number]

export const PICKUP_LABEL = 'Retiro gratis'
export const PICKUP_NOTE = 'Elegí Belgrano o Palermo'
export const PICKUP_WHATSAPP_NUMBER = '5491136491620'
export const PICKUP_WHATSAPP_NUMBER_DISPLAY = '+54 9 11 3649-1620'

export function isPickupLocation(value: unknown): value is PickupLocation {
  return typeof value === 'string' && PICKUP_LOCATIONS.includes(value as PickupLocation)
}

export function pickupLocationName(location?: PickupLocation | null) {
  if (location === 'belgrano') return 'Belgrano'
  if (location === 'palermo') return 'Palermo'
  return null
}

export function pickupLabel(location?: PickupLocation | null) {
  const locationName = pickupLocationName(location)
  return locationName ? `Retiro en ${locationName}` : 'Retiro coordinado'
}

export function pickupConfirmation(location?: PickupLocation | null) {
  const locationName = pickupLocationName(location)
  return locationName
    ? `Escribinos por WhatsApp para coordinar el punto exacto en ${locationName}, el día y el horario de retiro.`
    : 'Escribinos por WhatsApp para coordinar el punto, el día y el horario de retiro.'
}

function normalizedCustomerName(customerName?: string | null) {
  return customerName?.trim().replace(/\s+/g, ' ') || '[NOMBRE Y APELLIDO]'
}

export function pickupWhatsAppUrl(customerName?: string | null, location?: PickupLocation | null) {
  const locationName = pickupLocationName(location) ?? '[BELGRANO O PALERMO]'
  const message = [
    `Hola Pasito, soy ${normalizedCustomerName(customerName)}.`,
    `Voy a pasar por ${locationName} a buscar mi remera el [DÍA] a las [HORA].`,
  ].join(' ')

  return `https://wa.me/${PICKUP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
