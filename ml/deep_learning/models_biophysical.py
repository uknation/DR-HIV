"""
Biophysical Multi-Channel Residue Embedding Module for HIV Deep Learning.
Encodes fundamental physical chemistry properties (volume, hydropathy, charge, pI, H-bonds, aromaticity)
directly into neuron representations, augmenting learned discrete tokens.
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, List, Optional, Tuple

# Raw physicochemical parameters for 20 canonical amino acids
# Source: Zamyatnin (1972), Kyte-Doolittle (1982), CRC Handbook of Chemistry and Physics
AMINO_ACID_PHYSICOCHEMICAL: Dict[str, List[float]] = {
    # Format: [Volume (Å³), Hydropathy (-4.5 to 4.5), Charge at pH 7.4, pI, H-donors, H-acceptors, Aromaticity]
    "A": [88.6,   1.8,  0.0,  6.00, 1.0, 1.0, 0.0],
    "C": [108.5,  2.5,  0.0,  5.07, 1.0, 1.0, 0.0],
    "D": [111.1, -3.5, -1.0,  2.77, 1.0, 2.0, 0.0],
    "E": [138.4, -3.5, -1.0,  3.22, 1.0, 2.0, 0.0],
    "F": [189.9,  2.8,  0.0,  5.48, 1.0, 1.0, 1.0],
    "G": [60.1,  -0.4,  0.0,  5.97, 1.0, 1.0, 0.0],
    "H": [153.2, -3.2,  0.1,  7.59, 2.0, 1.0, 1.0],
    "I": [166.7,  4.5,  0.0,  6.02, 1.0, 1.0, 0.0],
    "K": [168.6, -3.9,  1.0,  9.74, 2.0, 1.0, 0.0],
    "L": [166.7,  3.8,  0.0,  5.98, 1.0, 1.0, 0.0],
    "M": [162.9,  1.9,  0.0,  5.74, 1.0, 1.0, 0.0],
    "N": [114.1, -3.5,  0.0,  5.41, 2.0, 2.0, 0.0],
    "P": [112.7, -1.6,  0.0,  6.30, 0.0, 1.0, 0.0],
    "Q": [143.8, -3.5,  0.0,  5.65, 2.0, 2.0, 0.0],
    "R": [173.4, -4.5,  1.0, 10.76, 4.0, 1.0, 0.0],
    "S": [89.0,  -0.8,  0.0,  5.68, 2.0, 2.0, 0.0],
    "T": [116.1, -0.7,  0.0,  5.60, 2.0, 2.0, 0.0],
    "V": [140.0,  4.2,  0.0,  5.96, 1.0, 1.0, 0.0],
    "W": [227.8, -0.9,  0.0,  5.89, 2.0, 1.0, 1.0],
    "Y": [193.6, -1.3,  0.0,  5.66, 2.0, 2.0, 1.0],
}

# Special token defaults (all zeros)
SPECIAL_PHYSICOCHEMICAL = [0.0, 0.0, 0.0, 5.5, 0.0, 0.0, 0.0]


def build_biophysical_tensor(vocab: List[str]) -> torch.Tensor:
    """
    Constructs a normalized (Z-score) biophysical feature table matching vocab indices.
    """
    raw_matrix = []
    for token in vocab:
        if token in AMINO_ACID_PHYSICOCHEMICAL:
            raw_matrix.append(AMINO_ACID_PHYSICOCHEMICAL[token])
        else:
            raw_matrix.append(SPECIAL_PHYSICOCHEMICAL)

    tensor = torch.tensor(raw_matrix, dtype=torch.float32)
    # Normalize features across standard amino acids (indices 6 to 25)
    mean = tensor[6:].mean(dim=0, keepdim=True)
    std = tensor[6:].std(dim=0, keepdim=True) + 1e-6
    normalized = (tensor - mean) / std
    # Zero out special token rows (<PAD>, <UNK>, etc.)
    normalized[:6] = 0.0
    return normalized


class BiophysicalResidueEmbedding(nn.Module):
    """
    Combines learned discrete sequence embeddings with projected biophysical channels.
    Produces physical-chemistry-aware token representations for the protein backbone.
    """
    def __init__(
        self,
        vocab_size: int = 26,
        embed_dim: int = 256,
        bio_dim: int = 32,
        dropout: float = 0.1,
        vocab: Optional[List[str]] = None
    ):
        super().__init__()
        self.embed_dim = embed_dim
        self.bio_dim = bio_dim
        self.learned_dim = embed_dim - bio_dim
        
        # 1. Discrete token embedding
        self.token_embedding = nn.Embedding(vocab_size, self.learned_dim, padding_idx=0)
        
        # 2. Continuous biophysical property lookup table (fixed or fine-tuneable)
        if vocab is None:
            # Default fallback matching sequence_tokenizer.py
            special = ["<PAD>", "<UNK>", "-", ".", "*", "X"]
            aa = ["A", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "V", "W", "Y"]
            vocab = special + aa
            
        bio_table = build_biophysical_tensor(vocab)
        self.register_buffer("bio_table", bio_table)  # (vocab_size, 7)
        
        # 3. Dense projection MLP for continuous biophysical channels
        self.bio_mlp = nn.Sequential(
            nn.Linear(7, bio_dim),
            nn.LayerNorm(bio_dim),
            nn.GELU(),
            nn.Linear(bio_dim, bio_dim)
        )
        
        self.layer_norm = nn.LayerNorm(embed_dim)
        self.dropout = nn.Dropout(dropout)

    def forward(self, token_ids: torch.Tensor) -> torch.Tensor:
        """
        Args:
            token_ids: (B, L) integer token tensor
        Returns:
            (B, L, embed_dim) physics-augmented residue representations
        """
        B, L = token_ids.shape
        # Discrete embeddings
        learned_emb = self.token_embedding(token_ids)  # (B, L, learned_dim)
        
        # Lookup continuous physicochemical vectors
        # Clamp token_ids to valid vocab range for buffer indexing
        clamped_ids = token_ids.clamp(0, self.bio_table.size(0) - 1)
        raw_bio = self.bio_table[clamped_ids]  # (B, L, 7)
        bio_emb = self.bio_mlp(raw_bio)        # (B, L, bio_dim)
        
        # Concatenate learned and physical channels
        combined = torch.cat([learned_emb, bio_emb], dim=-1)  # (B, L, embed_dim)
        out = self.layer_norm(combined)
        return self.dropout(out)

    def get_mutation_delta_chem(self, wt_aa: str, mut_aa: str) -> Dict[str, float]:
        """
        Computes the physical difference (delta) between wildtype and mutant residue.
        Useful for explainability and clinical reporting.
        """
        wt_vec = AMINO_ACID_PHYSICOCHEMICAL.get(wt_aa, SPECIAL_PHYSICOCHEMICAL)
        mut_vec = AMINO_ACID_PHYSICOCHEMICAL.get(mut_aa, SPECIAL_PHYSICOCHEMICAL)
        
        return {
            "volume_delta_A3": round(mut_vec[0] - wt_vec[0], 2),
            "hydropathy_delta": round(mut_vec[1] - wt_vec[1], 2),
            "charge_delta": round(mut_vec[2] - wt_vec[2], 2),
            "pi_delta": round(mut_vec[3] - wt_vec[3], 2),
            "h_donor_delta": round(mut_vec[4] - wt_vec[4], 2),
            "h_acceptor_delta": round(mut_vec[5] - wt_vec[5], 2),
            "aromaticity_change": bool(mut_vec[6] != wt_vec[6])
        }
