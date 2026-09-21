"""
Dirichlet Evidential Deep Learning for HIV Drug Resistance Modeling.
Quantifies Epistemic Uncertainty (model ignorance / unseen mutation penalty)
using Subjective Logic and Dirichlet prior distributions (Sensoy et al., NeurIPS).
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Any, Tuple, Optional

class DirichletEvidentialHead(nn.Module):
    """
    Dirichlet Evidential Output Head for HIV Drug Resistance Classification.
    
    Transforms latent representations into non-negative evidence vectors:
      e_k = softplus(z_k)
      alpha_k = e_k + 1
      Total Evidence S = sum(alpha_k)
      Belief b_k = e_k / S
      Epistemic Uncertainty u = K / S in (0, 1]
    """
    def __init__(self, in_features: int, num_classes: int = 3):
        super().__init__()
        self.num_classes = num_classes
        self.fc = nn.Linear(in_features, num_classes)
        
        # Initialize with slight positive bias so unobserved classes start with low prior
        nn.init.xavier_uniform_(self.fc.weight)
        nn.init.constant_(self.fc.bias, 0.0)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Forward pass.
        
        Returns:
          - probabilities: Expected categorical probabilities p_k = alpha_k / S (B, K)
          - uncertainty: Normalized epistemic uncertainty u = K / S in [0, 1] (B, 1)
          - alpha: Dirichlet concentration parameters alpha_k (B, K)
        """
        logits = self.fc(x)
        # Non-negative evidence via Softplus
        evidence = F.softplus(logits)
        alpha = evidence + 1.0
        S = torch.sum(alpha, dim=-1, keepdim=True)
        probabilities = alpha / S
        uncertainty = self.num_classes / S
        return probabilities, uncertainty, alpha

class EvidentialUncertaintyEstimator:
    """
    Evaluates epistemic and aleatoric uncertainty from model representations.
    """
    @staticmethod
    def compute_uncertainty_metrics(
        probabilities: torch.Tensor,
        uncertainty: torch.Tensor,
        alpha: Optional[torch.Tensor] = None
    ) -> Dict[str, Any]:
        """
        Computes structured uncertainty metrics for clinical interpretation.
        
        Args:
          probabilities: (K,) or (1, K)
          uncertainty: scalar or (1, 1) in [0, 1]
        """
        if probabilities.dim() > 1:
            probabilities = probabilities[0]
        if uncertainty.dim() > 0 and uncertainty.numel() == 1:
            u_val = float(uncertainty.item())
        else:
            u_val = float(uncertainty)
            
        u_val = max(0.01, min(0.99, u_val))
        
        # Shannon predictive entropy (total predictive uncertainty)
        probs = probabilities.clamp(min=1e-7, max=1.0)
        entropy = -torch.sum(probs * torch.log2(probs)).item()
        max_entropy = math.log2(len(probs))
        norm_entropy = min(1.0, entropy / max(1e-5, max_entropy))
        
        # Reliability Tier
        if u_val < 0.25:
            tier = "High Confidence"
            desc = "Verified genotype topology. Model evidence is strong."
            color = "emerald"
        elif u_val < 0.50:
            tier = "Moderate Confidence"
            desc = "Partial polymorphic variation observed. Adequate model evidence."
            color = "amber"
        else:
            tier = "High Epistemic Uncertainty"
            desc = "Novel or rare mutation combination outside standard training distribution. Phenotypic testing advised."
            color = "rose"
            
        reliability_score = max(0.05, 1.0 - u_val)
        
        return {
            "epistemic_uncertainty": round(u_val, 4),
            "predictive_entropy": round(norm_entropy, 4),
            "reliability_score": round(reliability_score, 4),
            "reliability_tier": tier,
            "clinical_guidance": desc,
            "badge_color": color
        }

class EvidentialLoss(nn.Module):
    """
    Dirichlet Evidential Loss function (Sensoy et al., 2018).
    Combines expected mean squared error under Dirichlet with KL divergence regularizer.
    """
    def __init__(self, num_classes: int = 3, kl_weight: float = 0.2):
        super().__init__()
        self.num_classes = num_classes
        self.kl_weight = kl_weight

    def forward(self, alpha: torch.Tensor, target: torch.Tensor, epoch: int = 1) -> torch.Tensor:
        """
        Args:
          alpha: (B, K) Dirichlet parameters
          target: (B,) class indices or (B, K) one-hot labels
        """
        if target.dim() == 1:
            target_one_hot = F.one_hot(target, num_classes=self.num_classes).float()
        else:
            target_one_hot = target.float()

        S = torch.sum(alpha, dim=-1, keepdim=True)
        p = alpha / S
        
        # Expected Mean Squared Error under Dirichlet
        err = (target_one_hot - p) ** 2
        var = p * (1 - p) / (S + 1)
        loss_mse = torch.sum(err + var, dim=-1).mean()
        
        # KL Divergence regularizer against uniform Dirichlet prior Dir(1)
        alpha_tilde = target_one_hot + (1.0 - target_one_hot) * alpha
        S_tilde = torch.sum(alpha_tilde, dim=-1, keepdim=True)
        
        kl = torch.lgamma(S_tilde) - torch.sum(torch.lgamma(alpha_tilde), dim=-1, keepdim=True)
        kl = kl - torch.lgamma(torch.tensor(float(self.num_classes), device=alpha.device))
        kl = kl + torch.sum((alpha_tilde - 1.0) * (torch.special.psi(alpha_tilde) - torch.special.psi(S_tilde)), dim=-1, keepdim=True)
        loss_kl = kl.mean()
        
        annealing_coef = min(1.0, float(epoch) / 10.0)
        return loss_mse + (annealing_coef * self.kl_weight) * loss_kl
