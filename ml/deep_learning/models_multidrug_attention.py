"""
Drug-to-Sequence Cross-Attention Layer for HIV Deep Learning.
Allows each of the 25 antiretroviral drug queries to attend specifically to its
active binding pocket and allosteric resistance determinants.
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, List, Optional, Tuple

ALL_25_DRUGS = [
    # PI (8)
    "FPV", "ATV", "IDV", "LPV", "NFV", "SQV", "TPV", "DRV",
    # NRTI (6)
    "3TC", "ABC", "AZT", "D4T", "DDI", "TDF",
    # NNRTI (5)
    "EFV", "ETR", "NVP", "RPV", "DOR",
    # INSTI (5)
    "DTG", "BIC", "CAB", "EVG", "RAL",
    # Capsid (1)
    "LEN"
]

DRUG_TO_CLASS = {
    # PI
    "FPV": "PI", "ATV": "PI", "IDV": "PI", "LPV": "PI", "NFV": "PI", "SQV": "PI", "TPV": "PI", "DRV": "PI",
    # NRTI
    "3TC": "NRTI", "ABC": "NRTI", "AZT": "NRTI", "D4T": "NRTI", "DDI": "NRTI", "TDF": "NRTI",
    # NNRTI
    "EFV": "NNRTI", "ETR": "NNRTI", "NVP": "NNRTI", "RPV": "NNRTI", "DOR": "NNRTI",
    # INSTI
    "DTG": "INSTI", "BIC": "INSTI", "CAB": "INSTI", "EVG": "INSTI", "RAL": "INSTI",
    # Capsid
    "LEN": "CAPSID"
}


class DrugSequenceCrossAttention(nn.Module):
    """
    Multi-Head Cross-Attention Layer where Drug Queries attend to Sequence Residues.
    Produces per-drug contextual embeddings and per-drug attention distributions.
    """
    def __init__(
        self,
        embed_dim: int = 256,
        num_heads: int = 8,
        drugs: Optional[List[str]] = None,
        dropout: float = 0.1
    ):
        super().__init__()
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads
        assert embed_dim % num_heads == 0, "embed_dim must be divisible by num_heads"
        
        self.drugs = drugs or ALL_25_DRUGS
        self.num_drugs = len(self.drugs)
        self.drug_to_idx = {d: i for i, d in enumerate(self.drugs)}
        
        # Learnable query representations for each drug
        self.drug_query_embed = nn.Parameter(torch.randn(self.num_drugs, embed_dim) * 0.02)
        
        # Projections
        self.q_proj = nn.Linear(embed_dim, embed_dim)
        self.k_proj = nn.Linear(embed_dim, embed_dim)
        self.v_proj = nn.Linear(embed_dim, embed_dim)
        self.out_proj = nn.Linear(embed_dim, embed_dim)
        
        self.norm_seq = nn.LayerNorm(embed_dim)
        self.norm_drug = nn.LayerNorm(embed_dim)
        self.dropout = nn.Dropout(dropout)

    def forward(
        self,
        sequence_repr: torch.Tensor,
        target_drugs: Optional[List[str]] = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            sequence_repr: (B, L, embed_dim) latent sequence tokens from Transformer
            target_drugs: Optional subset of drug codes to evaluate (e.g. ['3TC', 'TDF', 'DTG'])
        Returns:
            - drug_contexts: (B, N_selected_drugs, embed_dim) contextual drug representations
            - attention_weights: (B, N_selected_drugs, L) per-drug residue attention distribution
        """
        B, L, D = sequence_repr.shape
        seq_norm = self.norm_seq(sequence_repr)
        
        if target_drugs is not None:
            indices = [self.drug_to_idx[d] for d in target_drugs if d in self.drug_to_idx]
            queries_raw = self.drug_query_embed[indices]
            selected_count = len(indices)
        else:
            queries_raw = self.drug_query_embed
            selected_count = self.num_drugs
            
        # Expand queries across batch: (B, N_drugs, D)
        queries = self.norm_drug(queries_raw).unsqueeze(0).expand(B, -1, -1)
        
        # Project into multi-head space
        q = self.q_proj(queries).view(B, selected_count, self.num_heads, self.head_dim).transpose(1, 2)  # (B, H, N_drugs, head_dim)
        k = self.k_proj(seq_norm).view(B, L, self.num_heads, self.head_dim).transpose(1, 2)              # (B, H, L, head_dim)
        v = self.v_proj(seq_norm).view(B, L, self.num_heads, self.head_dim).transpose(1, 2)              # (B, H, L, head_dim)
        
        # Scaled dot-product attention scores
        scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(self.head_dim)  # (B, H, N_drugs, L)
        attn_weights = F.softmax(scores, dim=-1)                                   # (B, H, N_drugs, L)
        
        # Apply dropout to attention map during training
        attn_dropped = self.dropout(attn_weights)
        context = torch.matmul(attn_dropped, v)  # (B, H, N_drugs, head_dim)
        
        # Reshape and project out
        context = context.transpose(1, 2).contiguous().view(B, selected_count, D)  # (B, N_drugs, D)
        out = self.out_proj(context)
        
        # Average attention across heads for explainability: (B, N_drugs, L)
        mean_attn = attn_weights.mean(dim=1)
        
        return out, mean_attn
