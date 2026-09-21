from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DB_DIR = os.path.dirname(os.path.abspath(__file__))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'hiv_selector.db')}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def auto_migrate():
    Base.metadata.create_all(bind=engine)
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if "doctors" in inspector.get_table_names():
        existing_cols = [c["name"] for c in inspector.get_columns("doctors")]
        expected_columns = {
            "reg_number": "VARCHAR DEFAULT 'MCI-2026-HIV-8849'",
            "specialization": "VARCHAR DEFAULT 'HIV Clinical Specialist & Infectious Diseases'",
            "hospital_name": "VARCHAR DEFAULT 'Regional ART Center & Infectious Disease Unit'",
            "department": "VARCHAR DEFAULT 'Department of HIV/AIDS Medicine & Advisory'",
            "experience_years": "INTEGER DEFAULT 12",
            "phone": "VARCHAR DEFAULT '+1 (555) 234-5678'",
            "location": "VARCHAR DEFAULT 'Metropolitan Medical Complex, Suite 402'",
            "bio": "TEXT DEFAULT 'Senior Infectious Disease Clinician specializing in genotypic drug resistance interpretation, epistatic mutation profiling, and multi-class salvage ART regimen design.'",
            "tfa_enabled": "BOOLEAN DEFAULT 1",
            "theme_pref": "VARCHAR DEFAULT 'light'",
            "language_pref": "VARCHAR DEFAULT 'English (US)'"
        }
        with engine.begin() as conn:
            for col_name, col_type in expected_columns.items():
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE doctors ADD COLUMN {col_name} {col_type}"))

