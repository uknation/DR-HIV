from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

# Doctor
class DoctorLogin(BaseModel):
    email: EmailStr
    password: str

class DoctorUpdate(BaseModel):
    full_name: Optional[str] = None
    reg_number: Optional[str] = None
    specialization: Optional[str] = None
    hospital_name: Optional[str] = None
    department: Optional[str] = None
    experience_years: Optional[int] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    tfa_enabled: Optional[bool] = None
    theme_pref: Optional[str] = None
    language_pref: Optional[str] = None

class DoctorResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    reg_number: Optional[str] = "MCI-2026-HIV-8849"
    specialization: Optional[str] = "HIV Clinical Specialist & Infectious Diseases"
    hospital_name: Optional[str] = "Regional ART Center & Infectious Disease Unit"
    department: Optional[str] = "Department of HIV/AIDS Medicine & Advisory"
    experience_years: Optional[int] = 12
    phone: Optional[str] = "+1 (555) 234-5678"
    location: Optional[str] = "Metropolitan Medical Complex, Suite 402"
    bio: Optional[str] = "Senior Infectious Disease Clinician specializing in genotypic drug resistance interpretation, epistatic mutation profiling, and multi-class salvage ART regimen design."
    tfa_enabled: Optional[bool] = True
    theme_pref: Optional[str] = "light"
    language_pref: Optional[str] = "English (US)"

    class Config:
        from_attributes = True

# Genotype
class GenotypeBase(BaseModel):
    raw_sequence: Optional[str] = None
    mutation_list: str # Semicolon separated, e.g. "M184V;K103N"

class GenotypeCreate(GenotypeBase):
    pass

class GenotypeResponse(GenotypeBase):
    case_id: int

    class Config:
        from_attributes = True

# Case
class CaseCreate(BaseModel):
    patient_ref: str
    cd4_count: Optional[int] = None
    viral_load: Optional[str] = "Unknown" # "Low", "Moderate", "High", "Unknown"
    treatment_history: Optional[str] = "Treatment_Naive" # "Treatment_Naive", "Previously_Treated"
    adherence: Optional[str] = "Unknown" # "Good", "Moderate", "Poor", "Unknown"
    comorbidity: Optional[str] = "None" # "Present", "None"
    age: Optional[int] = 30
    weight: Optional[int] = 60
    serum_creatinine: Optional[float] = 1.0
    is_pregnant: Optional[bool] = False

class CaseResponse(CaseCreate):
    id: int
    doctor_id: int
    created_at: datetime
    genotype: Optional[GenotypeResponse] = None

    class Config:
        from_attributes = True

# Validation
class GenotypeValidateRequest(BaseModel):
    raw_sequence: str

class GenotypeValidateResponse(BaseModel):
    is_valid: bool
    detected_mutations: List[str]
    unrecognized_symbols: List[str]
    message: str

# FASTA Parsing
class FastaParseRequest(BaseModel):
    fasta_text: str

class FastaParseResponse(BaseModel):
    success: bool
    header: Optional[str] = ""
    sequence_type: Optional[str] = ""
    raw_length: Optional[int] = 0
    protein_length: Optional[int] = 0
    detected_genes: List[str] = []
    detected_mutations: List[str] = []
    alignment_summary: Optional[Dict[str, Any]] = {}
    message: str

# Analysis & Prediction Request
class GenotypeAnalyzeRequest(BaseModel):
    case_id: int
    mutations: List[str]
    raw_sequence: Optional[str] = ""
    engine: Optional[str] = "catboost" # "catboost", "cnn", "esm", "ensemble"

# Review
class ClinicalReviewCreate(BaseModel):
    status: str # "Approved", "Returned"
    clinical_notes: Optional[str] = ""

class ClinicalReviewResponse(BaseModel):
    id: int
    analysis_id: int
    reviewer_id: int
    status: str
    clinical_notes: Optional[str]
    reviewed_at: datetime

    class Config:
        from_attributes = True

# Analysis Result
class AnalysisResponse(BaseModel):
    id: int
    case_id: int
    prediction_output_json: str
    scores_json: str
    review_status: str
    low_confidence_flag: bool
    audit_timeline_json: Optional[str]
    created_at: datetime
    review: Optional[ClinicalReviewResponse] = None

    class Config:
        from_attributes = True

# Audit Logs
class AuditLogResponse(BaseModel):
    id: int
    action: str
    user_id: Optional[int]
    timestamp: datetime
    details: Optional[str]

    class Config:
        from_attributes = True

# Model Information
class ModelInfoResponse(BaseModel):
    model_version: str
    training_date: str
    samples_total: int
    features: List[str]
    models_summary: Dict[str, Any]

class BenchmarkComparisonItem(BaseModel):
    drug: str
    class_name: str
    catboost_acc: Optional[float] = None
    catboost_f1: Optional[float] = None
    cnn_acc: Optional[float] = None
    cnn_f1: Optional[float] = None
    esm_acc: Optional[float] = None
    esm_f1: Optional[float] = None

class ModelBenchmarkResponse(BaseModel):
    engine_comparison: List[Dict[str, Any]]
    overall_summary: Dict[str, Any]

# PatientTestId Generation & De-identification Lookup
class GeneratedIdResponse(BaseModel):
    patient_test_id: str
    format: str = "HIV-{YEAR}-{CODE}"
    timestamp: str
    privacy_guarantee: str = "De-identified clinical biomarker record. Zero PII stored in accordance with NACO, HIPAA and DPDP Act 2023."

class PatientLookupResponse(BaseModel):
    found: bool
    patient_test_id: str
    case: Optional[CaseResponse] = None
    total_previous_tests: int = 0
    latest_analysis: Optional[AnalysisResponse] = None
    message: str = ""

