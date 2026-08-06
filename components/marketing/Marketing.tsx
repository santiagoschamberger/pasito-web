import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Download } from 'lucide-react'

import styles from '@/app/marketing.module.css'

export const APP_STORE_URL = 'https://apps.apple.com/ar/app/pasito/id6760863724'
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=ar.pasito.pasito&hl=es'
export const PARTNERS_URL = 'https://partners.pasito.app'
export const PARTNERS_REGISTER_URL = 'https://partners.pasito.app/register'
export const WHATSAPP_URL = 'https://wa.me/5491136491620?text=Hola%2C%20quiero%20sumar%20mi%20local%20a%20Pasito.'
export const ENTERPRISE_WHATSAPP_URL = 'https://wa.me/5491136491620?text=Hola%2C%20quiero%20activar%20Pasito%20Empresa%20en%20mi%20organizaci%C3%B3n.'
export const BRANDS_WHATSAPP_URL = 'https://wa.me/5491136491620?text=Hola%2C%20quiero%20reservar%20una%20activaci%C3%B3n%20de%20marca%20en%20Pasito.'
export const DISNEY_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Disney.svg'

type PressLogo = {
  name: string
  src: string
  href: string
  width: number
  height: number
  remote?: boolean
}

const PRESS_LOGOS: PressLogo[] = [
  {
    name: 'LA NACION',
    src: '/marketing/press/la-nacion.svg',
    href: 'https://www.lanacion.com.ar/lifestyle/tiene-26-anos-y-creo-la-app-argentina-furor-que-da-premios-por-caminar-en-tres-dias-se-sumaron-50-nid06052026/',
    width: 715,
    height: 75,
  },
  {
    name: 'Infobae',
    src: '/marketing/press/infobae.svg',
    href: 'https://www.infobae.com/tendencias/2026/05/18/caminar-y-sumar-puntos-como-funciona-la-app-que-permite-canjear-pasos-por-productos-en-buenos-aires/',
    width: 512,
    height: 122,
  },
  {
    name: 'iProfesional',
    src: '/marketing/press/iprofesional.jpg',
    href: 'https://www.iprofesional.com/tecnologia/454430-pasito-app-argentina-premia-caminar-cafes-comidas',
    width: 1548,
    height: 158,
  },
  {
    name: 'El Destape',
    src: 'https://www.eldestapeweb.com/img/estructura/logo.png',
    href: 'https://www.eldestapeweb.com/sociedad/pasito-lanzan-una-aplicacion-que-te-regala-comida-y-entradas-para-el-cine-solo-por-caminar-202655182940',
    width: 330,
    height: 94,
    remote: true,
  },
  {
    name: 'El Observador',
    src: '/marketing/press/el-observador.svg',
    href: 'https://www.elobservador.com.uy/cafe-y-negocios/pasito-asi-funciona-la-app-argentina-que-da-premios-caminar-desembarco-uruguay-y-ya-suma-mas-20000-usuarios-n6048026',
    width: 500,
    height: 73,
  },
  {
    name: 'Telefe Noticias',
    src: '/marketing/press/telefe.svg',
    href: 'https://noticias.mitelefe.com/informes-especiales/pasito-la-app-que-premia-con-cafes-y-comidas-a-los-que-caminan-pid2552189',
    width: 390,
    height: 60,
  },
  {
    name: 'Empre.AR',
    src: 'https://empre.ar/wp-content/uploads/2025/05/Diseno-sin-titulo-16.png',
    href: 'https://empre.ar/podcast/pasito-la-app-que-paga-por-caminar/',
    width: 146,
    height: 70,
    remote: true,
  },
]

