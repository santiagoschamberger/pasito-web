#!/usr/bin/env python3
"""
Generate Terminos_y_Condiciones_Pasito.pdf from text content
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY, TA_CENTER
from reportlab.lib.units import inch

def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 9)
    page_text = f"-- {canvas.getPageNumber()} of {doc.page} --"
    canvas.drawCentredString(A4[0]/2, 30, page_text)
    canvas.restoreState()

def create_terminos_pdf():
    output_file = "public/Terminos_y_Condiciones_Pasito.pdf"
    
    # Read the updated content
    with open("content/terminos-y-condiciones.txt", "r", encoding="utf-8") as f:
        full_content = f.read()
    
    doc = SimpleDocTemplate(
        output_file,
        pagesize=A4,
        leftMargin=72,
        rightMargin=72,
        topMargin=60,
        bottomMargin=60,
        title="Términos y Condiciones de Uso",
        author="pasito"
    )
    
    styles = getSampleStyleSheet()
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=9,
        textColor='black',
        alignment=TA_LEFT,
        fontName='Helvetica',
        leading=11
    )
    
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=14,
        fontName='Helvetica-Bold',
        spaceAfter=12,
        spaceBefore=6,
        alignment=TA_LEFT
    )
    
    heading_style = ParagraphStyle(
        'Heading',
        parent=styles['Heading2'],
        fontSize=10,
        fontName='Helvetica-Bold',
        spaceAfter=6,
        spaceBefore=10,
        alignment=TA_LEFT
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['BodyText'],
        fontSize=9,
        fontName='Helvetica',
        alignment=TA_JUSTIFY,
        spaceAfter=4,
        leading=11
    )
    
    story = []
    
    # Header
    story.append(Paragraph("<b>pasito</b>&nbsp;&nbsp;&nbsp;&nbsp;Términos y Condiciones de Uso", header_style))
    story.append(Paragraph("Versión 1.0 · Vigente desde el 15 de marzo de 2026", header_style))
    story.append(Paragraph("Responsable: Santiago Schamberger", header_style))
    story.append(Paragraph("Contacto: contacto@pasito.app", header_style))
    story.append(Spacer(1, 12))
    
    # Parse content - split by lines
    lines = full_content.split('\n')
    
    for line in lines:
        line = line.strip()
        
        if not line:
            story.append(Spacer(1, 3))
            continue
        
        # Main title
        if line == "TÉRMINOS Y CONDICIONES DE USO":
            continue  # Skip, already in header
        
        # Section headings
        if line.startswith('(') and ')' in line[:5]:
            story.append(Paragraph(line, heading_style))
        elif line.startswith('(xx)'):
            story.append(Paragraph(line, heading_style))
        # Subsection headings
        elif any(line.startswith(prefix) for prefix in ['vi.1.', 'vi.2.', 'vi.3.', '4.1', '4.2', '4.3', '4.4', '5.1', '5.2', '5.3', '5.4', '5.5']):
            story.append(Paragraph(line, heading_style))
        else:
            # Body text - escape special HTML chars
            escaped = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(escaped, body_style))
    
    # Build with page numbers
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"✓ Generated {output_file}")

if __name__ == "__main__":
    create_terminos_pdf()
