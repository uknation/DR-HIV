from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
import datetime
from database import Base

def get_utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class Doctor(Base):
    __tablename__ = "doctors"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    reg_number = Column(String, default="MCI-2026-HIV-8849")
    specialization = Column(String, default="HIV Clinical Specialist & Infectious Diseases")
    hospital_name = Column(String, default="Regional ART Center & Infectious Disease Unit")
    department = Column(String, default="Department of HIV/AIDS Medicine & Advisory")
    experience_years = Column(Integer, default=12)
    phone = Column(String, default="+1 (555) 234-5678")
    location = Column(String, default="Metropolitan Medical Complex, Suite 402")
    bio = Column(Text, default="Senior Infectious Disease Clinician specializing in genotypic drug resistance interpretation, epistatic mutation profiling, and multi-class salvage ART regimen design.")
    tfa_enabled = Column(Boolean, default=True)
    theme_pref = Column(String, default="light")
    language_pref = Column(String, default="English (US)")
    
    cases = relationship("Case", back_populates="doctor")
    reviews = relationship("ClinicalReview", back_populates="reviewer")

class Case(Base):
    __tablename__ = "cases"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_ref = Column(String, unique=True, index=True, nullable=False)
    cd4_count = Column(Integer, nullable=True)
    viral_load = Column(String, nullable=True) # "Low", "Moderate", "High", "Unknown"
    treatment_history = Column(String, default="Treatment_Naive") # "Treatment_Naive", "Previously_Treated"
    adherence = Column(String, nullable=True) # "Good", "Moderate", "Poor", "Unknown"
    comorbidity = Column(String, default="None") # "Present", "None"
    age = Column(Integer, default=30)
    weight = Column(Integer, default=60)
    serum_creatinine = Column(Float, default=1.0)
    is_pregnant = Column(Boolean, default=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    created_at = Column(DateTime, default=get_utc_now)
    
    doctor = relationship("Doctor", back_populates="cases")
    genotype = relationship("Genotype", back_populates="case", uselist=False, cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="case", cascade="all, delete-orphan")

class Genotype(Base):
    __tablename__ = "genotypes"
    
    case_id = Column(Integer, ForeignKey("cases.id"), primary_key=True, index=True)
    raw_sequence = Column(Text, nullable=True)
    mutation_list = Column(Text, nullable=False) # Semicolon separated, e.g. "M184V;K103N"
    
    case = relationship("Case", back_populates="genotype")

class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    prediction_output_json = Column(Text, nullable=False) # Serialized drug predictions
    scores_json = Column(Text, nullable=False) # Serialized ranked regimens
    review_status = Column(String, default="Pending") # "Pending", "Approved", "Returned"
    low_confidence_flag = Column(Boolean, default=False)
    audit_timeline_json = Column(Text, nullable=True) # Audit steps taken
    created_at = Column(DateTime, default=get_utc_now)
    
    case = relationship("Case", back_populates="analyses")
    review = relationship("ClinicalReview", back_populates="analysis", uselist=False, cascade="all, delete-orphan")

class ClinicalReview(Base):
    __tablename__ = "clinical_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    status = Column(String, nullable=False) # "Approved", "Returned"
    clinical_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=get_utc_now)
    
    analysis = relationship("Analysis", back_populates="review")
    reviewer = relationship("Doctor", back_populates="reviews")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False) # e.g. "LOGIN", "CREATE_CASE", "GENOTYPE_ANALYZE", "REVIEW"
    user_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=get_utc_now)
    details = Column(Text, nullable=True)

class ModelVersion(Base):
    __tablename__ = "model_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, nullable=False)
    status = Column(String, default="Prototype") # "Prototype", "Production"
    evaluation_metrics_json = Column(Text, nullable=False)
    training_date = Column(DateTime, default=get_utc_now)