export function MarketingNav({ active = 'home' }: { active?: 'home' | 'comercios' | 'empresas' | 'marcas' | 'merch' }) {
  const isCommerce = active === 'comercios'
  const isEnterprise = active === 'empresas'
  const isBrands = active === 'marcas'
  const isMerch = active === 'merch'
  const contextualLink = isCommerce
    ? { href: '#planes', label: 'Ver planes' }
    : isEnterprise
      ? { href: '#como-funciona', label: 'Cómo funciona' }
      : isBrands
        ? { href: '#formatos', label: 'Ver formatos' }
        : null

  return (
    <nav className={styles.navbar} aria-label="Navegación principal">
      <div className={styles.navInner}>
        <Link href="/" className={styles.logo} aria-label="Pasito, inicio">
          <Image src="/brand/logo-green.svg" alt="Pasito" width={96} height={23} priority />
        </Link>
        <div className={styles.navLinks}>
          <Link className={`${styles.navLink} ${isCommerce ? styles.navLinkActive : ''}`} href="/comercios">Comercios</Link>
          <Link className={`${styles.navLink} ${isBrands ? styles.navLinkActive : ''}`} href="/marcas">Marcas</Link>
          <Link className={`${styles.navLink} ${isEnterprise ? styles.navLinkActive : ''}`} href="/empresas">Empresas</Link>
          <Link className={`${styles.navLink} ${isMerch ? styles.navLinkActive : ''}`} href="/tienda">Merch</Link>
        </div>
        <div className={styles.navActions}>
          {contextualLink && <a className={styles.navTextButton} href={contextualLink.href}>{contextualLink.label}</a>}
          <a
            className={styles.navLogin}
            href={PARTNERS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Iniciar sesión
          </a>
          <a
            className={`${styles.pinkButton} ${styles.navCta}`}
            href={PARTNERS_REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Sumar mi comercio
          </a>
        </div>
        <details className={styles.mobileNav}>
          <summary className={styles.mobileNavToggle} aria-label="Abrir menú de navegación">
            <span>Menú</span>
            <span className={styles.mobileNavIcon} aria-hidden="true"><i /><i /></span>
          </summary>
          <div className={styles.mobileNavPanel}>
            <div className={styles.mobileNavLinks}>
              <Link className={`${styles.mobileNavLink} ${isCommerce ? styles.mobileNavLinkActive : ''}`} href="/comercios">Comercios</Link>
              <Link className={`${styles.mobileNavLink} ${isBrands ? styles.mobileNavLinkActive : ''}`} href="/marcas">Marcas</Link>
              <Link className={`${styles.mobileNavLink} ${isEnterprise ? styles.mobileNavLinkActive : ''}`} href="/empresas">Empresas</Link>
              <Link className={`${styles.mobileNavLink} ${isMerch ? styles.mobileNavLinkActive : ''}`} href="/tienda">Merch</Link>
              {contextualLink && <a className={styles.mobileNavContext} href={contextualLink.href}>{contextualLink.label}</a>}
            </div>
            <div className={styles.mobileNavActions}>
              <a className={styles.mobileNavLogin} href={PARTNERS_URL} target="_blank" rel="noopener noreferrer">Iniciar sesión</a>
              <a className={`${styles.pinkButton} ${styles.mobileNavRegister}`} href={PARTNERS_REGISTER_URL} target="_blank" rel="noopener noreferrer">Sumar mi comercio</a>
            </div>
          </div>
        </details>
      </div>
    </nav>
  )
}

export function StoreButtons() {
  return (
    <div className={`${styles.heroButtons} ${styles.storeBadges}`}>
      <a className={styles.storeBadgeLink} href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Descargar Pasito en App Store">
        <span className={styles.storeBadgeIcon} aria-hidden="true"><Download size={17} strokeWidth={2.3} /></span>
        <span className={styles.storeBadgeCopy}>
          <small>Descargá en</small>
          <strong>App Store</strong>
        </span>
      </a>
      <a className={`${styles.storeBadgeLink} ${styles.googleBadgeLink}`} href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" aria-label="Descargar Pasito en Google Play">
        <span className={styles.storeBadgeIcon} aria-hidden="true"><Download size={17} strokeWidth={2.3} /></span>
        <span className={styles.storeBadgeCopy}>
          <small>Descargá en</small>
          <strong>Google Play</strong>
        </span>
      </a>
    </div>
  )
}

export function StatsBand({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <div className={styles.stats} aria-label="Pasito en números">
      {stats.map((stat) => (
        <div className={styles.stat} key={stat.label}>
          <span className={styles.statValue}>{stat.value}</span>
          <span className={styles.statLabel}>{stat.label}</span>
        </div>
      ))}
    </div>
  )
}

export function PhoneFan({ left, center, right, prefix = 'Pasito' }: { left: string; center: string; right: string; prefix?: string }) {
  return (
    <div className={styles.phoneFan} aria-label="Vistas de la aplicación Pasito" data-phone-fan data-motion-item>
      <Image className={styles.phoneLeft} src={left} alt={`${prefix} · vista izquierda`} width={696} height={1440} unoptimized data-fan-index="-1" />
      <Image className={styles.phoneRight} src={right} alt={`${prefix} · vista derecha`} width={696} height={1440} unoptimized data-fan-index="1" />
      <Image className={styles.phoneCenter} src={center} alt={`${prefix} · vista principal`} width={1392} height={2880} unoptimized data-fan-index="0" />
    </div>
  )
}

export function NumberedOverline({ children, light = false }: { number: string; children: React.ReactNode; light?: boolean }) {
  return (
    <span className={`${styles.overline} ${styles.numberedOverline} ${light ? styles.accent : ''}`}>
      {children}
    </span>
  )
}

export function CheckIcon({ size = 18 }: { size?: number }) {
  return <Check size={size} strokeWidth={2.8} aria-hidden="true" />
}

export function RulesList({ rules }: { rules: string[] }) {
  return (
    <div className={styles.rulesList}>
      {rules.map((rule) => (
        <div className={styles.rule} key={rule}>
          <span className={styles.ruleIcon}><CheckIcon /></span>
          <span>{rule}</span>
        </div>
      ))}
    </div>
  )
}

export function BrandRow({ light = false }: { light?: boolean }) {
  const brands: ({ name: string; src: string; width: number; height: number; remote?: boolean })[] = [
    { name: 'Disney', src: DISNEY_LOGO_URL, width: 126, height: 54, remote: true },
    { name: 'Decathlon', src: '/marketing/brands/decathlon.svg', width: 124, height: 28 },
    { name: 'KFC', src: '/marketing/brands/kfc.svg', width: 86, height: 30 },
    { name: "Wendy's", src: '/marketing/brands/wendys.svg', width: 84, height: 42 },
  ]
  return (
    <div className={styles.brandRow} data-motion-item>
      {brands.map((brand) => (
        <div className={`${styles.brandTile} ${light ? styles.brandTileLight : ''}`} key={brand.name} data-motion-item>
          {brand.remote ? (
            <img className={styles.brandLogo} src={brand.src} alt={brand.name} width={brand.width} height={brand.height} />
          ) : (
            <Image className={styles.brandLogo} src={brand.src} alt={brand.name} width={brand.width} height={brand.height} unoptimized />
          )}
        </div>
      ))}
    </div>
  )
}

export function FinalCta({ commerce = false, title, storePrompt }: { commerce?: boolean; title?: React.ReactNode; storePrompt?: string }) {
  return (
    <section id="cta" className={`${styles.container} ${styles.finalWrap}`}>
      <div className={styles.finalCta}>
        <span className={styles.orbOne} aria-hidden="true" />
        <span className={styles.orbTwo} aria-hidden="true" />
        <h2 className={styles.finalTitle}>
          {title ?? (commerce ? <>Tu local, a un <span className={styles.accent}>pasito</span> de nuevos clientes.</> : <>Tu ciudad está llena de <span className={styles.accent}>premios</span>. Salí a buscarlos.</>)}
        </h2>
        {commerce ? (
          <>
            <p className={styles.finalText}>Vos ofrecés la experiencia. Nosotros acercamos a las personas.</p>
            <div className={styles.finalActions}>
              <a className={`${styles.pinkButton} ${styles.heroPrimary}`} href={PARTNERS_REGISTER_URL} target="_blank" rel="noopener noreferrer">
                Sumá tu comercio <ArrowRight size={18} />
              </a>
            </div>
          </>
        ) : (
          <>
            <StoreButtons />
            {storePrompt && <p className={styles.finalStorePrompt}>{storePrompt}</p>}
          </>
        )}
      </div>
    </section>
  )
}

export function PressSection() {
  return (
    <section className={styles.pressSection} aria-labelledby="press-heading">
      <div className={`${styles.container} ${styles.pressInner}`}>
        <div className={styles.pressHeading}>
          <h2 id="press-heading">Pasito en las <span>noticias</span></h2>
          <p>Medios de Argentina y Uruguay ya contaron cómo estamos convirtiendo movimiento en bienestar, experiencias y comercio.</p>
        </div>
        <div className={styles.pressLogos} aria-label="Medios que hablaron de Pasito">
          {PRESS_LOGOS.map((logo) => (
            <a
              className={styles.pressLogo}
              href={logo.href}
              key={logo.name}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Leer la nota de ${logo.name} sobre Pasito`}
            >
              {logo.remote
                ? <img src={logo.src} alt={logo.name} width={logo.width} height={logo.height} loading="lazy" decoding="async" />
                : <Image src={logo.src} alt={logo.name} width={logo.width} height={logo.height} unoptimized />}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export function MarketingFooter({ commerce = false, enterprise = false, brands = false }: { commerce?: boolean; enterprise?: boolean; brands?: boolean }) {
  return (
    <>
      <PressSection />
      <footer className={`${styles.container} ${styles.footer}`}>
        <Link href="/" className={styles.logo} aria-label="Pasito, inicio">
          <Image src="/brand/logo-green.svg" alt="Pasito" width={96} height={23} />
        </Link>
        <div className={styles.footerContent}>
          <div className={styles.footerLinks}>
            {brands ? (
              <>
                <Link className={styles.footerLink} href="/comercios">¿Tenés un local?</Link>
              </>
            ) : enterprise ? (
              <>
                <Link className={styles.footerLink} href="/marcas">¿Sos una marca?</Link>
                <Link className={styles.footerLink} href="/comercios">¿Tenés un local?</Link>
              </>
            ) : commerce ? (
              <>
                <Link className={styles.footerLink} href="/marcas">¿Sos una marca?</Link>
                <Link className={styles.footerLink} href="/empresas">¿Buscás bienestar para tu equipo?</Link>
              </>
            ) : (
              <>
                <Link className={styles.footerLink} href="/comercios">¿Tenés un local?</Link>
                <Link className={styles.footerLink} href="/marcas">¿Sos una marca?</Link>
                <Link className={styles.footerLink} href="/empresas">¿Buscás bienestar para tu equipo?</Link>
              </>
            )}
          </div>
          <div className={styles.footerLegalLinks} aria-label="Enlaces legales">
            <Link className={styles.footerLegalLink} href="/privacidad">Política de privacidad</Link>
            <Link className={styles.footerLegalLink} href="/terminos">Términos y condiciones</Link>
            <Link className={styles.footerLegalLink} href="/terminos/clv">Términos del desafío</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
