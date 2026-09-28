import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

import styles from '../../terminos/terminos.module.css'

export const metadata: Metadata = {
  title: 'Términos y Condiciones - Pasito Walking Club Uruguay',
  robots: 'noindex',
}

export default function WalkingClubUyTermsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Pasito, inicio">
          <Image src="/brand/logo-green.svg" alt="Pasito" width={96} height={24} />
        </Link>
        <Link href="/walking-club-uy" className={styles.backLink}>
          <ArrowLeft size={16} /> Volver al evento
        </Link>
      </header>

      <article className={styles.content}>
        <h1>Términos y Condiciones<br />Pasito Walking Club Uruguay</h1>
        
        <p className={styles.updated}>Última actualización: 28 de septiembre de 2026</p>

        <section>
          <h2>1. Aceptación de los Términos</h2>
          <p>
            Al adquirir una entrada para el evento &quot;Pasito Walking Club&quot; que se realizará el día sábado 10 de octubre de 2026 en Casa Fauno, Parque Rodó, Montevideo, Uruguay, aceptás los presentes términos y condiciones en su totalidad.
          </p>
        </section>

        <section>
          <h2>2. Descripción del Evento</h2>
          <p>
            Pasito Walking Club es un encuentro presencial que incluye:
          </p>
          <ul>
            <li>Caminata grupal de aproximadamente 10.000 pasos</li>
            <li>Actividades de estiramiento y yoga</li>
            <li>Brunch en Casa Fauno (menú incluido con la entrada)</li>
            <li>Experiencias con marcas aliadas</li>
            <li>Música y entretenimiento</li>
          </ul>
          <p>
            <strong>Fecha:</strong> Sábado 10 de octubre de 2026<br />
            <strong>Horario:</strong> 10:30 a 15:00 hs<br />
            <strong>Lugar:</strong> Casa Fauno, Parque Rodó, Montevideo<br />
            <strong>Punto de encuentro:</strong> Rambla Presidente Wilson y Bulevar Artigas
          </p>
        </section>

        <section>
          <h2>3. Compra de Entradas</h2>
          <p>
            Las entradas se venden en tandas con diferentes precios. El valor de cada tanda es en pesos uruguayos (UYU) y no es reembolsable salvo cancelación del evento por causas no imputables a los asistentes.
          </p>
          <p>
            El pago se procesa de forma segura mediante Dlocal. Una vez confirmado el pago, recibirás un código QR único por cada entrada adquirida al correo electrónico proporcionado.
          </p>
          <p>
            Se permite un máximo de 6 entradas por compra.
          </p>
        </section>

        <section>
          <h2>4. Uso de las Entradas</h2>
          <p>
            Cada entrada es válida para una (1) persona. El código QR es personal e intransferible. Podés compartir el código con otra persona, pero una vez utilizado para ingresar al evento, no podrá ser usado nuevamente.
          </p>
          <p>
            El código QR debe presentarse al momento de la acreditación. No se permitirá el ingreso sin un código válido.
          </p>
        </section>

        <section>
          <h2>5. Política de Cancelación y Reembolso</h2>
          <p>
            Las entradas no son reembolsables excepto en caso de cancelación del evento por parte de la organización.
          </p>
          <p>
            En caso de lluvia o condiciones meteorológicas adversas, el evento podrá ser reprogramado. La organización comunicará la nueva fecha con al menos 48 horas de anticipación y las entradas seguirán siendo válidas.
          </p>
          <p>
            Si el evento es cancelado definitivamente, se reembolsará el 100% del valor de la entrada al medio de pago utilizado.
          </p>
        </section>

        <section>
          <h2>6. Responsabilidades y Limitaciones</h2>
          <p>
            Los asistentes participan del evento bajo su propia responsabilidad. Es recomendable que cada persona evalúe su condición física antes de participar en la caminata.
          </p>
          <p>
            La organización no se responsabiliza por objetos personales perdidos, dañados o robados durante el evento.
          </p>
          <p>
            El menú del brunch está sujeto a disponibilidad y puede sufrir modificaciones menores sin previo aviso. En caso de alergias o restricciones alimentarias, es responsabilidad del asistente informarse sobre los ingredientes antes de consumir.
          </p>
        </section>

        <section>
          <h2>7. Conducta en el Evento</h2>
          <p>
            Se espera que todos los asistentes mantengan un comportamiento respetuoso hacia los demás participantes, el personal del evento y el lugar. La organización se reserva el derecho de expulsar sin reembolso a quienes incumplan estas normas o perturben el desarrollo del evento.
          </p>
        </section>

        <section>
          <h2>8. Captación de Imágenes</h2>
          <p>
            Durante el evento se tomarán fotografías y videos con fines promocionales y de registro. Al asistir, autorizás el uso de tu imagen en materiales de difusión de Pasito y sus marcas aliadas.
          </p>
          <p>
            Si no deseás aparecer en fotografías o videos, te pedimos que lo comuniques al equipo de producción en el lugar.
          </p>
        </section>

        <section>
          <h2>9. Protección de Datos Personales</h2>
          <p>
            Los datos personales proporcionados durante la compra (nombre, email, teléfono) serán tratados conforme a nuestra{' '}
            <Link href="/privacidad">Política de Privacidad</Link> y serán utilizados exclusivamente para la gestión del evento y comunicaciones relacionadas.
          </p>
        </section>

        <section>
          <h2>10. Modificaciones</h2>
          <p>
            La organización se reserva el derecho de modificar estos términos en cualquier momento. Las modificaciones serán comunicadas a través del sitio web y por correo electrónico a los compradores de entradas.
          </p>
        </section>

        <section>
          <h2>11. Contacto</h2>
          <p>
            Para consultas o dudas sobre el evento, escribinos a{' '}
            <a href="mailto:hola@pasito.app">hola@pasito.app</a>
          </p>
        </section>

        <footer className={styles.footer}>
          <p>
            <Link href="/walking-club-uy">Volver al evento</Link>
            {' · '}
            <Link href="/terminos">Términos generales</Link>
            {' · '}
            <Link href="/privacidad">Privacidad</Link>
          </p>
        </footer>
      </article>
    </main>
  )
}
