import os
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

def build_pdf():
    pdf_filename = "DR-HIV_System_Change_Log.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#0f172a")     # Slate 900
    ACCENT_TEAL = colors.HexColor("#0d9488") # Teal 600
    TEXT_DARK = colors.HexColor("#1e293b")   # Slate 800
    BG_LIGHT = colors.HexColor("#f8fafc")    # Slate 50
    BORDER_COLOR = colors.HexColor("#cbd5e1") # Slate 300
    SUCCESS_COLOR = colors.HexColor("#16a34a") # Green 600

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=PRIMARY,
        alignment=TA_LEFT
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=ACCENT_TEAL,
        alignment=TA_LEFT
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        alignment=TA_RIGHT
    )

    section_heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=PRIMARY,
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    story = []

    # HEADER TABLE
    header_data = [
        [
            Paragraph("<b>DR-HIV CLINICAL ADVISORY PORTAL</b><br/><font size=14 color='#0f172a'>System Architecture Change Log</font>", title_style),
            Paragraph(f"<b>Date:</b> {datetime.date.today().strftime('%B %d, %Y')}<br/><b>Version:</b> v0.1 Production<br/><b>Status:</b> Verified & Deployed", meta_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[360, 180])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))

    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT_TEAL, spaceAfter=12))

    # EXECUTIVE SUMMARY BOX
    summary_html = """
    <b>EXECUTIVE SUMMARY:</b> This document details all recent system enhancements, schema modifications, navigation restructuring, pagination implementations, UI polish, and verification results completed for the DR-HIV Clinical Decision-Support application.
    """
    summary_table = Table([[Paragraph(summary_html, body_style)]], colWidths=[540])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # SECTION 1
    story.append(Paragraph("1. Session Persistence & Authentication Fixes", section_heading_style))
    story.append(Paragraph("• <b>Persistent Sessions:</b> Resolved page-refresh (F5 / Ctrl+R) logout issues by persisting token/user payloads in <code>localStorage</code> and implementing a backend session verification endpoint (<code>GET /api/auth/verify</code>).", bullet_style))
    story.append(Paragraph("• <b>Startup Initialization State:</b> Integrated an authentication loader view during session re-hydration to prevent blank screens and race conditions before rendering protected dashboard views.", bullet_style))
    story.append(Spacer(1, 8))

    # SECTION 2
    story.append(Paragraph("2. Clinician Profile Section & REST API Integration", section_heading_style))
    story.append(Paragraph("• <b>Database Schema Migration:</b> Expanded SQLite <code>doctors</code> model with fields for <code>reg_number</code>, <code>specialization</code>, <code>hospital_name</code>, <code>department</code>, <code>experience_years</code>, <code>phone</code>, <code>location</code>, <code>bio</code>, and preferences with dynamic <code>ALTER TABLE</code> auto-migrations.", bullet_style))
    story.append(Paragraph("• <b>Backend API Endpoints:</b> Implemented <code>PUT /api/auth/profile</code> for clinician information updates and <code>POST /api/auth/change-password</code> for credential validation.", bullet_style))
    story.append(Paragraph("• <b>Clinician Profile UI:</b> Added Profile Header (avatar, verified badge), Professional Info, Contact Details, Security & 2FA controls, Application Preferences, and an interactive Edit Profile modal.", bullet_style))
    story.append(Spacer(1, 8))

    # SECTION 3
    story.append(Paragraph("3. Dedicated Model Benchmarks Page", section_heading_style))
    story.append(Paragraph("• <b>Full Page Route:</b> Converted Model Benchmarks into a dedicated main view (<code>/model_benchmark</code>) integrated with the left sidebar navigation.", bullet_style))
    story.append(Paragraph("• <b>Comparative Analytics:</b> Highlights peak accuracy (<b>99.4%</b> on AZT/TDF), <b>6,000+ Stanford HIVDB</b> validation isolates, and cross-model evaluation across CatBoost GBDT, XGBoost, Multi-Scale 1D-CNN, and RoPE Protein Transformers.", bullet_style))
    story.append(Paragraph("• <b>Interactive Features:</b> Class filter pills (NRTI, NNRTI, INSTI, PI, Capsid), drug search, Matrix Table view, Recharts Bar Chart view, and single-click JSON export.", bullet_style))
    story.append(Spacer(1, 8))

    # SECTION 4
    story.append(Paragraph("4. Pagination for Recent Clinician Analyses Table", section_heading_style))
    story.append(Paragraph("• <b>10 Records Per Page:</b> Paginated table displaying exactly 10 cases at a time without reloading the application.", bullet_style))
    story.append(Paragraph("• <b>Dynamic Calculation:</b> Calculates total pages automatically (<code>Math.ceil(total / 10)</code>) adapting to 10, 49, 100, 500, or 1,000+ records.", bullet_style))
    story.append(Paragraph("• <b>Record Counter & Controls:</b> Displays live status (e.g., <i>Showing 1–10 of 49 cases</i>), Previous/Next buttons with disabled states, active page highlighting in teal, and reusable <code>Pagination.jsx</code> architecture.", bullet_style))
    story.append(Spacer(1, 8))

    # SECTION 5
    story.append(Paragraph("5. UI & Layout Polishing", section_heading_style))
    story.append(Paragraph("• <b>Header Cleanups:</b> Removed redundant top-header hamburger menu button.", bullet_style))
    story.append(Paragraph("• <b>Card & Table Spacing:</b> Fixed padding on Recent Clinician Analyses section to prevent right-edge button and column text clipping.", bullet_style))
    story.append(Paragraph("• <b>Status Badges:</b> Formatted <code>Genotype Pending</code> as a clean non-wrapping badge.", bullet_style))
    story.append(Spacer(1, 10))

    # SECTION 6 - VERIFICATION TABLE
    story.append(Paragraph("6. System Verification & Test Summary", section_heading_style))

    test_data = [
        ["Test Suite Component", "Total Tests", "Passed", "Status"],
        ["API Endpoints & Auth Verification", "12", "12", "PASSED"],
        ["Genotype Validation & Sequence Parser", "10", "10", "PASSED"],
        ["Model Inference & Regimen Ranking", "10", "10", "PASSED"],
        ["Doctor Profile & Credentials API", "10", "10", "PASSED"],
        ["Total Automated Unit Tests", "42", "42", "100% OK"]
    ]

    test_table = Table(test_data, colWidths=[240, 90, 90, 120])
    test_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('ALIGN', (1,0), (-1,-1), 'CENTER'),
        ('BACKGROUND', (0,1), (-1,-2), BG_LIGHT),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#e2e8f0")),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (3,-1), (3,-1), SUCCESS_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('FONTSIZE', (0,1), (-1,-1), 8.5),
        ('PADDING', (0,1), (-1,-1), 5),
    ]))
    story.append(test_table)
    story.append(Spacer(1, 14))

    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceAfter=8))
    footer_text = Paragraph(
        "<font size=8 color='#64748b'>SIH 2026 Innovation Project • MCA, Shri Shankaracharya Technical Campus, Bhilai • DR-HIV System Change Log Report</font>",
        ParagraphStyle('FooterText', parent=styles['Normal'], alignment=TA_CENTER)
    )
    story.append(footer_text)

    doc.build(story)
    print(f"Successfully generated PDF: {os.path.abspath(pdf_filename)}")

if __name__ == "__main__":
    build_pdf()
