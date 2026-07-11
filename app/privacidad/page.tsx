import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata = {
  title: 'Política de Privacidad — Pasito',
  description: 'Política de privacidad de Pasito',
}

export default function PrivacidadPage() {
  return (
    <LegalLayout
      eyebrow="Pasito / Legal"
      title="Política de privacidad"
      description="Cómo cuidamos y usamos la información necesaria para que Pasito funcione para vos."
      updatedAt="Versión 1.4 · Vigente desde el 11 de julio de 2026"
    >
        <div className="prose prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0C6B45' }}>
              1. Introducción
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              La presente Política de Privacidad describe cómo Santiago Schamberger (en adelante, "Pasito", "nosotros" o "el responsable") recopila, utiliza, almacena y protege la información personal de los usuarios de la aplicación móvil Pasito, disponible para dispositivos iOS y Android (en adelante, "la Aplicación").
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Al registrarte y utilizar la Aplicación, aceptás esta Política de Privacidad. Si no estás de acuerdo con alguno de sus términos, por favor no uses la Aplicación.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Esta política se rige por la Ley N.° 25.326 de Protección de los Datos Personales de la República Argentina y su Decreto Reglamentario N.° 1558/2001, y por la Ley N.° 18.331 de Protección de Datos Personales y Acción de Habeas Data de la República Oriental del Uruguay y su Decreto Reglamentario N.° 414/009, según el país donde uses Pasito. También contempla los requisitos de privacidad de Apple App Store y Google Play Store. Para usuarios ubicados en España o en la Unión Europea, se reconocen los derechos y garantías aplicables bajo el Reglamento General de Protección de Datos (RGPD/GDPR), en la medida que corresponda.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0C6B45' }}>
              2. Responsable del Tratamiento de Datos
            </h2>
            <ul className="list-none space-y-2 text-gray-700">
              <li><strong>Responsable:</strong> Santiago Schamberger</li>
              <li><strong>Domicilio:</strong> Ciudad Autónoma de Buenos Aires, Argentina</li>
              <li><strong>Correo electrónico:</strong> <a href="mailto:contacto@pasito.app" className="font-semibold" style={{ color: '#0C6B45' }}>contacto@pasito.app</a></li>
              <li><strong>Aplicación:</strong> Pasito – Move to Earn</li>
              <li><strong>Sitio web / App:</strong> pasito.app</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0C6B45' }}>
              3. Datos que Recopilamos
            </h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: '#0C6B45' }}>
              3.1 Datos de registro y perfil
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Para crear y mantener tu cuenta en Pasito, recopilamos:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Nombre y dirección de correo electrónico, según el método de registro elegido: Apple Sign-In, Google Sign-In o inicio de sesión por email.</li>
              <li>Edad (para verificar que cumplís con la edad mínima requerida).</li>
              <li>Intereses seleccionados voluntariamente durante la configuración del perfil.</li>
              <li>Meta diaria de pasos configurada por el usuario.</li>
              <li>País, provincia, departamento, barrio o zona que el usuario selecciona, según el mercado donde use la Aplicación.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: '#0C6B45' }}>
              3.2 Datos de salud y actividad física
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              La Aplicación solicita acceso de solo lectura al conteo de pasos diarios almacenado en Apple HealthKit (iOS), Google Health Connect (Android) o el sensor de pasos nativo de Android cuando esté habilitado. Esta información se utiliza exclusivamente para:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Calcular los Pasitos ganados cada día.</li>
              <li>Mostrar el progreso diario y el historial de actividad dentro de la Aplicación.</li>
              <li>Registrar el streak (racha) de días consecutivos activos.</li>
              <li>Mantener tu saldo y tu historial vinculados a tu cuenta de Pasito.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>Importante:</strong> Pasito no recopila ningún otro dato de salud (frecuencia cardíaca, sueño, peso, calorías, etc.). Los datos de pasos no se comparten con anunciantes ni se utilizan con fines publicitarios. No se venden. Solo pueden ser procesados por proveedores técnicos necesarios para operar el servicio.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: '#0C6B45' }}>
              3.3 Datos de ubicación
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Para mostrarte comercios adheridos y premios cercanos a tu posición actual, la Aplicación solicita acceso a tu ubicación aproximada o precisa únicamente cuando abrís el mapa de comercios cercanos (permiso "Solo al usar la app").
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>El acceso se solicita únicamente cuando la Aplicación está activa y abierta en pantalla — Pasito no accede a tu ubicación en segundo plano.</li>
              <li>La ubicación se utiliza en tiempo real para calcular la distancia a los comercios adheridos y ordenar las recomendaciones por cercanía.</li>
              <li>No almacenamos un historial de tus ubicaciones ni registramos los lugares que visitás.</li>
              <li>La ubicación no se comparte con los comercios. Puede ser procesada de forma transitoria por proveedores técnicos del mapa para renderizar la experiencia dentro de la app.</li>
              <li>Podés revocar este permiso en cualquier momento desde Ajustes del dispositivo.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: '#0C6B45' }}>
              3.4 Datos de canje y actividad en la Aplicación
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Cuando realizás un canje, registramos:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>El comercio donde se realizó el canje y la categoría del premio.</li>
              <li>La fecha y hora del canje.</li>
              <li>El barrio o zona donde se ubica el comercio.</li>
              <li>El saldo de Pasitos antes y después del canje.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>Nota:</strong> esta es la única información que puede estar disponible de forma agregada y anonimizada para los comercios adheridos a la red Pasito, sin vincularla a ningún usuario identificable.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: '#0C6B45' }}>
              3.5 Datos técnicos y de uso
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Como parte del funcionamiento normal de la Aplicación, podemos recopilar o almacenar:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Tokens de notificaciones push (Firebase Cloud Messaging) vinculados a tu cuenta, si activás las notificaciones.</li>
              <li>Versión instalada de la app, plataforma, estado de permisos, eventos básicos de uso y diagnóstico, necesarios para operar, medir estabilidad y mejorar la experiencia.</li>
              <li>Identificador técnico del dispositivo, datos de integridad, lecturas del sensor de pasos nativo de Android y telemetría de sincronización de pasos, necesarios para prevenir fraude, evitar duplicaciones y corregir errores de conteo.</li>
              <li>Datos técnicos mínimos necesarios para autenticarte, sincronizar tus pasos y operar la app de forma segura.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: '#0C6B45' }}>
              3.6 Datos que NO recopilamos
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Pasito no recopila ni almacena:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Datos bancarios, de tarjetas de crédito ni medios de pago.</li>
              <li>Documentos de identidad (DNI, CUIL, pasaporte).</li>
              <li>Datos sensibles (origen racial, religión, opiniones políticas, datos médicos más allá del conteo de pasos).</li>
              <li>Contactos del teléfono ni acceso a la cámara o micrófono.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0C6B45' }}>
              4. Finalidad del Tratamiento
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Los datos recopilados se utilizan exclusivamente para los siguientes fines:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Prestar el servicio de la Aplicación: calcular Pasitos, gestionar el saldo, habilitar canjes.</li>
              <li>Garantizar la seguridad y prevenir el fraude.</li>
              <li>Enviar notificaciones push relacionadas con el servicio.</li>
              <li>Mostrarte comercios adheridos cercanos a tu posición y ordenar las recomendaciones por distancia cuando abrís el mapa.</li>
              <li>Medir estabilidad, errores, rendimiento y uso básico de la Aplicación mediante servicios de analítica y diagnóstico.</li>
              <li>Cumplir con las obligaciones legales aplicables en la República Argentina, la República Oriental del Uruguay y, cuando corresponda, en otros países donde la Aplicación esté disponible.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Pasito no realiza marketing directo, no cede datos a anunciantes y no utiliza los datos para perfilado publicitario de ningún tipo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0C6B45' }}>
              5. Compartición de Datos con Terceros
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Pasito no vende, alquila ni comercializa datos personales. La única información que puede estar disponible para los comercios adheridos es de carácter estadístico y agregado, sin ningún dato que permita identificar a un usuario en particular.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Para operar el servicio, Pasito utiliza los siguientes proveedores de tecnología:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Supabase – Base de datos y autenticación (EE.UU.)</li>
              <li>Firebase (Google) – Notificaciones push (EE.UU.)</li>
              <li>Firebase Analytics – Analítica de uso de la Aplicación (EE.UU.)</li>
              <li>Firebase Crashlytics – Diagnóstico de fallos y estabilidad (EE.UU.)</li>
              <li>Google Maps Platform – Mapas y visualización de comercios cercanos (EE.UU.)</li>
              <li>Apple – Autenticación via Sign in with Apple (EE.UU.)</li>
              <li>Google – Autenticación via Google Sign-In (EE.UU.)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Todos estos proveedores procesan datos en servidores ubicados fuera de la Argentina (principalmente en Estados Unidos). Al aceptar esta política, el usuario consiente expresamente la transferencia internacional de sus datos en los términos del artículo 12 de la Ley 25.326.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0C6B45' }}>
              6. Datos de Salud – Declaración Especial
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Pasito accede a los datos de pasos almacenados en Apple HealthKit (iOS), Google Health Connect (Android) o al contador técnico del sensor de pasos nativo de Android únicamente bajo las siguientes condiciones:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Acceso de solo lectura:</strong> la Aplicación nunca escribe ni modifica datos en HealthKit ni Health Connect.</li>
              <li><strong>Solo conteo de pasos:</strong> no se accede a ningún otro tipo de dato de salud.</li>
              <li><strong>Vinculado a tu cuenta:</strong> los pasos sincronizados se asocian a tu cuenta de Pasito para calcular saldo, historial y rachas.</li>
              <li><strong>No se comparte con fines comerciales:</strong> los datos de pasos no se transfieren a anunciantes, socios comerciales ni se usan para fines distintos al funcionamiento de Pasito.</li>
              <li><strong>No se venden:</strong> bajo ninguna circunstancia los datos de salud se venden ni se usan con fines comerciales o publicitarios.</li>
              <li>Podés revocar el acceso en cualquier momento desde la configuración de tu dispositivo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0C6B45' }}>
              7. Retención de Datos
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Conservamos los datos personales durante el tiempo que la cuenta esté activa. Si solicitás la eliminación de tu cuenta, procederemos a borrar o anonimizar tus datos dentro de los 30 días corridos de recibida la solicitud, salvo que exista una obligación legal que requiera su conservación por un período mayor.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Los datos de actividad física se conservan mientras la cuenta esté activa y se eliminan junto con la cuenta. Los datos agregados y anonimizados pueden conservarse indefinidamente, dado que no permiten identificar a ningún usuario.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0C6B45' }}>
              8. Derechos del Usuario (ARCO)
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              De acuerdo con la Ley 25.326 de Argentina y la Ley 18.331 de Uruguay, según corresponda, tenés los siguientes derechos sobre tus datos personales:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Acceso:</strong> podés solicitar qué datos personales tuyos tenemos almacenados.</li>
              <li><strong>Rectificación:</strong> podés corregir datos inexactos o incompletos desde la propia Aplicación o contactándonos.</li>
              <li><strong>Cancelación / Supresión:</strong> podés solicitar la eliminación de tu cuenta y tus datos. También podés hacerlo desde la pantalla de perfil dentro de la Aplicación.</li>
              <li><strong>Oposición:</strong> podés oponerte al tratamiento de tus datos para determinadas finalidades.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Si residís en España o en la Unión Europea, también podés ejercer los derechos de portabilidad, limitación del tratamiento, oposición en los casos previstos por el Reglamento General de Protección de Datos, y presentar un reclamo ante la autoridad de control competente.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Para ejercer cualquiera de estos derechos, escribinos a{' '}
              <a href="mailto:contacto@pasito.app" className="font-semibold" style={{ color: '#0C6B45' }}>
                contacto@pasito.app
              </a>
              {' '}con el asunto "Derechos ARCO". Responderemos dentro de los 5 días hábiles.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              La Agencia de Acceso a la Información Pública (AAIP) es el organismo de control de la Ley 25.326. Si considerás que tus derechos no fueron atendidos, podés presentar una denuncia en{' '}
              <a href="https://www.argentina.gob.ar/aaip" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: '#0C6B45' }}>
                www.argentina.gob.ar/aaip
              </a>.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              En Uruguay, la Unidad Reguladora y de Control de Datos Personales (URCDP) es el órgano de control de la Ley 18.331. Podés conocer sus canales de orientación y denuncia en{' '}
              <a href="https://www.gub.uy/unidad-reguladora-control-datos-personales/" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: '#0C6B45' }}>
                gub.uy/urcdp
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0C6B45' }}>
              9. Menores de Edad
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              La Aplicación está dirigida a personas de 16 años o más. Los usuarios de entre 16 y 18 años pueden utilizar la Aplicación con el consentimiento expreso de su representante legal o tutor, quien asume la responsabilidad por el uso que el menor realice.
            </p>
            <p className="text-gray-700 leading-relaxed">
              No recopilamos intencionalmente datos de menores de 16 años. Si tomamos conocimiento de que un menor de esa edad ha creado una cuenta sin autorización, procederemos a eliminar sus datos de forma inmediata. Si sos padre, madre o tutor y creés que tu hijo/a se registró sin tu autorización, contactanos a{' '}
              <a href="mailto:contacto@pasito.app" className="font-semibold" style={{ color: '#0C6B45' }}>
                contacto@pasito.app
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0C6B45' }}>
              10. Seguridad
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Implementamos medidas técnicas y organizativas para proteger los datos personales frente a acceso no autorizado, pérdida o divulgación, entre ellas:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Comunicaciones cifradas mediante HTTPS/TLS.</li>
              <li>Autenticación mediante proveedores de identidad reconocidos (Apple, Google).</li>
              <li>Políticas de seguridad a nivel de base de datos (Row-Level Security en Supabase).</li>
              <li>Funciones de backend con permisos mínimos necesarios.</li>
              <li>Sin transmisión de información sensible en parámetros de URL.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Ningún sistema es completamente infalible. En caso de una brecha de seguridad que afecte tus datos, te notificaremos en los plazos y formas previstos por la normativa vigente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0C6B45' }}>
              11. Modificaciones a esta Política
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Podemos actualizar esta Política de Privacidad periódicamente. Cuando lo hagamos, actualizaremos la fecha de vigencia al inicio del documento y, si los cambios son significativos, te notificaremos mediante un aviso en la Aplicación o por correo electrónico. El uso continuado de la Aplicación tras la notificación implica la aceptación de la política actualizada.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#0C6B45' }}>
              12. Contacto
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Para consultas, reclamos o solicitudes relacionadas con esta Política de Privacidad, podés comunicarte con nosotros:
            </p>
            <ul className="list-none space-y-2 text-gray-700">
              <li>
                <strong>Correo electrónico:</strong>{' '}
                <a href="mailto:contacto@pasito.app" className="font-semibold" style={{ color: '#0C6B45' }}>
                  contacto@pasito.app
                </a>
              </li>
              <li>
                <strong>Asunto sugerido:</strong> "Consulta de Privacidad" o "Derechos ARCO"
              </li>
            </ul>
          </section>
        </div>

    </LegalLayout>
  )
}
