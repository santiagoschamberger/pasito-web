import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Coffee,
  Dumbbell,
  Footprints,
  Gift,
  Link2,
  MapPin,
  MessageCircle,
  ReceiptText,
  Send,
  Shirt,
  Sparkles,
  Store,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { AmbassadorLeadForm } from './AmbassadorLeadForm'

const WHATSAPP_NUMBER = '541164136048'
const WHATSAPP_MESSAGE = 'Hola, quiero ser Embajador Pasito.'
const WA_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

export const metadata: Metadata = {
  title: 'Embajadores Pasito - Ganá por sumar comercios',
  description: 'Convertite en Embajador Pasito, invitá locales con tu link personal y ganá cuando se activan y generan canjes reales.',
  openGraph: {
    title: 'Embajadores Pasito - Ganá por sumar comercios',
    description: 'Invitá comercios a Pasito con tu link personal y ganá plata, Pasitos, merch y acceso a eventos.',
    type: 'website',
  },
}

type IconCard = {
  icon: LucideIcon
  eyebrow: string
  title: string
  body: string
}

const FLOW = [
  {
    step: '01',
    icon: Users,
    title: 'Te registrás',
    body: 'Recibís tu link personal de Embajador Pasito para compartir con comercios.',
  },
  {
    step: '02',
    icon: Send,
    title: 'Invitás locales',
    body: 'Cafeterías, bares, gimnasios, tiendas, estética, marcas locales y comercios con atención al público.',
  },
  {
    step: '03',
    icon: Link2,
    title: 'Usan tu link',
    body: 'Cuando el comercio se registra desde tu link, queda asociado automáticamente a tu cuenta.',
  },
  {
    step: '04',
    icon: BadgeCheck,
    title: 'Pasito lo activa',
    body: 'Validamos el comercio, el premio gratis, las condiciones, el stock y la operación del local.',
  },
  {
    step: '05',
    icon: Trophy,
    title: 'Ganás por canjes',
    body: 'Cobrás cuando el local empieza a generar movimiento real dentro de Pasito.',
  },
]

const EARNINGS = [
  {
    label: 'Local estándar',
    cash: 'hasta $30.000',
    pasitos: '+ 200 Pasitos',
    tone: 'yellow',
  },
  {
    label: 'Local con 3+ sucursales',
    cash: 'hasta $40.000',
    pasitos: '+ 300 Pasitos',
    tone: 'green',
  },
]

const BEYOND_MONEY: IconCard[] = [
  {
    icon: Shirt,
    eyebrow: 'Merch oficial',
    title: 'Representá Pasito en la calle.',
    body: 'Desbloqueá productos oficiales y materiales para activar comercios con más presencia.',
  },
  {
    icon: Gift,
    eyebrow: 'Bonus',
    title: 'Pasitos extra y beneficios.',
    body: 'Sumá recompensas adicionales por objetivos, campañas y misiones especiales.',
  },
  {
    icon: CalendarDays,
    eyebrow: 'Eventos',
    title: 'Acceso a activaciones.',
    body: 'Participá en eventos, acciones con marcas y encuentros de la comunidad Pasito.',
  },
  {
    icon: Trophy,
    eyebrow: 'Ranking',
    title: 'Competí por tu zona.',
    body: 'Ranking mensual, misiones y la posibilidad de convertirte en referente local.',
  },
]

const BUSINESS_TYPES = [
  { icon: Coffee, label: 'Cafeterías', body: 'Café, meriendas, productos simples y canjeables.' },
  { icon: Store, label: 'Bares y restaurantes', body: 'Propuestas claras para llevar gente al local.' },
  { icon: Dumbbell, label: 'Gimnasios', body: 'Clases, pruebas y beneficios ligados al movimiento.' },
  { icon: Building2, label: 'Tiendas', body: 'Productos o experiencias con atención al público.' },
  { icon: Sparkles, label: 'Centros de estética', body: 'Servicios concretos con stock y condiciones claras.' },
  { icon: MapPin, label: 'Marcas locales', body: 'Negocios de barrio que quieran recibir usuarios.' },
]

