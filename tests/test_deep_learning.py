import os
import sys
import unittest
import numpy as np
import torch

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml"))

from ml.deep_learning.sequence_tokenizer import (
    reconstruct_sequence,
    tokenize_sequence,
    batch_tokenize,
    HXB2_PR,
    HXB2_RT
)
from ml.deep_learning.models_cnn import HIV1DCNN
from ml.deep_learning.models_esm import ESM2ProteinEncoder, ESMResistanceClassifier
from ml.deep_learning.explainability import GradCAM1D, map_cam_to_mutations
from ml.deep_learning.predict_deep import predict_sequence_aware_resistance

class TestSequenceAwareDeepLearning(unittest.TestCase):

    def test_sequence_reconstruction(self):
        # Test PR reconstruction
        muts = ["D30N", "M46I", "I84V"]
        seq = reconstruct_sequence(muts, gene_type="PR")
        self.assertEqual(len(seq), 99)
        self.assertEqual(seq[29], "N") # D30N
        self.assertEqual(seq[45], "I") # M46I
        self.assertEqual(seq[83], "V") # I84V
        
        # Test RT reconstruction
        rt_muts = ["M184V", "K103N"]
        rt_seq = reconstruct_sequence(rt_muts, gene_type="RT")
        self.assertEqual(len(rt_seq), 240)
        self.assertEqual(rt_seq[183], "V") # M184V
        self.assertEqual(rt_seq[102], "N") # K103N

    def test_sequence_tokenization(self):
        seq = reconstruct_sequence(["D30N"], gene_type="PR")
        tokens = tokenize_sequence(seq, max_len=99)
        self.assertEqual(tokens.shape, torch.Size([99]))
        
        batch = batch_tokenize([seq, seq], max_len=99)
        self.assertEqual(batch.shape, torch.Size([2, 99]))

    def test_1d_cnn_forward(self):
        drugs = ["FPV", "ATV", "IDV", "LPV", "NFV", "SQV", "TPV", "DRV"]
        model = HIV1DCNN(num_drugs=len(drugs), drug_names=drugs, gene_type="PR")
        dummy_input = torch.randint(0, 20, (2, 99))
        out = model(dummy_input)
        
        self.assertIn("probabilities", out)
        self.assertIn("log_fold_change", out)
        self.assertIn("features", out)
        self.assertEqual(out["probabilities"].shape, torch.Size([2, 8]))
        self.assertEqual(out["log_fold_change"].shape, torch.Size([2, 8]))

    def test_esm_encoder_forward(self):
        esm = ESM2ProteinEncoder(num_layers=2, embed_dim=128, num_heads=4)
        dummy_tokens = torch.randint(0, 20, (2, 99))
        out = esm(dummy_tokens)
        
        self.assertIn("sequence_embedding", out)
        self.assertIn("contact_map", out)
        self.assertEqual(out["sequence_embedding"].shape, torch.Size([2, 128]))
        self.assertEqual(out["contact_map"].shape, torch.Size([2, 99, 99]))

    def test_grad_cam_generation(self):
        drugs = ["FPV", "ATV", "IDV", "LPV", "NFV", "SQV", "TPV", "DRV"]
        model = HIV1DCNN(num_drugs=len(drugs), drug_names=drugs, gene_type="PR")
        explainer = GradCAM1D(model)
        
        seq = reconstruct_sequence(["D30N", "M46I"], gene_type="PR")
        tokens = tokenize_sequence(seq, max_len=99).unsqueeze(0)
        
        cam = explainer.generate_cam(tokens, target_drug_idx=0, orig_seq_len=99)
        self.assertEqual(len(cam), 99)
        self.assertTrue(np.all(cam >= 0.0) and np.all(cam <= 1.0))
        
        hotspots = map_cam_to_mutations(cam, seq, ["D30N", "M46I"])
        self.assertIsInstance(hotspots, list)

    def test_sequence_aware_prediction(self):
        res = predict_sequence_aware_resistance(["D30N", "M46I", "M184V"], engine="cnn")
        self.assertIn("drug_predictions", res)
        self.assertIn("structural_explainability", res)
        self.assertIn("reconstructed_sequences", res)
        self.assertIn("overall_confidence", res)
        self.assertIn("FPV", res["drug_predictions"])
        self.assertIn("3TC", res["drug_predictions"])
        self.assertIn("uncertainty_metrics", res)
        self.assertIn("epistatic_interactions", res)

    def test_dirichlet_evidential_head(self):
        from ml.deep_learning.models_evidential import DirichletEvidentialHead, EvidentialLoss
        head = DirichletEvidentialHead(in_features=32, num_classes=3)
        x = torch.randn(4, 32)
        probs, u, alpha = head(x)
        self.assertEqual(probs.shape, (4, 3))
        self.assertEqual(u.shape, (4, 1))
        # Ensure uncertainty is bounded in (0, 1]
        self.assertTrue(torch.all(u > 0.0) and torch.all(u <= 1.0))
        # Test loss
        loss_fn = EvidentialLoss(num_classes=3)
        target = torch.tensor([0, 1, 2, 0])
        loss = loss_fn(alpha, target, epoch=1)
        self.assertGreater(float(loss.item()), 0.0)

    def test_evidential_uncertainty_metrics(self):
        from ml.deep_learning.models_evidential import EvidentialUncertaintyEstimator
        probs = torch.tensor([0.9, 0.08, 0.02])
        u = torch.tensor(0.12)
        metrics = EvidentialUncertaintyEstimator.compute_uncertainty_metrics(probs, u)
        self.assertEqual(metrics["reliability_tier"], "High Confidence")
        self.assertEqual(metrics["badge_color"], "emerald")
        self.assertGreater(metrics["reliability_score"], 0.8)

    def test_surveillance_epistatic_graph(self):
        from ml.deep_learning.models_epistatic import SurveillanceEpistaticGraph
        graph = SurveillanceEpistaticGraph(embed_dim=32, num_heads=2)
        dummy_muts = torch.randn(2, 4, 32)
        enhanced, attn = graph(dummy_muts)
        self.assertEqual(enhanced.shape, (2, 4, 32))
        self.assertEqual(attn.shape, (2, 4, 4))

    def test_epistatic_couplings_detection(self):
        from ml.deep_learning.models_epistatic import SurveillanceEpistaticGraph
        muts = ["M184V", "TDF", "M41L", "T215Y", "G140S", "Q148H"]
        couplings = SurveillanceEpistaticGraph.detect_epistatic_interactions(muts)
        self.assertGreaterEqual(len(couplings), 3)
        types = [c["type"] for c in couplings]
        self.assertIn("Hypersensitization", types)
        self.assertIn("Synergistic TAM Accumulation", types)
        self.assertIn("Compensatory Rescue", types)

    def test_biophysical_residue_embedding(self):
        from ml.deep_learning.models_biophysical import BiophysicalResidueEmbedding
        emb = BiophysicalResidueEmbedding(vocab_size=26, embed_dim=256, bio_dim=32)
        tokens = torch.randint(0, 26, (2, 99))
        out = emb(tokens)
        self.assertEqual(out.shape, (2, 99, 256))
        # Verify M184V delta
        delta = emb.get_mutation_delta_chem("M", "V")
        self.assertLess(delta["volume_delta_A3"], 0) # Steric contraction
        self.assertGreater(delta["hydropathy_delta"], 0) # More hydrophobic

    def test_spatial_contact_bias(self):
        from ml.deep_learning.models_spatial import SpatialContactBias
        spatial_pr = SpatialContactBias(length=99, protein_type="PR", contact_threshold=8.5)
        bias = spatial_pr(batch_size=2, num_heads=8)
        self.assertEqual(bias.shape, (2, 8, 99, 99))
        self.assertTrue(torch.all(bias <= 0.0))
        # Check pocket neighbor discovery
        neighbors = spatial_pr.get_3d_pocket_neighbors(25, radius=8.5)
        self.assertGreater(len(neighbors), 0)

    def test_multidrug_cross_attention(self):
        from ml.deep_learning.models_multidrug_attention import DrugSequenceCrossAttention, ALL_25_DRUGS
        mda = DrugSequenceCrossAttention(embed_dim=128, num_heads=4)
        seq = torch.randn(2, 50, 128)
        contexts, attn = mda(seq)
        self.assertEqual(contexts.shape, (2, len(ALL_25_DRUGS), 128))
        self.assertEqual(attn.shape, (2, len(ALL_25_DRUGS), 50))
        # Attention weights should sum to 1.0 across sequence
        self.assertTrue(torch.allclose(attn.sum(dim=-1), torch.ones(2, len(ALL_25_DRUGS)), atol=1e-4))

    def test_sparse_moe_ffn(self):
        from ml.deep_learning.models_moe import SparseMoEFFN
        moe = SparseMoEFFN(embed_dim=128, ffn_dim=256, num_experts=4, top_k=2)
        x = torch.randn(2, 60, 128)
        out, routing = moe(x)
        self.assertEqual(out.shape, (2, 60, 128))
        self.assertEqual(routing.shape, (2, 60, 4))
        summary = moe.get_expert_distribution_summary(routing)
        self.assertEqual(len(summary), 4)

    def test_nextgen_neural_inference(self):
        res = predict_sequence_aware_resistance(["M184V", "D30N", "K103N", "Q148H"], engine="cnn")
        self.assertIn("biophysical_mutation_profiles", res)
        self.assertIn("spatial_3d_pocket_contacts", res)
        self.assertIn("nextgen_neural_architecture", res)
        self.assertTrue(res["nextgen_neural_architecture"]["biophysical_multi_channel_neurons"])
        self.assertTrue(res["nextgen_neural_architecture"]["spatial_3d_contact_bias"])
        self.assertTrue(res["nextgen_neural_architecture"]["drug_sequence_cross_attention"])
        self.assertEqual(res["nextgen_neural_architecture"]["sparse_moe_experts"], 4)
        self.assertIn("M184V", res["biophysical_mutation_profiles"])
        self.assertIn("M184V", res["spatial_3d_pocket_contacts"])

if __name__ == "__main__":
    unittest.main()


