"""
Sparse Mixture-of-Experts (MoE) FFN Module for HIV Deep Learning.
Replaces monolithic feedforward layers with specialized functional neural sub-networks,
dynamically routing tokens via a Top-2 gating mechanism.
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, List, Optional, Tuple

EXPERT_NAMES = [
    "Polymerase & Chain-Excision Expert",       # NRTI mechanism & ATP excision
    "Allosteric Hydrophobic Cavity Expert",     # NNRTI binding pocket
    "Catalytic Metal Coordination Expert",      # INSTI Mg2+ triad
    "Dimer Interface & Capsid Lattice Expert"   # Protease flaps & Capsid hexamer
]


class ExpertFFN(nn.Module):
    """Individual functional expert feedforward network."""
    def __init__(self, embed_dim: int = 256, ffn_dim: int = 512, dropout: float = 0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(embed_dim, ffn_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(ffn_dim, embed_dim),
            nn.Dropout(dropout)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class SparseMoEFFN(nn.Module):
    """
    Sparse Mixture-of-Experts Feedforward Layer with Top-2 Gating.
    Dynamically routes residue tokens to the 2 most specialized functional experts.
    """
    def __init__(
        self,
        embed_dim: int = 256,
        ffn_dim: int = 512,
        num_experts: int = 4,
        top_k: int = 2,
        dropout: float = 0.1
    ):
        super().__init__()
        self.embed_dim = embed_dim
        self.num_experts = num_experts
        self.top_k = min(top_k, num_experts)
        
        # 4 Specialized functional experts
        self.experts = nn.ModuleList([
            ExpertFFN(embed_dim, ffn_dim, dropout) for _ in range(num_experts)
        ])
        
        # Gating router: learns which tokens should go to which expert
        self.router = nn.Linear(embed_dim, num_experts, bias=False)
        nn.init.normal_(self.router.weight, std=0.02)
        
        self.layer_norm = nn.LayerNorm(embed_dim)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            x: (B, L, embed_dim) input token tensor
        Returns:
            - out: (B, L, embed_dim) routed output tensor
            - routing_weights: (B, L, num_experts) token routing distribution across experts
        """
        B, L, D = x.shape
        flat_x = x.view(-1, D)  # (N, D) where N = B * L
        
        # 1. Compute gating logits
        router_logits = self.router(flat_x)  # (N, num_experts)
        
        # 2. Select Top-K experts per token
        top_logits, top_indices = torch.topk(router_logits, self.top_k, dim=-1)  # (N, top_k)
        top_weights = F.softmax(top_logits, dim=-1)                              # (N, top_k)
        
        # 3. Dispatch to selected experts and combine
        out = torch.zeros_like(flat_x)
        for k in range(self.top_k):
            expert_idx = top_indices[:, k]     # (N,)
            expert_weight = top_weights[:, k].unsqueeze(-1)  # (N, 1)
            
            # Efficient grouped execution
            for e in range(self.num_experts):
                mask = (expert_idx == e)
                if mask.any():
                    selected_tokens = flat_x[mask]
                    expert_out = self.experts[e](selected_tokens)
                    out[mask] += expert_weight[mask] * expert_out
                    
        # Reshape back to (B, L, D)
        out = out.view(B, L, D)
        
        # Full routing probability distribution (for visualization & load balancing)
        full_routing = F.softmax(router_logits, dim=-1).view(B, L, self.num_experts)
        
        return out, full_routing

    def get_expert_distribution_summary(self, routing_weights: torch.Tensor) -> Dict[str, float]:
        """
        Summarizes what percentage of sequence tokens routed to each functional expert.
        """
        # routing_weights: (B, L, num_experts)
        mean_loads = routing_weights.mean(dim=[0, 1])  # (num_experts,)
        summary = {}
        for i, name in enumerate(EXPERT_NAMES[:self.num_experts]):
            summary[name] = round(mean_loads[i].item() * 100.0, 1)
        return summary