const DASHBOARD_ITEMS = [
  'Comercios registrados',
  'Locales activos',
  'Canjes generados',
  'Pasitos ganados',
  'Dinero acumulado',
  'Ranking mensual',
]

const FAQS = [
  {
    question: '¿Qué es un Embajador Pasito?',
    answer: 'Un Embajador Pasito es una persona que invita comercios a sumarse a la app. Si esos comercios se registran, se activan y generan canjes reales, el embajador gana recompensas.',
  },
  {
    question: '¿Qué tengo que hacer?',
    answer: 'Tenés que registrarte como Embajador, recibir tu link personal e invitar comercios a sumarse a Pasito. Cuando un comercio se registra usando tu link, queda asociado a vos.',
  },
  {
    question: '¿A qué tipo de comercios puedo invitar?',
    answer: 'Podés invitar cafeterías, bares, restaurantes, gimnasios, estudios de yoga o pilates, tiendas, centros de estética, heladerías, marcas locales y comercios con atención al público.',
  },
  {
    question: '¿Qué tiene que ofrecer el comercio?',
    answer: 'El comercio tiene que ofrecer un premio gratis real para usuarios de Pasito. Puede ser un producto, beneficio o experiencia, con stock y condiciones claras.',
  },
  {
    question: '¿Me pagan por pasar contactos?',
    answer: 'No. Para que cuente, el comercio tiene que registrarse usando tu link personal y ser validado por Pasito.',
  },
  {
    question: '¿Cómo sabe Pasito qué comercios traje yo?',
    answer: 'Cada Embajador tiene un link y/o código único. Cuando el comercio se registra desde ese link, queda asociado automáticamente a tu cuenta.',
  },
  {
    question: '¿Qué pasa si el comercio no usa mi link?',
    answer: 'Si el comercio no se registra con tu link o código, no podemos asociarlo automáticamente a tu cuenta. Por eso es importante que siempre compartas tu link personal.',
  },
  {
    question: '¿Cuándo empieza a contar un comercio?',
    answer: 'Empieza a contar cuando se registra, es aprobado por Pasito y queda activo dentro de la app con un premio gratis disponible.',
  },
  {
    question: '¿Qué significa que un comercio esté activo?',
    answer: 'Significa que el comercio fue aprobado, tiene su premio cargado, stock disponible, horarios definidos y puede recibir canjes de usuarios.',
  },
  {
    question: '¿Cuándo cobro por un local estándar?',
    answer: 'Por un local estándar podés ganar hasta $30.000 + 200 Pasitos: una parte cuando se activa, otra cuando llega a 10 canjes reales y otra si sigue activo 30 días después.',
  },
  {
    question: '¿Cuándo cobro por un local con 3 o más sucursales?',
    answer: 'Por un comercio con 3 o más sucursales podés ganar hasta $40.000 + 300 Pasitos, siguiendo el mismo sistema: activación, canjes reales y permanencia.',
  },
  {
    question: '¿Por qué el premio fuerte se libera recién con canjes?',
    answer: 'Porque buscamos comercios que funcionen de verdad dentro de Pasito. No premiamos solo registros: premiamos locales que reciben usuarios y generan movimiento real.',
  },
  {
    question: '¿Qué cuenta como canje real?',
    answer: 'Cuenta como canje real cuando un usuario de Pasito va al comercio y utiliza un premio dentro de la app.',
  },
  {
    question: '¿Qué pasa si el comercio se baja antes de llegar a los 10 canjes?',
    answer: 'En ese caso, solo se paga la parte correspondiente a los hitos ya cumplidos. El premio fuerte no se libera hasta que el comercio llegue a los canjes requeridos.',
  },
  {
    question: '¿Qué pasa si dos Embajadores invitan al mismo comercio?',
    answer: 'En general, cuenta para el Embajador cuyo link haya sido usado en el registro. Pasito puede revisar casos especiales o duplicados manualmente.',
  },
  {
    question: '¿Hay un límite de comercios que puedo traer?',
    answer: 'No. Cuantos más comercios reales y activos sumes, más podés ganar y más beneficios podés desbloquear.',
  },
  {
    question: '¿Voy a tener un dashboard?',
    answer: 'Sí. Vas a tener un panel donde vas a poder ver los comercios registrados con tu link, locales activos, canjes generados, Pasitos ganados, dinero acumulado, nivel y ranking mensual.',
  },
  {
    question: '¿Qué más puedo ganar además de dinero?',
    answer: 'Podés ganar Pasitos, merch oficial, acceso a eventos, activaciones con marcas, premios por misiones especiales y la posibilidad de convertirte en referente de una zona.',
  },
  {
    question: '¿Qué son las misiones?',
    answer: 'Son desafíos especiales para Embajadores. Por ejemplo, sumar cafeterías, activar comercios en un barrio específico o traer marcas con varias sucursales. Las misiones pueden tener bonus extra.',
  },
  {
    question: '¿Cómo me sumo?',
    answer: 'Completás el formulario de registro, recibís tu link personal y ya podés empezar a invitar comercios a Pasito.',
  },
]

