import { ImageResponse } from 'next/og'
export const alt = 'Silver Walks by Nutren · 27 de septiembre · Augusta, Palermo'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#254f40',
        color: '#f7f7ef',
        display: 'flex',
        flexDirection: 'column',
        padding: '65px 80px',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', fontSize: 28 }}>SILVER WALKS BY NUTREN</div>
      <div
        style={{
          display: 'flex',
          fontSize: 100,
          letterSpacing: -5,
          lineHeight: 1.05,
        }}
      >
        El próximo paso
        <br />
        es para vos.
      </div>
      <div style={{ display: 'flex', fontSize: 27, color: '#dfefaa' }}>
        27 SEPTIEMBRE · AUGUSTA, PALERMO
      </div>
      <div style={{ display: 'flex', fontSize: 20 }}>
        Organizan Pasito + Kiwell en colaboración
      </div>
    </div>,
    size,
  )
}
