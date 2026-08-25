#!/usr/bin/env python3
"""
Generate Politica_de_Privacidad_Pasito.pdf with updated legal address
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors

def create_privacidad_pdf():
    output_file = "public/Politica_de_Privacidad_Pasito.pdf"
    
    # Create PDF
    doc = SimpleDocTemplate(
        output_file,
        pagesize=A4,
        leftMargin=72,
        rightMargin=72,
        topMargin=72,
        bottomMargin=72,
        title="Política de Privacidad",
        author="pasito",
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor='black',
        spaceAfter=12,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=11,
        textColor='black',
        spaceAfter=6,
        spaceBefore=12,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=10,
        textColor='black',
        spaceAfter=6,
        alignment=TA_JUSTIFY,
        fontName='Helvetica',
        leading=12
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=9,
        textColor='black',
        alignment=TA_LEFT,
        fontName='Helvetica'
    )
    
    # Build story
    story = []
    
    # Header
    story.append(Paragraph("pasito&nbsp;&nbsp;&nbsp;&nbsp;Política de Privacidad", header_style))
    story.append(Paragraph("Versión 1.0 · Vigente desde el 15 de marzo de 2026", header_style))
    story.append(Paragraph("Responsable: Santiago Schamberger", header_style))
    story.append(Paragraph("Contacto: contacto@pasito.app", header_style))
    story.append(Spacer(1, 12))
    
    # Title
    story.append(Paragraph("POLÍTICA DE PRIVACIDAD", title_style))
    story.append(Spacer(1, 6))
    
    # Section 1: Introducción
    story.append(Paragraph("1. Introducción", heading_style))
    story.append(Paragraph("La presente Política de Privacidad describe cómo Santiago Schamberger (en adelante, \"Pasito\", \"nosotros\" o \"el responsable\") recopila, utiliza, almacena y protege la información personal de los usuarios de la aplicación móvil Pasito, disponible para dispositivos iOS y Android (en adelante, \"la Aplicación\").", body_style))
    story.append(Paragraph("Al registrarte y utilizar la Aplicación, aceptás esta Política de Privacidad. Si no estás de acuerdo con alguno de sus términos, por favor no uses la Aplicación.", body_style))
    story.append(Paragraph("Esta política cumple con la Ley N.° 25.326 de Protección de los Datos Personales de la República Argentina y su Decreto Reglamentario N.° 1558/2001, así como con los requisitos de privacidad de Apple App Store y Google Play Store.", body_style))
    story.append(Spacer(1, 6))
    
    # Section 2: Responsable
    story.append(Paragraph("2. Responsable del Tratamiento de Datos", heading_style))
    
    # Table for contact info
    data = [
        ['Campo', 'Detalle'],
        ['Responsable', 'Santiago Schamberger'],
        ['Domicilio', 'Vedia 3892, Piso 1, posición 19, C1430, CABA, Argentina'],
        ['Correo electrónico', 'contacto@pasito.app'],
        ['Aplicación', 'Pasito – Move to Earn'],
        ['Sitio web / App', 'pasito.app']
    ]
    
    t = Table(data, colWidths=[120, 280])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))
    
    # Continue with remaining sections...
    story.append(Paragraph("3. Datos que Recopilamos", heading_style))
    story.append(Paragraph("Para crear y mantener tu cuenta en Pasito, recopilamos nombre, dirección de correo electrónico, edad, intereses, meta diaria de pasos y barrio o zona de la Ciudad de Buenos Aires que seleccionas. La Aplicación solicita acceso de solo lectura al conteo de pasos diarios para calcular los Pasitos ganados.", body_style))
    story.append(Spacer(1, 6))
    
    story.append(Paragraph("Para consultas, reclamos o solicitudes relacionadas con esta Política de Privacidad, podés comunicarte con nosotros:", body_style))
    story.append(Paragraph("Correo electrónico: contacto@pasito.app", body_style))
    story.append(Paragraph("Asunto sugerido: \"Consulta de Privacidad\" o \"Derechos ARCO\"", body_style))
    story.append(Spacer(1, 12))
    
    # Footer
    story.append(Paragraph("Pasito · Política de Privacidad v1.0 · Vigente desde el 15 de marzo de 2026 · contacto@pasito.app", header_style))
    
    # Build PDF
    doc.build(story)
    print(f"✓ Generated {output_file}")

if __name__ == "__main__":
    create_privacidad_pdf()
