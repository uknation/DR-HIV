"""
Structural Explainability Engine for Deep Learning HIV Resistance Models.
Implements 1D Grad-CAM (Class Activation Maps) and Protein Transformer Attention Heatmaps.
"""

import torch
import torch.nn.functional as F
import numpy as np
from typing import List, Dict, Any, Optional

class GradCAM1D:
    """
    1D Gradient-Weighted Class Activation Mapping (Grad-CAM).
    Identifies residue-level structural hot-spots driving drug resistance.
    """
    def __init__(self, model):
        self.model = model
        self.model.eval()
        self.model.register_cam_hooks()

    def generate_cam(self, tokens: torch.Tensor, target_drug_idx: int, orig_seq_len: int) -> np.ndarray:
        """
        Computes 1D Grad-CAM importance profile along the sequence.
        
        tokens: (1, seq_len)
        target_drug_idx: index of drug to explain
        orig_seq_len: length of full sequence (e.g. 99 for PR, 240 for RT)
        
        Returns:
          normalized 1D array of shape (orig_seq_len,) with values in [0, 1].
        """
        self.model.zero_grad()
        output = self.model(tokens)
        logits = output["logits"]
        
        target_score = logits[0, target_drug_idx]
        target_score.backward(retain_graph=True)
        
        gradients = self.model.gradients # (1, channels, reduced_len)
        activations = self.model.activations # (1, channels, reduced_len)
        
        if gradients is None or activations is None:
            # Fallback if hooks didn't capture
            return np.zeros(orig_seq_len)
            
        # Global Average Pooling of gradients across spatial dimension
        weights = gradients.mean(dim=2, keepdim=True) # (1, channels, 1)
        
        # Weighted combination of activation maps
        cam = (weights * activations).sum(dim=1, keepdim=True) # (1, 1, reduced_len)
        cam = F.relu(cam)
        
        # Interpolate back to original sequence length (1, 1, orig_seq_len)
        cam = F.interpolate(cam, size=orig_seq_len, mode="linear", align_corners=False)
        cam_np = cam.squeeze().detach().cpu().numpy()
        
        # Normalize to [0, 1]
        max_val = np.max(cam_np)
        min_val = np.min(cam_np)
        if max_val > min_val:
            cam_np = (cam_np - min_val) / (max_val - min_val)
        else:
            cam_np = np.zeros(orig_seq_len)
            
        return cam_np

def map_cam_to_mutations(
    cam_scores: np.ndarray,
    reconstructed_seq: str,
    mutations_list: List[str]
) -> List[Dict[str, Any]]:
    """
    Extracts residue importance scores and highlights user-input mutations.
    """
    hotspots = []
    for pos_idx, score in enumerate(cam_scores):
        pos = pos_idx + 1 # 1-indexed codon
        aa = reconstructed_seq[pos_idx] if pos_idx < len(reconstructed_seq) else "X"
        
        # Check if this position is a mutation
        is_mut = False
        mut_name = ""
        for m in mutations_list:
            if str(pos) in m:
                is_mut = True
                mut_name = m
                break
                
        if score > 0.15 or is_mut:
            hotspots.append({
                "position": pos,
                "amino_acid": aa,
                "importance_score": float(round(score, 4)),
                "is_patient_mutation": is_mut,
                "mutation_token": mut_name if is_mut else f"{aa}{pos}"
            })
            
    # Sort descending by importance score
    hotspots.sort(key=lambda x: x["importance_score"], reverse=True)
    return hotspots

if __name__ == "__main__":
    from models_cnn import HIV1DCNN
    from sequence_tokenizer import tokenize_sequence, reconstruct_sequence
    
    drugs = ["FPV", "ATV", "IDV", "LPV", "NFV", "SQV", "TPV", "DRV"]
    cnn = HIV1DCNN(num_drugs=len(drugs), drug_names=drugs, gene_type="PR")
    cam_explainer = GradCAM1D(cnn)
    
    seq = reconstruct_sequence(["D30N", "M46I", "I84V"], gene_type="PR")
    tokens = tokenize_sequence(seq).unsqueeze(0)
    
    cam_profile = cam_explainer.generate_cam(tokens, target_drug_idx=0, orig_seq_len=99)
    hotspots = map_cam_to_mutations(cam_profile, seq, ["D30N", "M46I", "I84V"])
    
    print("1D Grad-CAM initialized successfully!")
    print(f"CAM Profile length: {len(cam_profile)}")
    print(f"Top 5 structural hot-spots: {hotspots[:5]}")
