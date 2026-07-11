'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Mail, MessageSquare, User, Send } from 'lucide-react'
import { useState } from 'react'

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Error al enviar el mensaje')
      }

      setStatus('success')
      setFormData({ name: '', email: '', message: '' })
    } catch (error) {
      setStatus('error')
      setErrorMessage('Hubo un error al enviar tu mensaje. Por favor, intentá nuevamente.')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

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
            <Mail size={28} style={{ color: '#EEFA7A' }} />
          </div>
          <h1
            className="text-4xl md:text-5xl mb-4 font-display"
            style={{ color: '#EEFA7A' }}
          >
            Contacto
          </h1>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.7)' }}>
            ¿Tenés alguna pregunta o sugerencia? Escribinos y te responderemos a la brevedad.
          </p>
        </div>

        {status === 'success' ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'rgba(238,250,122,0.1)', border: '2px solid rgba(238,250,122,0.3)' }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#EEFA7A' }}
            >
              <Send size={28} style={{ color: '#0C6B45' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#EEFA7A' }}>
              ¡Mensaje enviado!
            </h2>
            <p className="mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Gracias por contactarnos. Te responderemos pronto a tu email.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="px-6 py-2 rounded-lg font-semibold transition-all hover:scale-105"
              style={{ background: '#EEFA7A', color: '#0C6B45' }}
            >
              Enviar otro mensaje
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              className="rounded-2xl p-8 space-y-6"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {/* Name field */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold mb-2 text-white">
                  Nombre
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    placeholder="Tu nombre"
                  />
                </div>
              </div>

              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold mb-2 text-white">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              {/* Message field */}
              <div>
                <label htmlFor="message" className="block text-sm font-semibold mb-2 text-white">
                  Mensaje
                </label>
                <div className="relative">
                  <MessageSquare
                    size={18}
                    className="absolute left-4 top-4"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  />
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full pl-12 pr-4 py-3 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-all resize-none"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    placeholder="Contanos qué tenés en mente..."
                  />
                </div>
              </div>

              {status === 'error' && (
                <div
                  className="p-4 rounded-lg text-sm"
                  style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)', color: '#ffcccc' }}
                >
                  {errorMessage}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3.5 rounded-lg font-bold text-base transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                style={{ background: '#EEFA7A', color: '#0C6B45' }}
              >
                {status === 'loading' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Enviar mensaje
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Alternative contact info */}
        <div className="mt-12 text-center">
          <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
            También podés escribirnos directamente a:
          </p>
          <a
            href="mailto:contacto@pasito.app"
            className="inline-flex items-center gap-2 text-lg font-semibold hover:opacity-80 transition-opacity"
            style={{ color: '#EEFA7A' }}
          >
            <Mail size={20} />
            contacto@pasito.app
          </a>
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
