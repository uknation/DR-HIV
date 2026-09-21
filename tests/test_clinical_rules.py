import unittest
import sys
import os

# Add paths
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "clinical"))

from clinical.regimen_rules import (
    evaluate_regimen, 
    rank_regimens, 
    load_knowledge_base,
    get_prediction_for_drug
)

class TestClinicalRegimenRules(unittest.TestCase):

    def setUp(self):
        self.kb = load_knowledge_base()

    def test_knowledge_base_structure(self):
        self.assertIn("drugs", self.kb)
        self.assertIn("scoring_weights", self.kb)
        self.assertIn("clinical_rules", self.kb)
        self.assertIn("standard_regimens", self.kb)
        self.assertGreater(len(self.kb["standard_regimens"]), 5)

    def test_drug_prediction_alias_lookup(self):
        preds = {
            "3TC": {"prediction": 1, "interpretation": "High-Level Resistance"},
            "TDF": {"prediction": 0, "interpretation": "Susceptible"}
        }
        # Generic name lookup
        res_3tc = get_prediction_for_drug("lamivudine", preds)
        self.assertEqual(res_3tc.get("interpretation"), "High-Level Resistance")
        res_tdf = get_prediction_for_drug("tenofovir", preds)
        self.assertEqual(res_tdf.get("interpretation"), "Susceptible")

    def test_redundant_coadministration_penalty(self):
        # 3TC + FTC is a contraindicated redundant pairing
        preds = {
            "lamivudine": {"interpretation": "Susceptible"},
            "emtricitabine": {"interpretation": "Susceptible"},
            "dolutegravir": {"interpretation": "Susceptible"}
        }
        eval_res = evaluate_regimen(["lamivudine", "emtricitabine", "dolutegravir"], preds, self.kb)
        self.assertGreater(eval_res["redundant_count"], 0)
        self.assertLessEqual(eval_res["score"], 30)

    def test_m184v_hypersensitization(self):
        # M184V hypersensitizes TDF
        preds = {
            "TDF": {"interpretation": "Susceptible"},
            "3TC": {"interpretation": "High-Level Resistance"},
            "DTG": {"interpretation": "Susceptible"}
        }
        clinical_data_with_m184v = {"mutations": ["M184V"]}
        clinical_data_naive = {"mutations": []}
        
        res_mut = evaluate_regimen(["tenofovir", "lamivudine", "dolutegravir"], preds, self.kb, clinical_data_with_m184v)
        res_naive = evaluate_regimen(["tenofovir", "lamivudine", "dolutegravir"], preds, self.kb, clinical_data_naive)
        
        # Regimen with M184V should receive the synergy bonus
        self.assertGreaterEqual(res_mut["score"], res_naive["score"])

    def test_rank_regimens_sorting(self):
        preds = {
            "TDF": {"interpretation": "Susceptible"},
            "3TC": {"interpretation": "Susceptible"},
            "DTG": {"interpretation": "Susceptible"},
            "EFV": {"interpretation": "High-Level Resistance"},
            "DRV": {"interpretation": "Susceptible"}
        }
        ranked = rank_regimens(preds, "INSTI_based")
        self.assertGreater(len(ranked), 0)
        # Verify descending sort
        scores = [r["score"] for r in ranked]
        self.assertEqual(scores, sorted(scores, reverse=True))
        # Top rank should be 1
    def test_lenacapavir_salvage_regimen(self):
        # Patient with Pan-NRTI and NNRTI failure
        preds = {
            "TDF": {"interpretation": "High-Level Resistance"},
            "3TC": {"interpretation": "High-Level Resistance"},
            "EFV": {"interpretation": "High-Level Resistance"},
            "DRV": {"interpretation": "Susceptible"},
            "DTG": {"interpretation": "Susceptible"},
            "LEN": {"interpretation": "Susceptible"}
        }
        clinical_data = {"mutations": ["M184V", "K65R", "K103N"]}
        ranked = rank_regimens(preds, "Salvage_Multiclass", clinical_data)
        
        # Top regimen should be DRV + DTG + LEN
        top_regimen = ranked[0]
        self.assertEqual(top_regimen["name"], "DRV + DTG + LEN")
        self.assertEqual(top_regimen["active_agents"], 3)
        self.assertGreaterEqual(top_regimen["score"], 90)

if __name__ == "__main__":
    unittest.main()
