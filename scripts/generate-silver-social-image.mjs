/** Regenerate the static sharing card: node scripts/generate-silver-social-image.mjs */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createElement as h } from 'react'
import { ImageResponse } from 'next/og.js'
import sharp from 'sharp'

const root = new URL('../', import.meta.url)
const photo = await sharp(await readFile(new URL('public/silver/walk-photo.webp', root)))
  .resize(416, 510, { fit: 'cover', position: 'centre' }).png().toBuffer()
const box = (style, ...children) => h('div', { style: { display: 'flex', ...style } }, ...children)
const image = new ImageResponse(
  box({ width: 1200, height: 630, background: '#f6f5e9', color: '#254f40', position: 'relative' },
    box({ position: 'absolute', top: 46, left: 60, fontSize: 25, letterSpacing: 1.4, fontWeight: 700 }, 'SILVER WALKS BY NUTREN'),
    box({ position: 'absolute', top: 119, left: 56, width: 650, flexDirection: 'column', fontSize: 86, letterSpacing: -4, lineHeight: 1.02, fontWeight: 700 },
      box({}, 'El próximo'),
      box({}, 'paso es'),
      box({}, 'para vos.'),
    ),
    box({ position: 'absolute', top: 434, left: 60, padding: '12px 21px', borderRadius: 30, background: '#e7eea3', fontSize: 25, fontWeight: 700 }, '27 DE SEPTIEMBRE'),
    box({ position: 'absolute', top: 500, left: 62, fontSize: 25 }, 'Augusta, Palermo · 09:30 h'),
    h('img', { src: `data:image/png;base64,${photo.toString('base64')}`, width: 416, height: 510,
      style: { position: 'absolute', top: 30, right: 30, borderRadius: 28, objectFit: 'cover' }, alt: '' }),
    box({ position: 'absolute', top: 463, right: 55, padding: '12px 20px', borderRadius: 24, background: '#f6f5e9', fontSize: 21, fontWeight: 700 }, '45 años en adelante'),
    box({ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 64, padding: '0 60px', background: '#254f40', color: '#f6f5e9', alignItems: 'center', justifyContent: 'space-between' },
      box({ fontSize: 23 }, 'Organizan Pasito + Kiwell en colaboración'),
      box({ fontSize: 22 }, 'pasito.app'),
    ),
  ),
  { width: 1200, height: 630 },
)
const output = new URL('app/silver/opengraph-image.png', root)
await writeFile(output, Buffer.from(await image.arrayBuffer()))
console.log(`Generated ${fileURLToPath(output)}`)
