export const EMAIL_SCREENS = ['inicio','premios','reservas','entradas'] as const
export const APP_STORE = 'https://apps.apple.com/ar/app/pasito/id6760863724'
export const PLAY_STORE = 'https://play.google.com/store/apps/details?id=ar.pasito.pasito'
export function emailLinkTargets(screen: string, query: URLSearchParams) {
  if (!(EMAIL_SCREENS as readonly string[]).includes(screen)) return null
  const attribution = new URLSearchParams()
  for (const key of ['utm_source','utm_campaign','utm_content','utm_medium']) {
    const value=query.get(key)
    if(value && value.length<=100)attribution.set(key,value)
  }
  const suffix=attribution.size ? `?${attribution}` : ''
  const path=`/abrir/${screen}${suffix}`
  const play=new URL(PLAY_STORE)
  if(attribution.size)play.searchParams.set('referrer',attribution.toString())
  return {
    canonical:`https://pasito.app${path}`,
    custom:`ar.pasito.pasito://abrir/${screen}${suffix}`,
    android:`intent://pasito.app${path}#Intent;scheme=https;package=ar.pasito.pasito;S.browser_fallback_url=${encodeURIComponent(play.toString())};end`,
    appStore:APP_STORE,playStore:play.toString(),
  }
}
