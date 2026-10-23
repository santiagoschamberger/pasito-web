import { contactNotificationEmail } from '@/lib/web-email-templates'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, message } = body

    // Validate input
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos.' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido.' },
        { status: 400 }
      )
    }

    // For now, we'll use Resend API to send emails
    // You can also use nodemailer, SendGrid, or any other email service
    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      // Fallback: log to console for development
      console.log('Contact form submission:', { name, email, message })
      return NextResponse.json({ ok: true })
    }

    // Send email using Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Pasito Contacto <contacto@pasito.app>',
        to: ['contacto@pasito.app'],
        reply_to: email,
        ...contactNotificationEmail(name, email, message),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', error)
      return NextResponse.json(
        { error: 'No se pudo enviar el mensaje. Intentá de nuevo.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Error al procesar el pedido.' },
      { status: 500 }
    )
  }
}