function SectionLabel({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'yellow' }) {
  return (
    <span
      className="inline-flex items-center gap-3 text-xs font-bold uppercase"
      style={{
        color: tone === 'yellow' ? '#EEFA7A' : '#0C6B45',
        fontFamily: 'var(--font-paytone)',
        letterSpacing: 0,
      }}
    >
      <span className="h-0.5 w-7 rounded-full bg-current" />
      {children}
    </span>
  )
}

export default function EmbajadoresPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FBF8E8] text-[#442920]">
      <nav className="fixed left-0 top-0 z-50 w-full border-b border-[#442920]/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" aria-label="Ir al inicio">
            <Image src="/pasitohorizontal.png" alt="Pasito" width={108} height={26} priority />
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <a href="#como-funciona" className="text-sm font-bold transition-colors hover:text-[#0C6B45]">
              Cómo funciona
            </a>
            <a href="#ganancias" className="text-sm font-bold transition-colors hover:text-[#0C6B45]">
              Ganancias
            </a>
            <a href="#dashboard" className="text-sm font-bold transition-colors hover:text-[#0C6B45]">
              Dashboard
            </a>
            <a href="#faq" className="text-sm font-bold transition-colors hover:text-[#0C6B45]">
              FAQ
            </a>
          </div>

          <a
            href="#formulario"
            className="inline-flex rounded-full bg-[#0C6B45] px-4 py-2.5 text-sm font-bold text-white transition-transform active:scale-95 sm:px-5"
            style={{ fontFamily: 'var(--font-paytone)' }}
          >
            Quiero sumarme
          </a>
        </div>
      </nav>

      <header className="relative overflow-hidden bg-[#0C6B45] pt-24 text-white sm:pt-28">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(/fondo.png)',
            backgroundSize: 620,
            backgroundRepeat: 'repeat',
          }}
        />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 pb-20 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pb-24">
          <div className="max-w-4xl">
            <SectionLabel tone="yellow">Embajadores Pasito</SectionLabel>
            <h1
              className="mt-5 text-5xl leading-[0.95] sm:text-7xl lg:text-6xl xl:text-7xl"
              style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}
            >
              Ganás por sumar comercios a <span className="text-[#EEFA7A]">Pasito.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">
              Convertite en Embajador Pasito, invitá locales con tu link personal y ganá plata, Pasitos, merch y acceso a eventos cuando esos comercios se activan y generan canjes reales.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#formulario"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#EEFA7A] px-7 py-4 text-base font-bold text-[#0C6B45] transition-transform hover:scale-[1.02] active:scale-95"
                style={{ fontFamily: 'var(--font-paytone)' }}
              >
                Quiero sumarme
                <ArrowRight size={19} className="transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/28 px-7 py-4 text-base font-bold text-white transition-colors hover:bg-white/10"
                style={{ fontFamily: 'var(--font-paytone)' }}
              >
                Ver cómo funciona
              </a>
            </div>

          </div>

          <div className="relative">
            <AmbassadorLeadForm />
          </div>
        </div>

        <div className="relative z-10 border-y border-[#EEFA7A]/10 bg-[#442920]">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 text-sm font-bold text-[#EEFA7A] sm:px-6 md:flex-row md:items-center md:justify-between">
            <span>Registros no alcanzan: buscamos comercios que generen canjes reales.</span>
            <span>Tu link personal conecta cada local con tu recompensa.</span>
          </div>
        </div>
      </header>

      <section id="como-funciona" className="scroll-mt-24 bg-[#FBF8E8] py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div>
            <SectionLabel>Cómo funciona</SectionLabel>
            <h2 className="mt-5 max-w-3xl text-4xl leading-[1.02] sm:text-6xl" style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}>
              Una mecánica clara para mover comercios reales.
            </h2>
          </div>

          <div className="relative mt-10">
            <div className="absolute left-8 right-8 top-9 hidden h-px bg-[#0C6B45]/18 md:block" />
            <div className="grid gap-4 md:grid-cols-5">
              {FLOW.map((item, index) => {
                const Icon = item.icon
                const isFirst = index === 0
                const isLast = index === FLOW.length - 1
                const cardStyle = isFirst
                  ? { background: '#0C6B45', color: '#FFFFFF', borderColor: '#0C6B45' }
                  : isLast
                    ? { background: '#EEFA7A', color: '#442920', borderColor: '#EEFA7A' }
                    : { background: '#FFFFFF', color: '#442920', borderColor: 'rgba(68,41,32,0.1)' }

                return (
                  <article
                    key={item.step}
                    className="relative min-h-[230px] rounded-xl border p-6 shadow-[0_14px_36px_rgba(68,41,32,0.06)]"
                    style={cardStyle}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-lg"
                        style={{
                          background: isFirst ? '#EEFA7A' : isLast ? '#0C6B45' : 'rgba(12,107,69,0.1)',
                          color: isFirst ? '#0C6B45' : isLast ? '#EEFA7A' : '#0C6B45',
                        }}
                      >
                        <Icon size={22} />
                      </span>
                      <span
                        className="text-4xl leading-none"
                        style={{
                          color: isFirst ? '#EEFA7A' : isLast ? '#0C6B45' : '#0C6B45',
                          fontFamily: 'var(--font-paytone)',
                        }}
                      >
                        {item.step}
                      </span>
                    </div>
                    <div className="mt-12">
                      <h3 className="text-2xl leading-tight" style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}>
                        {item.title}
                      </h3>
                      <p className={isFirst ? 'mt-4 text-sm leading-6 text-white/72' : 'mt-4 text-sm leading-6 text-[#442920]/68'}>{item.body}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="ganancias" className="scroll-mt-24 bg-[#442920] py-20 text-[#EEFA7A] md:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <SectionLabel tone="yellow">Cuánto podés ganar</SectionLabel>
          <h2 className="mt-5 max-w-6xl text-4xl leading-[1.02] text-white sm:text-6xl lg:text-7xl" style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}>
            La recompensa grande llega cuando el comercio mueve usuarios.
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#EEFA7A]/72">
            El premio fuerte se libera cuando el comercio llega a 10 canjes reales. Así premiamos locales que funcionan dentro de Pasito, no solo registros.
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {EARNINGS.map((earning) => {
              const isGreen = earning.tone === 'green'
              return (
                <article
                  key={earning.label}
                  className="min-h-[230px] rounded-xl border p-7"
                  style={{
                    background: isGreen ? '#0C6B45' : '#EEFA7A',
                    color: isGreen ? '#EEFA7A' : '#442920',
                    borderColor: isGreen ? '#0C6B45' : '#EEFA7A',
                  }}
                >
                  <p className="text-xs font-bold uppercase opacity-70">{earning.label}</p>
                  <p className="mt-6 text-5xl leading-none sm:text-6xl" style={{ fontFamily: 'var(--font-paytone)' }}>
                    {earning.cash}
                  </p>
                  <p className="mt-4 text-3xl leading-none" style={{ fontFamily: 'var(--font-paytone)' }}>
                    {earning.pasitos}
                  </p>
                </article>
              )
            })}
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: CheckCircle2,
                title: 'Una parte cuando se activa.',
                body: 'El local cuenta cuando queda validado, activo y con premio gratis disponible.',
              },
              {
                icon: ReceiptText,
                title: 'Otra parte con 10 canjes.',
                body: 'El hito fuerte confirma que el comercio recibió usuarios y generó movimiento real.',
              },
              {
                icon: Footprints,
                title: 'Otra si sigue activo.',
                body: 'La permanencia 30 días después ayuda a construir una red estable de comercios.',
              },
            ].map((item) => (
              <article key={item.title} className="rounded-xl border border-[#EEFA7A]/15 bg-white/7 p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EEFA7A] text-[#442920]">
                  <item.icon size={24} />
                </div>
                <h3 className="mt-6 text-2xl leading-tight text-white" style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}>
                  {item.title}
                </h3>
                <p className="mt-4 leading-7 text-[#EEFA7A]/70">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="max-w-4xl">
            <SectionLabel>Más que plata</SectionLabel>
            <h2 className="mt-5 text-4xl leading-[1.02] sm:text-6xl" style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}>
              Ser Embajador también desbloquea comunidad, presencia y beneficios.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {BEYOND_MONEY.map((item) => (
              <article key={item.title} className="rounded-xl border border-[#442920]/10 bg-[#FBF8E8] p-7 transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EEFA7A] text-[#0C6B45]">
                  <item.icon size={24} />
                </div>
                <p className="mt-6 text-xs font-bold uppercase text-[#0C6B45]">{item.eyebrow}</p>
                <h3 className="mt-3 text-2xl leading-tight" style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}>
                  {item.title}
                </h3>
                <p className="mt-4 leading-7 text-[#442920]/68">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0C6B45] py-16 text-white md:py-20">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(/fondo.png)', backgroundSize: 620 }} />
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
              <SectionLabel tone="yellow">Qué locales buscamos</SectionLabel>
              <h2 className="mt-5 max-w-xl text-4xl leading-[1.02] sm:text-5xl" style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}>
                Comercios con atención al público y un premio gratis real.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BUSINESS_TYPES.map((item, index) => {
                const isAccent = index === 1 || index === 4
                const isLight = index === 2

                return (
                  <article
                    key={item.label}
                    className="min-h-[176px] rounded-xl border p-6 transition-transform hover:-translate-y-1"
                    style={{
                      background: isAccent ? '#EEFA7A' : isLight ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
                      borderColor: isAccent ? '#EEFA7A' : isLight ? '#FFFFFF' : 'rgba(255,255,255,0.16)',
                      color: isAccent || isLight ? '#0C6B45' : '#FFFFFF',
                    }}
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-lg"
                      style={{
                        background: isAccent || isLight ? 'rgba(12,107,69,0.1)' : '#EEFA7A',
                        color: '#0C6B45',
                      }}
                    >
                      <item.icon size={23} />
                    </div>
                    <h3 className="mt-5 text-2xl leading-tight" style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}>
                      {item.label}
                    </h3>
                    <p className={isAccent || isLight ? 'mt-3 text-sm leading-6 text-[#442920]/70' : 'mt-3 text-sm leading-6 text-white/68'}>
                      {item.body}
                    </p>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard" className="scroll-mt-24 bg-[#FBF8E8] py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <SectionLabel>Dashboard</SectionLabel>
            <h2 className="mt-5 text-4xl leading-[1.02] sm:text-6xl" style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}>
              Vas a ver tu avance en tiempo real.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#442920]/72">
              Comercios registrados, locales activos, canjes generados, Pasitos ganados, dinero acumulado y ranking mensual en un mismo panel.
            </p>
            <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#0C6B45] px-5 py-3 text-sm font-bold text-[#EEFA7A]">
              <BarChart3 size={18} />
              Link personal + métricas + recompensas
            </div>
          </div>

          <div className="rounded-xl bg-[#0C6B45] p-6 text-white shadow-[0_24px_70px_rgba(12,107,69,0.22)] md:p-9 lg:p-10">
            <div className="flex items-start justify-between gap-6 border-b border-white/14 pb-6">
              <div>
                <p className="text-xs font-bold uppercase text-[#EEFA7A]">Dashboard Embajador</p>
                <p className="mt-3 text-4xl leading-[0.98] sm:text-5xl" style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}>
                  Tu zona en movimiento
                </p>
              </div>
              <Sparkles className="mt-1 shrink-0 text-[#EEFA7A]" size={30} />
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {DASHBOARD_ITEMS.map((item, index) => (
                <div key={item} className="flex min-h-16 items-center gap-4 rounded-lg bg-white/10 px-5 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#EEFA7A] text-sm font-bold text-[#0C6B45]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-base font-semibold leading-snug text-white/88">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 bg-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="mt-5 text-4xl leading-[1.02] sm:text-6xl" style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}>
            Embajadores Pasito
          </h2>
          <div className="mt-10 grid gap-3">
            {FAQS.map((faq, index) => (
              <details key={faq.question} className="group rounded-xl border border-[#442920]/10 bg-[#FBF8E8] p-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-5 text-left">
                  <span className="font-bold text-[#442920]">{index + 1}. {faq.question}</span>
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0C6B45] text-sm font-bold text-[#EEFA7A] group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl leading-7 text-[#442920]/70">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#06381f] py-20 text-white md:py-24">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'url(/fondo.png)', backgroundSize: 620 }} />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <SectionLabel tone="yellow">Sumate</SectionLabel>
            <h2 className="mt-5 max-w-4xl text-4xl leading-[1.02] sm:text-6xl" style={{ fontFamily: 'var(--font-paytone)', letterSpacing: 0 }}>
              Convertite en Embajador Pasito.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
              Completá el formulario, recibí tu link personal y empezá a invitar comercios a Pasito.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <a
              href="#formulario"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#EEFA7A] px-8 py-4 text-base font-bold text-[#0C6B45] transition-transform hover:scale-[1.02] active:scale-95"
              style={{ fontFamily: 'var(--font-paytone)' }}
            >
              Quiero ser Embajador Pasito
              <ArrowRight size={19} className="transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/24 px-8 py-4 text-base font-bold text-white transition-colors hover:bg-white/10"
              style={{ fontFamily: 'var(--font-paytone)' }}
            >
              WhatsApp
              <MessageCircle size={18} />
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-[#FBF8E8] py-12">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Image src="/pasitohorizontal.png" alt="Pasito" width={96} height={23} />
            <p className="mt-4 max-w-xs text-sm leading-6 text-[#442920]/62">
              Una red de movimiento, beneficios y experiencias para conectar personas, comercios y ciudades.
            </p>
          </div>
          <div>
            <h3 className="font-bold" style={{ fontFamily: 'var(--font-paytone)' }}>Landing</h3>
            <ul className="mt-4 space-y-2 text-sm text-[#442920]/64">
              <li><a href="#como-funciona" className="hover:text-[#0C6B45]">Cómo funciona</a></li>
              <li><a href="#ganancias" className="hover:text-[#0C6B45]">Ganancias</a></li>
              <li><a href="#dashboard" className="hover:text-[#0C6B45]">Dashboard</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold" style={{ fontFamily: 'var(--font-paytone)' }}>Contacto</h3>
            <ul className="mt-4 space-y-2 text-sm text-[#442920]/64">
              <li><a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-[#0C6B45]">WhatsApp</a></li>
              <li><a href="mailto:contacto@pasito.app" className="hover:text-[#0C6B45]">Escribinos</a></li>
              <li><a href="#formulario" className="hover:text-[#0C6B45]">Postularme</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold" style={{ fontFamily: 'var(--font-paytone)' }}>Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-[#442920]/64">
              <li><Link href="/terminos" className="hover:text-[#0C6B45]">Términos</Link></li>
              <li><Link href="/privacidad" className="hover:text-[#0C6B45]">Privacidad</Link></li>
              <li><Link href="/eliminar-cuenta" className="hover:text-[#0C6B45]">Eliminar cuenta</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-[#442920]/10 px-5 pt-6 text-xs text-[#442920]/50 sm:px-6">
          © {new Date().getFullYear()} Pasito - Buenos Aires, Argentina
        </div>
      </footer>
    </main>
  )
}
