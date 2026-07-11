import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Trash2, Mail, UserX } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Eliminar cuenta — Pasito',
  description: 'Instrucciones para eliminar tu cuenta de Pasito.',
}

export default function EliminarCuentaPage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0C6B45 0%, #084d32 100%)' }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 85%, rgba(238,250,122,0.08) 0%, transparent 50%), radial-gradient(circle at 85% 10%, rgba(238,250,122,0.06) 0%, transparent 45%)',
        }}
      />

      <nav className="relative border-b border-white/10">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-70 transition-opacity text-white"
          >
            <ArrowLeft size={18} />
            Volver
          </Link>
          <Image
            src="/pasitohorizontal.png"
            alt="Pasito"
            width={80}
            height={26}
            className="brightness-0 invert"
          />
        </div>
      </nav>

      <main className="relative max-w-2xl mx-auto px-5 py-16 sm:px-6">
        <div className="text-center mb-12">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(238,250,122,0.12)' }}
          >
            <UserX size={28} style={{ color: '#EEFA7A' }} />
          </div>
          <h1
            className="text-4xl md:text-5xl mb-4 font-display"
            style={{ color: '#EEFA7A' }}
          >
            Eliminar cuenta
          </h1>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Si querés eliminar tu cuenta de Pasito, podés hacerlo de dos maneras.
          </p>
        </div>

        <div className="space-y-6">
          {/* Option 1: From the app */}
          <div
            className="rounded-2xl p-8"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(238,250,122,0.12)' }}
              >
                <Trash2 size={20} style={{ color: '#EEFA7A' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-3">
                  Opción 1: Desde la app
                </h2>
                <ol className="space-y-2 text-[15px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  <li className="flex gap-2">
                    <span className="font-bold shrink-0" style={{ color: '#EEFA7A' }}>1.</span>
                    Abrí la app de Pasito e ingresá a tu cuenta.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold shrink-0" style={{ color: '#EEFA7A' }}>2.</span>
                    Andá a <strong className="text-white">Perfil</strong>.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold shrink-0" style={{ color: '#EEFA7A' }}>3.</span>
                    Tocá <strong className="text-white">Ajustes</strong>.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold shrink-0" style={{ color: '#EEFA7A' }}>4.</span>
                    Seleccioná <strong className="text-white">Eliminar cuenta</strong>.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold shrink-0" style={{ color: '#EEFA7A' }}>5.</span>
                    Confirmá la eliminación.
                  </li>
                </ol>
                <p className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Tu cuenta y todos los datos asociados serán eliminados de forma permanente.
                </p>
              </div>
            </div>
          </div>

          {/* Option 2: By email */}
          <div
            className="rounded-2xl p-8"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(238,250,122,0.12)' }}
              >
                <Mail size={20} style={{ color: '#EEFA7A' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-3">
                  Opción 2: Por email
                </h2>
                <p className="text-[15px] mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Si no podés acceder a tu cuenta o preferís hacerlo por email, escribinos a:
                </p>
                <a
                  href="mailto:contacto@pasito.app?subject=Solicitud%20de%20eliminación%20de%20cuenta"
                  className="inline-flex items-center gap-2 text-lg font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: '#EEFA7A' }}
                >
                  <Mail size={20} />
                  contacto@pasito.app
                </a>
                <p className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Incluí el email con el que te registraste. Procesaremos tu solicitud en un plazo máximo de 48 horas.
                </p>
              </div>
            </div>
          </div>

          {/* What happens */}
          <div
            className="rounded-2xl p-8"
            style={{ background: 'rgba(238,250,122,0.06)', border: '1px solid rgba(238,250,122,0.15)' }}
          >
            <h3 className="text-lg font-bold text-white mb-3">
              ¿Qué pasa cuando eliminás tu cuenta?
            </h3>
            <ul className="space-y-2 text-[15px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <li className="flex gap-2">
                <span style={{ color: '#EEFA7A' }}>•</span>
                Se eliminan todos tus datos personales (nombre, email, edad, barrio).
              </li>
              <li className="flex gap-2">
                <span style={{ color: '#EEFA7A' }}>•</span>
                Se eliminan tus pasos registrados y tu historial de actividad.
              </li>
              <li className="flex gap-2">
                <span style={{ color: '#EEFA7A' }}>•</span>
                Perdés todos los Pasitos acumulados y cupones activos.
              </li>
              <li className="flex gap-2">
                <span style={{ color: '#EEFA7A' }}>•</span>
                Esta acción es irreversible.
              </li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="relative border-t border-white/10 py-10 mt-16">
        <div className="max-w-4xl mx-auto px-5 text-center sm:px-6">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © {new Date().getFullYear()} Pasito. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
