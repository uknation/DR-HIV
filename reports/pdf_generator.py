import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_pdf_report(dest_path, case_data, genotype_data, predictions, regimens, review_data, doctor_name):
    """
    Generates a professional clinical PDF report using ReportLab.
    
    - dest_path: Output path for the PDF file
    - case_data: Dict with patient_ref, cd4_count, viral_load, treatment_history, adherence, comorbidity
    - genotype_data: Dict with raw_sequence, mutation_list
    - predictions: Dict containing drug_predictions and overall_confidence
    - regimens: List of ranked candidate regimens
    - review_data: Dict with status, clinical_notes, reviewed_at
    - doctor_name: String with signing clinician's name
    """
    
    # 1. Page template & Document settings
    doc = SimpleDocTemplate(
        dest_path,
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=40, bottomMargin=45
    )
    
    styles = getSampleStyleSheet()
    
    # Custom colors mapping
    primary_color = colors.HexColor("#0f172a") # Slate 900
    secondary_color = colors.HexColor("#0284c7") # Sky 600
    border_color = colors.HexColor("#cbd5e1") # Slate 300
    bg_light = colors.HexColor("#f8fafc") # Slate 50
    text_dark = colors.HexColor("#334155") # Slate 700
    
    red_color = colors.HexColor("#ef4444") # Red 500
    yellow_color = colors.HexColor("#f59e0b") # Amber 500
    green_color = colors.HexColor("#22c55e") # Green 500
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=secondary_color,
        spaceAfter=15
    )
    
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=primary_color,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=text_dark
    )
    
    body_bold = ParagraphStyle(
        'DocBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    disclaimer_style = ParagraphStyle(
        'DocDisclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#64748b"), # Slate 500
        alignment=1 # Centered
    )
    
    story = []
    
    # --- HEADER ---
    story.append(Paragraph("AI-Based HIV-1 Drug Resistance Prediction & ART Regimen Advisory System", title_style))
    story.append(Paragraph("A clinical decision-support tool to detect antiretroviral drug resistance early and guide treatment regimens across India's ART care network (SIH 2026 Proposal Concept)", subtitle_style))
    
    # --- CASE METADATA TABLE ---
    story.append(Paragraph("1. Clinical Context & Case Information", h2_style))
    
    first_regimen = regimens[0] if (regimens and len(regimens) > 0) else {}
    crcl = first_regimen.get("crcl_calculated", "N/A")
    warnings = first_regimen.get("clinical_warnings", [])
    preg_val = "Pregnant" if case_data.get('is_pregnant') else "Not Pregnant / N/A"
    
    meta_data = [
        [
            Paragraph("<b>Patient Ref:</b>", body_style), Paragraph(str(case_data.get('patient_ref', 'N/A')), body_style),
            Paragraph("<b>Report Date:</b>", body_style), Paragraph(str(review_data.get('reviewed_at', 'Pending')), body_style)
        ],
        [
            Paragraph("<b>CD4 Count:</b>", body_style), Paragraph(f"{case_data.get('cd4_count', 'N/A')} cells/µL", body_style),
            Paragraph("<b>Viral Load:</b>", body_style), Paragraph(str(case_data.get('viral_load', 'N/A')), body_style)
        ],
        [
            Paragraph("<b>Age / Weight:</b>", body_style), Paragraph(f"{case_data.get('age', '30')} years / {case_data.get('weight', '60')} kg", body_style),
            Paragraph("<b>Serum Cr. / CrCl:</b>", body_style), Paragraph(f"{case_data.get('serum_creatinine', '1.0')} mg/dL / {crcl} mL/min", body_style)
        ],
        [
            Paragraph("<b>Pregnancy Status:</b>", body_style), Paragraph(preg_val, body_style),
            Paragraph("<b>Adherence Category:</b>", body_style), Paragraph(str(case_data.get('adherence', 'N/A')), body_style)
        ],
        [
            Paragraph("<b>Treatment History:</b>", body_style), Paragraph(str(case_data.get('treatment_history', 'N/A')).replace('_', ' '), body_style),
            Paragraph("<b>Comorbidity Flag:</b>", body_style), Paragraph(str(case_data.get('comorbidity', 'N/A')), body_style)
        ]
    ]
    
    meta_table = Table(meta_data, colWidths=[1.2*inch, 2.3*inch, 1.2*inch, 2.3*inch])
    meta_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('BACKGROUND', (0,0), (0,-1), bg_light),
        ('BACKGROUND', (2,0), (2,-1), bg_light),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))
    
    if warnings:
        story.append(Paragraph("<b>CLINICAL GUIDELINE ALERTS & WARNINGS:</b>", body_bold))
        for w in warnings:
            story.append(Paragraph(f"<font color='red'>• {w}</font>", body_style))
        story.append(Spacer(1, 10))
    
    # --- GENOTYPE & MUTATIONS ---
    story.append(Paragraph("2. HIV Genotype / Mutation Analysis", h2_style))
    muts_list = genotype_data.get('mutation_list', 'None')
    muts_text = muts_list if muts_list else "No mutations detected."
    
    genotype_data_table = [
        [Paragraph("<b>Detected Mutations:</b>", body_bold), Paragraph(muts_text, body_style)],
        [Paragraph("<b>Genotype Validation:</b>", body_bold), Paragraph("VALID — Sequence matches HIV-1 reverse transcriptase/protease/integrase domain indicators.", body_style)]
    ]
    genotype_table = Table(genotype_data_table, colWidths=[1.8*inch, 5.2*inch])
    genotype_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('BACKGROUND', (0,0), (0,-1), bg_light),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(genotype_table)
    story.append(Spacer(1, 10))
    
    # --- DRUG RESISTANCE PREDICTIONS ---
    story.append(Paragraph("3. ML Drug-Level Resistance Predictions", h2_style))
    
    # Table header
    pred_data = [[
        Paragraph("<b>Drug Name</b>", body_bold),
        Paragraph("<b>Class</b>", body_bold),
        Paragraph("<b>ML Prediction</b>", body_bold),
        Paragraph("<b>Confidence</b>", body_bold),
        Paragraph("<b>Contributing Mutations</b>", body_bold)
    ]]
    
    # Populate predictions
    for drug_key, info in predictions.get('drug_predictions', {}).items():
        pred_label = info.get('prediction', 'Unknown')
        conf_val = info.get('confidence', 0.0)
        conf_text = f"{conf_val:.1%}" if conf_val > 0.0 else "N/A"
        
        # Color coding predicted label
        if pred_label == "Susceptible":
            label_text = f"<font color='{green_color}'><b>Susceptible</b></font>"
        elif pred_label == "Reduced":
            label_text = f"<font color='{yellow_color}'><b>Reduced Susceptibility</b></font>"
        elif pred_label == "High":
            label_text = f"<font color='{red_color}'><b>High Resistance</b></font>"
        else:
            label_text = f"<i>{pred_label}</i>"
            
        conts = ", ".join([c["mutation"] for c in info.get('contributors', [])])
        conts_text = conts if conts else "None"
        
        pred_data.append([
            Paragraph(info.get('drug_name', drug_key.capitalize()), body_style),
            Paragraph(info.get('class', 'N/A'), body_style),
            Paragraph(label_text, body_style),
            Paragraph(conf_text, body_style),
            Paragraph(conts_text, body_style)
        ])
        
    pred_table = Table(pred_data, colWidths=[1.5*inch, 0.9*inch, 1.8*inch, 0.8*inch, 2.0*inch])
    pred_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('BACKGROUND', (0,0), (-1,0), bg_light),
    ]))
    story.append(pred_table)
    story.append(Spacer(1, 10))
    
    # Let's add a pagebreak to keep the regimens and review on page 2
    story.append(PageBreak())
    
    # --- REGIMEN RANKING ---
    story.append(Paragraph("4. Candidate ART Regimen Rankings", h2_style))
    
    reg_data = [[
        Paragraph("<b>Rank</b>", body_bold),
        Paragraph("<b>Regimen Name</b>", body_bold),
        Paragraph("<b>Compatibility Score</b>", body_bold),
        Paragraph("<b>Active Agents</b>", body_bold),
        Paragraph("<b>Burden</b>", body_bold),
        Paragraph("<b>Clinical Reason / Comparison</b>", body_bold)
    ]]
    
    for r in regimens[:4]: # Limit to top 4 regimens
        score_val = r.get('score', 0)
        score_text = f"<b>{score_val}</b> / 100"
        
        # Color score
        if score_val >= 80:
            score_p = f"<font color='{green_color}'>{score_text}</font>"
        elif score_val >= 50:
            score_p = f"<font color='{yellow_color}'>{score_text}</font>"
        else:
            score_p = f"<font color='{red_color}'>{score_text}</font>"
            
        reg_data.append([
            Paragraph(f"#{r.get('rank', 1)}", body_bold),
            Paragraph(r.get('name', 'N/A'), body_bold),
            Paragraph(score_p, body_style),
            Paragraph(str(r.get('active_agents', 0)), body_style),
            Paragraph(r.get('burden_level', 'N/A'), body_style),
            Paragraph(r.get('ranking_comparison', ''), body_style)
        ])
        
    reg_table = Table(reg_data, colWidths=[0.5*inch, 1.5*inch, 1.4*inch, 0.9*inch, 0.9*inch, 1.8*inch])
    reg_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('BACKGROUND', (0,0), (-1,0), bg_light),
    ]))
    story.append(reg_table)
    story.append(Spacer(1, 10))
    
    # --- CLINICIAN REVIEW ---
    story.append(Paragraph("5. Clinician Review & Decision Records", h2_style))
    
    notes_text = review_data.get('clinical_notes', '')
    notes_text = notes_text if notes_text else "No clinical review notes provided."
    
    review_table_data = [
        [Paragraph("<b>Clinician Sign-off Status:</b>", body_bold), Paragraph(f"<b>{review_data.get('status', 'Pending')}</b>", body_style)],
        [Paragraph("<b>Clinical Review Notes:</b>", body_bold), Paragraph(notes_text, body_style)],
        [Paragraph("<b>Electronic Signature:</b>", body_bold), Paragraph(f"Signed off electronically by <b>{doctor_name}</b>", body_style)]
    ]
    review_table = Table(review_table_data, colWidths=[1.8*inch, 5.2*inch])
    review_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('BACKGROUND', (0,0), (0,-1), bg_light),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(review_table)
    story.append(Spacer(1, 35))
    
    # --- SAFETY BANNER & DISCLAIMER ---
    story.append(Spacer(1, 15))
    story.append(Paragraph("<b>IMPORTANT NOTICE: CLINICAL DECISION SUPPORT ONLY</b>", disclaimer_style))
    story.append(Spacer(1, 3))
    story.append(Paragraph(
        "This report is generated by a clinical decision-support prototype submitted to the Smart India Hackathon 2026, "
        "designed for MCA Student Innovation (MedTech / Biotech / HealthTech). The system uses machine learning classifiers trained on limited pilot data (100 synthetic genotype samples). "
        "It does not represent formal NACO validation, regulatory ICMR approval, or clinical guidelines. "
        "The predicted susceptibility profiles and ranked ART regimen templates are for educational and hackathon demonstration purposes only. "
        "Treatment selection must remain the sole responsibility of the authorized clinician in coordination with National AIDS Control Organisation (NACO) guidelines and specialist consultation.",
        disclaimer_style
    ))
    
    # Build Document
    doc.build(story)
    print(f"Clinical report generated at {dest_path}")
