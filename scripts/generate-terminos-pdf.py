#!/usr/bin/env python3
"""
Generate Terminos_y_Condiciones_Pasito.pdf from text content
with updated legal address
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY

def create_terminos_pdf():
    output_file = "public/Terminos_y_Condiciones_Pasito.pdf"
    
    # Read the updated content
    with open("content/terminos-y-condiciones.txt", "r", encoding="utf-8") as f:
        content = f.read()
    
    # Create PDF
    doc = SimpleDocTemplate(
        output_file,
        pagesize=A4,
        leftMargin=72,
        rightMargin=72,
        topMargin=72,
        bottomMargin=72,
        title="Términos y Condiciones de Uso",
        author="pasito",
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles
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
    story.append(Paragraph("pasito&nbsp;&nbsp;&nbsp;&nbsp;Términos y Condiciones de Uso", header_style))
    story.append(Paragraph("Versión 1.0 · Vigente desde el 15 de marzo de 2026", header_style))
    story.append(Paragraph("Responsable: Santiago Schamberger", header_style))
    story.append(Paragraph("Contacto: contacto@pasito.app", header_style))
    story.append(Spacer(1, 12))
    
    # Parse content
    lines = content.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            story.append(Spacer(1, 6))
            continue
        
        # Main title
        if line.startswith('TÉRMINOS Y CONDICIONES'):
            story.append(Paragraph(line, title_style))
        # Section headings (starting with (i), (ii), etc or numbered)
        elif line.startswith('(') and ')' in line[:10]:
            story.append(Paragraph(line, heading_style))
        elif line[0:3].replace('.', '').replace('-', '').isdigit():
            story.append(Paragraph(line, heading_style))
        else:
            # Body text
            story.append(Paragraph(line, body_style))
    
    # Build PDF
    doc.build(story)
    print(f"✓ Generated {output_file}")

if __name__ == "__main__":
    create_terminos_pdf()
