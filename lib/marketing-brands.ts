export type MarketingBrand = {
  name: string
  src: string
  width: number
  height: number
  monochrome?: boolean
}

// Shared by every general partner showcase. Event sponsor lists are event-specific.
export const PARTNER_BRANDS: MarketingBrand[] = [
  { name: 'Farmacity', src: '/marketing/brands/farmacity.svg', width: 144, height: 32 },
  { name: 'Alto Palermo', src: '/marketing/brands/alto-palermo.webp', width: 144, height: 27 },
  { name: 'Nestlé', src: '/marketing/brands/nestle.svg', width: 110, height: 31 },
  { name: 'OSDE', src: '/marketing/brands/osde.webp', width: 108, height: 44 },
  { name: 'DF Entertainment', src: '/marketing/brands/df-entertainment.svg', width: 140, height: 44 },
  { name: 'Diagnóstico Maipú', src: '/marketing/brands/diagnostico-maipu.webp', width: 92, height: 54, monochrome: true },
]
