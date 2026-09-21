import os
import sys
import unittest
from fastapi.testclient import TestClient

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from backend.main import app

class TestHIVARTSelectorAPI(unittest.TestCase):
    
    def setUp(self):
        from backend.main import seed_data
        from backend.database import get_db
        from backend import models
        seed_data()
        db = next(get_db())
        try:
            doc = db.query(models.Doctor).filter_by(email="doctor@hivclinic.org").first()
            if doc:
                doc.password_hash = "clinicalpass123"
                db.commit()
        finally:
            db.close()
        self.client = TestClient(app)

    def tearDown(self):
        from backend.database import engine
        engine.dispose()

    def test_login_success(self):
        # Default seeded clinician
        response = self.client.post("/api/auth/login", json={
            "email": "doctor@hivclinic.org",
            "password": "clinicalpass123"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("full_name", data)
        self.assertEqual(data["email"], "doctor@hivclinic.org")

    def test_login_unauthorized(self):
        response = self.client.post("/api/auth/login", json={
            "email": "doctor@hivclinic.org",
            "password": "wrongpassword"
        })
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_verify_session_success(self):
        response = self.client.get("/api/auth/verify?email=doctor@hivclinic.org")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], "doctor@hivclinic.org")

    def test_verify_session_unauthorized(self):
        response = self.client.get("/api/auth/verify?email=nonexistent@hivclinic.org")
        self.assertEqual(response.status_code, 401)

    def test_update_doctor_profile(self):
        response = self.client.put("/api/auth/profile?email=doctor@hivclinic.org", json={
            "full_name": "Dr. Sarah Jenkins, MD (Specialist)",
            "specialization": "Infectious Diseases & ART Virology",
            "experience_years": 15
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["full_name"], "Dr. Sarah Jenkins, MD (Specialist)")
        self.assertEqual(data["experience_years"], 15)

    def test_change_doctor_password(self):
        response = self.client.post("/api/auth/change-password?email=doctor@hivclinic.org", json={
            "old_password": "clinicalpass123",
            "new_password": "newsecurepassword123"
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.json())

    def test_genotype_validation(self):
        # Valid sequence with mutations
        response = self.client.post("/api/genotype/validate", json={
            "raw_sequence": "AGCTAGCTM184VAGCTK103NAGCT"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["is_valid"])
        self.assertIn("M184V", data["detected_mutations"])
        self.assertIn("K103N", data["detected_mutations"])

        # Invalid sequence
        response = self.client.post("/api/genotype/validate", json={
            "raw_sequence": ""
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["is_valid"])

    def test_get_cases(self):
        response = self.client.get("/api/cases")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)

    def test_get_model_info(self):
        response = self.client.get("/api/model/info")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("model_version", data)
        self.assertIn("dataset_info", data)

    def test_kb_settings(self):
        response = self.client.get("/api/settings/kb")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("scoring_weights", data)
        self.assertIn("standard_regimens", data)

    def test_dataset_preview(self):
        response = self.client.get("/api/dataset/preview")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_samples", data)
        self.assertIn("preview", data)
        self.assertIsInstance(data["preview"], list)

    def test_genotype_analyze_deep_learning(self):
        import uuid
        # Create a test case
        case_res = self.client.post("/api/cases", json={
            "patient_ref": f"TEST-DEEP-{uuid.uuid4().hex[:8]}",
            "cd4_count": 350,
            "viral_load": "High",
            "treatment_history": "Treatment_Naive",
            "adherence": "Good",
            "comorbidity": "None"
        })
        self.assertEqual(case_res.status_code, 200)
        case_id = case_res.json()["id"]

        # Run 1D-CNN Sequence-Aware Analysis
        analyze_res = self.client.post("/api/genotype/analyze", json={
            "case_id": case_id,
            "mutations": ["M184V", "K103N", "D30N"],
            "raw_sequence": "",
            "engine": "cnn"
        })
        self.assertEqual(analyze_res.status_code, 200)
        data = analyze_res.json()
        self.assertIn("prediction_output_json", data)
        self.assertIn("scores_json", data)
        self.assertEqual(data["case_id"], case_id)

    def test_fasta_parsing(self):
        sample_dna = ">Sample_Protease_D30N\nCCTCAAATCACTCTTTGGCAACGACCCCTCGTCACAATAAAGATAGGGGGGCAACTAAAGGAAGCTCTATTAGATACAGGAGCAGATAATACAGTATTAGAAGAA"
        res = self.client.post("/api/genotype/parse-fasta", json={"fasta_text": sample_dna})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("PR", data["detected_genes"])
        self.assertIn("D30N", data["detected_mutations"])

    def test_models_benchmark(self):
        res = self.client.get("/api/models/benchmark")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("engine_comparison", data)
        self.assertIn("overall_summary", data)
        self.assertGreater(len(data["engine_comparison"]), 5)

    def test_fasta_parsing_capsid(self):
        from ml.deep_learning.sequence_tokenizer import HXB2_CA
        ca_mut = list(HXB2_CA)
        ca_mut[65] = "I" # M66I
        sample_ca = ">Capsid_Sample_M66I\n" + "".join(ca_mut)
        res = self.client.post("/api/genotype/parse-fasta", json={"fasta_text": sample_ca})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("CA", data["detected_genes"])
        self.assertIn("M66I", data["detected_mutations"])

    def test_generate_patient_test_id(self):
        res = self.client.get("/api/cases/generate-id")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("patient_test_id", data)
        self.assertTrue(data["patient_test_id"].startswith("HIV-"))
        self.assertIn("privacy_guarantee", data)

    def test_search_patient_test_id(self):
        # 1. Search non-existent
        res = self.client.get("/api/cases/search?test_id=UNKNOWN-999")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["found"])

        # 2. Search seeded case
        res_cases = self.client.get("/api/cases")
        cases = res_cases.json()
        if cases:
            ref = cases[0]["patient_ref"]
            res2 = self.client.get(f"/api/cases/search?test_id={ref}")
            self.assertEqual(res2.status_code, 200)
            data2 = res2.json()
            self.assertTrue(data2["found"])
            self.assertEqual(data2["patient_test_id"], ref)
            self.assertIsNotNone(data2["case"])

if __name__ == "__main__":
    unittest.main()

