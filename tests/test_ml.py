import os
import sys
import unittest
import pandas as pd

# Add root folder to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml"))

from ml.preprocessing import parse_mutations, clean_and_impute, encode_features
from ml.predict import predict_resistance

class TestHIVMLPipeline(unittest.TestCase):
    
    def setUp(self):
        # Create a mock dataframe resembling the synthetic dataset
        self.mock_df = pd.DataFrame([
            {
                "sample_id": "HIV_TEST001",
                "nrtI_mutations": "M184V;K65R",
                "nnrti_mutations": "None",
                "pi_mutations": "None",
                "insti_mutations": "None",
                "viral_load_category": "High",
                "cd4_category": "Low",
                "treatment_history": "Previously_Treated",
                "previous_art_failure": "Yes",
                "adherence_category": "Good",
                "comorbidity_flag": "None"
            },
            {
                "sample_id": "HIV_TEST002",
                "nrtI_mutations": "None",
                "nnrti_mutations": "K103N",
                "pi_mutations": "None",
                "insti_mutations": "N155H",
                "viral_load_category": None, # Test imputation
                "cd4_category": None, # Test imputation
                "treatment_history": "Treatment_Naive",
                "previous_art_failure": "No",
                "adherence_category": None, # Test imputation
                "comorbidity_flag": "Present"
            }
        ])

    def test_imputation(self):
        cleaned = clean_and_impute(self.mock_df)
        # Check that NaN values are filled
        self.assertEqual(cleaned.at[1, "viral_load_category"], "Unknown")
        self.assertEqual(cleaned.at[1, "cd4_category"], "Unknown")
        self.assertEqual(cleaned.at[1, "adherence_category"], "Unknown")
        self.assertEqual(cleaned.at[1, "comorbidity_flag"], "Present")

    def test_mutation_parsing(self):
        cleaned = clean_and_impute(self.mock_df)
        parsed = parse_mutations(cleaned)
        # Check binary indicator mapping
        self.assertEqual(parsed.at[0, "mut_M184V"], 1)
        self.assertEqual(parsed.at[0, "mut_K65R"], 1)
        self.assertEqual(parsed.at[0, "mut_K103N"], 0)
        self.assertEqual(parsed.at[1, "mut_K103N"], 1)
        self.assertEqual(parsed.at[1, "mut_N155H"], 1)

    def test_feature_encoding(self):
        cleaned = clean_and_impute(self.mock_df)
        parsed = parse_mutations(cleaned)
        encoded, feature_cols = encode_features(parsed)
        
        # Check that expected encoded features are present
        self.assertIn("feat_treatment_history_treated", feature_cols)
        self.assertIn("feat_prev_failure_yes", feature_cols)
        self.assertIn("feat_comorbidity_present", feature_cols)
        self.assertEqual(encoded.at[0, "feat_treatment_history_treated"], 1)
        self.assertEqual(encoded.at[1, "feat_treatment_history_treated"], 0)
        self.assertEqual(encoded.at[0, "feat_comorbidity_present"], 0)
        self.assertEqual(encoded.at[1, "feat_comorbidity_present"], 1)

    def test_inference_service(self):
        # Verify that prediction does not crash and loads models
        mutations = ["M184V", "K103N"]
        clinical_data = {
            "subtype": "C",
            "viral_load_category": "High",
            "cd4_category": "Low",
            "treatment_history": "Previously_Treated",
            "previous_art_failure": "Yes",
            "adherence_category": "Good",
            "comorbidity_flag": "None"
        }
        res = predict_resistance(mutations, clinical_data)
        
        # Check result structure
        self.assertIn("drug_predictions", res)
        self.assertIn("overall_category", res)
        self.assertIn("overall_confidence", res)
        self.assertTrue("TDF" in res["drug_predictions"] or "tenofovir" in res["drug_predictions"])
        # Verify custom contribution
        self.assertGreaterEqual(res["overall_confidence"], 0.0)

if __name__ == "__main__":
    unittest.main()
