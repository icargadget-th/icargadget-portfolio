import os
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

EXPORTS_DIR = Path("data/exports")
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

def generate_project_pdf(project: dict) -> Path:
    """
    Generates a PDF report for a project and saves it to data/exports/project_[id].pdf.
    Returns the Path to the generated PDF.
    """
    pdf_path = EXPORTS_DIR / f"project_{project['id']}.pdf"
    
    # Page setup - letter size, 0.75 inch margins
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    story = []
    
    # Custom styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#002B49') # Deep Navy
    )
    
    h1_style = ParagraphStyle(
        'Heading1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#002B49'),
        spaceBefore=15,
        spaceAfter=8,
        keepWithNext=True
    )
    
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#333333')
    )
    
    value_style = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#555555')
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#333333')
    )
    
    table_text_style = ParagraphStyle(
        'TableText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    # 1. Header (Title and Status)
    title_text = f"{project['vehicle_year']} {project['vehicle_make']} {project['vehicle_model']}"
    story.append(Paragraph(title_text, title_style))
    story.append(Spacer(1, 10))
    
    # Subheader with client name and status
    status_color = "#28a745" if project['status'] == "Completed" else "#ffc107"
    meta_text = (
        f"<b>Client:</b> {project['client_name']} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>Status:</b> <font color='{status_color}'><b>{project['status']}</b></font>"
    )
    story.append(Paragraph(meta_text, body_style))
    
    # Horizontal rule
    story.append(Spacer(1, 8))
    divider = Table([[""]], colWidths=[504], rowHeights=[2])
    divider.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#00e1ff')), # Accent highlight line
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(divider)
    story.append(Spacer(1, 15))
    
    # 2. Specs & Client Details side-by-side table
    spec_data = [
        [Paragraph("Vehicle Details", h1_style), Paragraph("Client Contacts", h1_style)],
        [
            Table([
                [Paragraph("Make:", label_style), Paragraph(project['vehicle_make'], value_style)],
                [Paragraph("Model:", label_style), Paragraph(project['vehicle_model'], value_style)],
                [Paragraph("Year:", label_style), Paragraph(str(project['vehicle_year']), value_style)]
            ], colWidths=[60, 180]),
            Table([
                [Paragraph("Name:", label_style), Paragraph(project['client_name'], value_style)],
                [Paragraph("Contact:", label_style), Paragraph(project.get('client_contact') or "N/A", value_style)]
            ], colWidths=[60, 180])
        ]
    ]
    
    spec_table = Table(spec_data, colWidths=[252, 252])
    spec_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(spec_table)
    story.append(Spacer(1, 15))
    
    # 3. Description
    if project.get('description'):
        story.append(Paragraph("Description & Project Scope", h1_style))
        story.append(Paragraph(project['description'].replace("\n", "<br/>"), body_style))
        story.append(Spacer(1, 15))
        
    # 4. Components Table
    if project.get('components'):
        story.append(Paragraph("Installed Components", h1_style))
        
        comp_rows = [[
            Paragraph("Category", table_header_style),
            Paragraph("Brand", table_header_style),
            Paragraph("Model", table_header_style),
            Paragraph("Qty", table_header_style),
            Paragraph("Notes / Config", table_header_style)
        ]]
        
        for c in project['components']:
            comp_rows.append([
                Paragraph(c['category'], table_text_style),
                Paragraph(c['brand'], table_text_style),
                Paragraph(c['model'], table_text_style),
                Paragraph(str(c['quantity']), table_text_style),
                Paragraph(c.get('notes') or "", table_text_style)
            ])
            
        comp_table = Table(comp_rows, colWidths=[90, 90, 110, 40, 174])
        comp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#002B49')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(comp_table)
        story.append(Spacer(1, 15))
        
    # 5. Media Gallery (Key Photos)
    if project.get('media'):
        photos = [m for m in project['media'] if m['file_type'] == 'image']
        if photos:
            gallery_elements = []
            gallery_elements.append(Paragraph("Installation Media", h1_style))
            
            # Format photos as a grid (two columns)
            photo_rows = []
            current_row = []
            
            for index, photo in enumerate(photos[:4]): # Limit to first 4 photos for neatness
                file_path = photo['file_path']
                if os.path.exists(file_path):
                    try:
                        # Create an Image flowable
                        # Draw scaled down. Target max width = 230px, max height = 160px
                        img_flow = Image(file_path, width=230, height=160)
                        img_flow.hAlign = 'CENTER'
                        
                        caption_text = photo.get('caption') or f"Photo {index+1}"
                        caption_flow = Paragraph(caption_text, ParagraphStyle(
                            'ImgCaption', parent=styles['Normal'], fontName='Helvetica-Oblique',
                            fontSize=8, leading=10, textColor=colors.HexColor('#666666'),
                            alignment=1, spaceBefore=4
                        ))
                        
                        cell_content = [img_flow, caption_flow]
                    except Exception as e:
                        cell_content = [Paragraph(f"[Image Error: {e}]", value_style)]
                else:
                    cell_content = [Paragraph(f"[Image Not Found: {file_path}]", value_style)]
                    
                current_row.append(cell_content)
                
                # If we have 2 images in this row or it's the last image
                if len(current_row) == 2:
                    photo_rows.append(current_row)
                    current_row = []
            
            if current_row:
                current_row.append([""]) # Fill empty cell
                photo_rows.append(current_row)
                
            if photo_rows:
                photo_table = Table(photo_rows, colWidths=[252, 252])
                photo_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ]))
                gallery_elements.append(photo_table)
                
            story.append(KeepTogether(gallery_elements))
            
    # Build Document
    doc.build(story)
    return pdf_path
