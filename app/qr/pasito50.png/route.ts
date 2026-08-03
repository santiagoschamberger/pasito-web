import QRCode from 'qrcode'

import { PASITO50_PROMO_URL } from '@/lib/pasito50'

export async function GET() {
  const png = await QRCode.toBuffer(PASITO50_PROMO_URL, {
    type: 'png',
    width: 1200,
    margin: 4,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0C6B45',
      light: '#FFFFFFFF',
    },
  })

  return new Response(new Uint8Array(png), {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'Content-Disposition': 'inline; filename="pasito50-qr.png"',
      'Content-Type': 'image/png',
    },
  })
}
