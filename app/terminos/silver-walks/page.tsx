import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

import marketingStyles from '@/app/marketing.module.css'

export const metadata: Metadata = {
  title: 'Términos y condiciones - Silver Walks',
  description: 'Términos y condiciones del evento Silver Walks.',
}

export default function SilverWalksTermsPage() {
  return (
    <main className={marketingStyles.page}>
      <nav style={{ 
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid #efece6',
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          width: 'min(100%, 1264px)',
          minHeight: '68px',
          margin: '0 auto',
          padding: '0 32px'
        }}>
          <Link href="/" style={{ display: 'inline-flex', flex: '0 0 auto' }}>
            <Image src="/brand/logo-green.svg" alt="Pasito" width={104} height={25} />
          </Link>
        </div>
      </nav>

      <article style={{
        maxWidth: '780px',
        margin: '0 auto',
        padding: '80px 32px 120px',
      }}>
        <p style={{ 
          color: '#006d42',
          fontSize: '12px',
          fontWeight: 650,
          letterSpacing: '.6px',
          textTransform: 'uppercase'
        }}>
          Términos y condiciones
        </p>
        <h1 style={{
          marginTop: '14px',
          fontFamily: 'var(--font-bricolage), system-ui, sans-serif',
          fontSize: '48px',
          fontWeight: 800,
          lineHeight: '52px',
          letterSpacing: '-1.5px'
        }}>
          Silver Walks
        </h1>
        <p style={{ marginTop: '14px', color: '#7c7c65', fontSize: '15px', lineHeight: '22px' }}>
          Versión vigente: septiembre de 2026
        </p>

        <section style={{ marginTop: '48px' }}>
          <h2 style={{
            fontFamily: 'var(--font-bricolage), system-ui, sans-serif',
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: '34px',
            letterSpacing: '-.8px'
          }}>
            1. Descripción del evento
          </h2>
          <p style={{ marginTop: '14px', color: '#585843', fontSize: '16px', lineHeight: '26px' }}>
            Silver Walks es un encuentro organizado por Pasito en colaboración con Kiwell que incluye:
          </p>
          <ul style={{ marginTop: '12px', paddingLeft: '24px', color: '#585843', fontSize: '16px', lineHeight: '26px' }}>
            <li>Caminata activa guiada</li>
            <li>Sesión de stretching y relajación</li>
            <li>Charla sobre Medicina 3.0 y longevidad</li>
            <li>Brunch buffet en Augusta</li>
            <li>Kit de productos de marcas participantes</li>
          </ul>
        </section>

        <section style={{ marginTop: '40px' }}>
          <h2 style={{
            fontFamily: 'var(--font-bricolage), system-ui, sans-serif',
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: '34px',
            letterSpacing: '-.8px'
          }}>
            2. Compra de entradas
          </h2>
          <p style={{ marginTop: '14px', color: '#585843', fontSize: '16px', lineHeight: '26px' }}>
            La compra de entradas se realiza exclusivamente a través de pasito.app/silver. 
            El pago se procesa de forma segura mediante Rebill. Una vez confirmado el pago, 
            recibirás un email con tu código QR y número de entrada.
          </p>
          <p style={{ marginTop: '14px', color: '#585843', fontSize: '16px', lineHeight: '26px' }}>
            Las entradas son limitadas y se venden por orden de llegada hasta agotar el cupo de 200 personas.
          </p>
        </section>

        <section style={{ marginTop: '40px' }}>
          <h2 style={{
            fontFamily: 'var(--font-bricolage), system-ui, sans-serif',
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: '34px',
            letterSpacing: '-.8px'
          }}>
            3. Política de devoluciones
          </h2>
          <p style={{ marginTop: '14px', color: '#585843', fontSize: '16px', lineHeight: '26px' }}>
            Las entradas adquiridas son no reembolsables. En caso de imposibilidad de asistir, 
            podés transferir tu entrada a otra persona contactando a soporte@pasito.app con 48 horas 
            de anticipación al evento.
          </p>
        </section>

        <section style={{ marginTop: '40px' }}>
          <h2 style={{
            fontFamily: 'var(--font-bricolage), system-ui, sans-serif',
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: '34px',
            letterSpacing: '-.8px'
          }}>
            4. Requisitos de participación
          </h2>
          <p style={{ marginTop: '14px', color: '#585843', fontSize: '16px', lineHeight: '26px' }}>
            Los participantes deben ser mayores de 18 años. Se recomienda un nivel básico de 
            actividad física para disfrutar plenamente de la caminata. Si tenés alguna condición 
            médica que pueda afectar tu participación, consultá con tu médico antes del evento.
          </p>
        </section>

        <section style={{ marginTop: '40px' }}>
          <h2 style={{
            fontFamily: 'var(--font-bricolage), system-ui, sans-serif',
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: '34px',
            letterSpacing: '-.8px'
          }}>
            5. Responsabilidad
          </h2>
          <p style={{ marginTop: '14px', color: '#585843', fontSize: '16px', lineHeight: '26px' }}>
            Pasito y Kiwell no se responsabilizan por lesiones, pérdidas o daños personales 
            durante el evento. Los participantes asisten bajo su propio riesgo y deben contar 
            con su propia cobertura de salud.
          </p>
        </section>

        <section style={{ marginTop: '40px' }}>
          <h2 style={{
            fontFamily: 'var(--font-bricolage), system-ui, sans-serif',
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: '34px',
            letterSpacing: '-.8px'
          }}>
            6. Cancelación del evento
          </h2>
          <p style={{ marginTop: '14px', color: '#585843', fontSize: '16px', lineHeight: '26px' }}>
            En caso de cancelación del evento por causas de fuerza mayor o decisión de los 
            organizadores, se ofrecerá la opción de reembolso completo o transferencia a una 
            nueva fecha.
          </p>
        </section>

        <section style={{ marginTop: '40px' }}>
          <h2 style={{
            fontFamily: 'var(--font-bricolage), system-ui, sans-serif',
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: '34px',
            letterSpacing: '-.8px'
          }}>
            7. Uso de imagen
          </h2>
          <p style={{ marginTop: '14px', color: '#585843', fontSize: '16px', lineHeight: '26px' }}>
            Durante el evento se tomarán fotografías y videos con fines de registro y difusión. 
            Al participar, autorizás el uso de tu imagen en materiales de comunicación de Pasito 
            y Kiwell. Si no deseás aparecer en fotos o videos, informalo al equipo organizador.
          </p>
        </section>

        <section style={{ marginTop: '40px' }}>
          <h2 style={{
            fontFamily: 'var(--font-bricolage), system-ui, sans-serif',
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: '34px',
            letterSpacing: '-.8px'
          }}>
            8. Contacto
          </h2>
          <p style={{ marginTop: '14px', color: '#585843', fontSize: '16px', lineHeight: '26px' }}>
            Para consultas sobre estos términos o sobre el evento, escribinos a <a href="mailto:soporte@pasito.app" style={{ color: '#006d42', textDecoration: 'underline' }}>soporte@pasito.app</a>
          </p>
        </section>

        <div style={{ marginTop: '60px', paddingTop: '32px', borderTop: '1px solid #efece6' }}>
          <Link href="/silver" style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            color: '#006d42',
            fontSize: '14px',
            fontWeight: 650
          }}>
            ← Volver a Silver Walks
          </Link>
        </div>
      </article>
    </main>
  )
}
