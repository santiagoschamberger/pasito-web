const VIDEO_URL = '/bg-video.mp4'
const BRAND = '#5D3415'

function AppStoreButton() {
  return (
    <a
      href="https://apps.apple.com/app/id6760863724"
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-3 py-3 shadow-md transition-transform duration-200 hover:scale-[1.03] sm:gap-4 sm:px-7 sm:py-4"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 sm:h-8 sm:w-8" style={{ fill: BRAND }} xmlns="http://www.w3.org/2000/svg">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.18 1.37-2.15 3.91.03 3.02 2.65 4.03 2.68 4.04l-.08.17zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
      <div className="text-left leading-tight">
        <div className="text-[10px] sm:text-xs" style={{ color: `${BRAND}99` }}>
          Descargar en el
        </div>
        <div className="text-sm font-medium sm:text-base" style={{ color: BRAND }}>
          App Store
        </div>
      </div>
    </a>
  )
}

function GooglePlayButton() {
  return (
    <a
      href="https://play.google.com/store/apps/details?id=ar.pasito.pasito&hl=es"
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-3 py-3 shadow-md transition-transform duration-200 hover:scale-[1.03] sm:gap-4 sm:px-7 sm:py-4"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 sm:h-8 sm:w-8" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.18 23.76c.37.2.8.22 1.2.06l12.15-7.02-2.76-2.76-10.59 9.72z" fill="#EA4335" />
        <path d="M22.29 10.62L19.7 9.1l-3.13 3.13 3.13 3.13 2.62-1.52c.75-.43.75-1.69-.03-2.22z" fill="#FBBC05" />
        <path d="M1.54.75C1.2 1.12 1 1.67 1 2.38v19.24c0 .71.2 1.26.55 1.63l.09.08 10.78-10.78v-.25L1.63.67l-.09.08z" fill="#4285F4" />
        <path d="M16.57 12.23l-4.15-4.15-11 11.68c.38.4.96.43 1.56.1l13.59-7.63z" fill="#34A853" />
      </svg>
      <div className="text-left leading-tight">
        <div className="text-[10px] sm:text-xs" style={{ color: `${BRAND}99` }}>
          Disponible en
        </div>
        <div className="text-sm font-medium sm:text-base" style={{ color: BRAND }}>
          Google Play
        </div>
      </div>
    </a>
  )
}

export default function Page() {
  return (
    <main className="relative h-[100svh] w-full overflow-hidden">
      <video className="absolute inset-0 z-0 h-full w-full object-cover" src={VIDEO_URL} autoPlay loop muted playsInline />

      <div className="absolute inset-0 z-[1] bg-white/15" />

      <div className="relative z-[2] flex h-full min-h-0 flex-col">
        <div className="flex justify-center px-8 py-4 sm:py-6">
          <img src="/logoverde.png" alt="Pasito" className="h-6 w-auto sm:h-8" />
        </div>

        <section className="flex min-h-0 flex-1 flex-col items-center justify-start px-5 pt-8 text-center sm:px-6 sm:pt-24">
          <h1
            className="animate-fade-rise font-display max-w-[22rem] text-[2.35rem] font-normal leading-[1.04] sm:max-w-5xl sm:text-6xl sm:leading-[1.1] lg:text-6xl"
            style={{
              letterSpacing: 0,
              color: BRAND,
            }}
          >
            El movimiento que genera movimiento.
          </h1>

          <p className="animate-fade-rise-delay mt-5 max-w-[22rem] text-[13px] leading-5 sm:mt-6 sm:max-w-4xl sm:text-base sm:leading-relaxed" style={{ color: BRAND }}>
            Pasito transforma cada caminata en una oportunidad para descubrir, conectar y crear hábitos más saludables. Porque moverse no es solo sumar pasos: es abrir la puerta a lugares nuevos, recompensas reales y pequeñas cosas que pueden cambiar tu día.
          </p>

          <div className="animate-fade-rise-delay-2 mt-7 grid w-full max-w-[22rem] grid-cols-2 gap-2 sm:mt-10 sm:flex sm:max-w-none sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
            <AppStoreButton />
            <GooglePlayButton />
          </div>
        </section>
      </div>
    </main>
  )
}
