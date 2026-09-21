"""
1D Convolutional Neural Network (1D-CNN) for Sequence-Aware HIV-1 Drug Resistance Modeling.
Captures spatial amino acid interactions and contiguous structural motifs.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import List, Dict, Tuple

try:
    from sequence_tokenizer import VOCAB, PAD_IDX
except ImportError:
    from ml.deep_learning.sequence_tokenizer import VOCAB, PAD_IDX

class ConvBlock(nn.Module):
    """Multi-scale 1D Convolutional Block with Residual Connections."""
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int, dropout: float = 0.2):
        super().__init__()
        padding = kernel_size // 2
        self.conv1 = nn.Conv1d(in_channels, out_channels, kernel_size=kernel_size, padding=padding)
        self.bn1 = nn.BatchNorm1d(out_channels)
        self.conv2 = nn.Conv1d(out_channels, out_channels, kernel_size=kernel_size, padding=padding)
        self.bn2 = nn.BatchNorm1d(out_channels)
        self.dropout = nn.Dropout(dropout)
        
        # Residual projection if channel dimensions differ
        self.residual = nn.Conv1d(in_channels, out_channels, kernel_size=1) if in_channels != out_channels else nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        res = self.residual(x)
        out = F.gelu(self.bn1(self.conv1(x)))
        out = self.dropout(out)
        out = self.bn2(self.conv2(out))
        out = F.gelu(out + res)
        return out

class HIV1DCNN(nn.Module):
    """
    Sequence-Aware 1D-CNN for HIV-1 Protease & Reverse Transcriptase Resistance Prediction.
    
    Architecture:
      - Learnable Residue Embedding Layer (vocab_size -> embed_dim)
      - Parallel Multi-Scale Convolutions (k=3 for active site triads, k=5, 7 for flap/hairpin loops)
      - Residual Bottleneck Blocks
      - Dual Global Pooling (AvgPool + MaxPool)
      - Multi-Task Drug Classification and Log-Fold-Change Regression Heads
    """
    def __init__(
        self,
        num_drugs: int,
        drug_names: List[str],
        gene_type: str = "PR",
        vocab_size: int = len(VOCAB),
        embed_dim: int = 64,
        hidden_dim: int = 128,
        dropout: float = 0.25
    ):
        super().__init__()
        self.num_drugs = num_drugs
        self.drug_names = drug_names
        self.gene_type = gene_type
        
        # Amino acid embedding
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=PAD_IDX)
        
        # Multi-scale initial convolutions
        # k=3: local contiguous codons (catalytic triads)
        # k=5: secondary structure turns
        # k=7: longer loop motifs
        self.branch3 = nn.Sequential(
            nn.Conv1d(embed_dim, hidden_dim // 3, kernel_size=3, padding=1),
            nn.BatchNorm1d(hidden_dim // 3),
            nn.GELU()
        )
        self.branch5 = nn.Sequential(
            nn.Conv1d(embed_dim, hidden_dim // 3, kernel_size=5, padding=2),
            nn.BatchNorm1d(hidden_dim // 3),
            nn.GELU()
        )
        self.branch7 = nn.Sequential(
            nn.Conv1d(embed_dim, hidden_dim - 2 * (hidden_dim // 3), kernel_size=7, padding=3),
            nn.BatchNorm1d(hidden_dim - 2 * (hidden_dim // 3)),
            nn.GELU()
        )
        
        # Deep Residual Convolutional Blocks
        self.block1 = ConvBlock(hidden_dim, hidden_dim * 2, kernel_size=3, dropout=dropout)
        self.pool1 = nn.MaxPool1d(2)
        
        self.block2 = ConvBlock(hidden_dim * 2, hidden_dim * 2, kernel_size=5, dropout=dropout)
        self.block3 = ConvBlock(hidden_dim * 2, hidden_dim * 4, kernel_size=3, dropout=dropout)
        
        # Feature representation dimension: (hidden_dim * 4) * 2 (avg + max pooling)
        feat_dim = hidden_dim * 4 * 2
        
        self.fc_shared = nn.Sequential(
            nn.Linear(feat_dim, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(dropout)
        )
        
        # Head 1: Binary Classification (0: Susceptible, 1: Resistant) for each drug
        self.classifier_head = nn.Linear(256, num_drugs)
        
        # Head 2: Continuous Log10(Fold-Change) Regression for each drug
        self.regression_head = nn.Linear(256, num_drugs)
        
        # Storage for Grad-CAM activations
        self.gradients = None
        self.activations = None

    def _hook_activations(self, module, input, output):
        self.activations = output

    def _hook_gradients(self, module, grad_in, grad_out):
        self.gradients = grad_out[0]

    def register_cam_hooks(self):
        """Registers backward and forward hooks on the final convolutional layer for Grad-CAM."""
        self.block3.conv2.register_forward_hook(self._hook_activations)
        self.block3.conv2.register_full_backward_hook(self._hook_gradients)

    def extract_features(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        x: (batch_size, seq_len)
        Returns: (pooled_features, spatial_conv_maps)
        """
        # (batch_size, seq_len, embed_dim) -> (batch_size, embed_dim, seq_len)
        emb = self.embedding(x).transpose(1, 2)
        
        # Multi-scale branches
        out3 = self.branch3(emb)
        out5 = self.branch5(emb)
        out7 = self.branch7(emb)
        multi_scale = torch.cat([out3, out5, out7], dim=1)
        
        # Conv blocks
        h = self.block1(multi_scale)
        h = self.pool1(h)
        h = self.block2(h)
        conv_maps = self.block3(h) # (batch_size, channels, reduced_len)
        
        # Dual Global Pooling
        avg_pool = F.adaptive_avg_pool1d(conv_maps, 1).squeeze(-1)
        max_pool = F.adaptive_max_pool1d(conv_maps, 1).squeeze(-1)
        pooled = torch.cat([avg_pool, max_pool], dim=1)
        
        features = self.fc_shared(pooled)
        return features, conv_maps

    def forward(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Forward pass.
        Returns:
          - logits: raw classification logits (batch_size, num_drugs)
          - probabilities: sigmoid probabilities (batch_size, num_drugs)
          - fold_change_pred: predicted log10 fold-change (batch_size, num_drugs)
          - features: extracted 256-dim feature vectors
        """
        features, _ = self.extract_features(x)
        logits = self.classifier_head(features)
        probs = torch.sigmoid(logits)
        log_fc = self.regression_head(features)
        
        return {
            "logits": logits,
            "probabilities": probs,
            "log_fold_change": log_fc,
            "features": features
        }

if __name__ == "__main__":
    drugs = ["FPV", "ATV", "IDV", "LPV", "NFV", "SQV", "TPV", "DRV"]
    model = HIV1DCNN(num_drugs=len(drugs), drug_names=drugs, gene_type="PR")
    
    # Mock batch of 4 protease sequences (99 AA)
    dummy_input = torch.randint(0, len(VOCAB), (4, 99))
    out = model(dummy_input)
    
    print("HIV1DCNN initialized successfully!")
    print(f"Probabilities shape: {out['probabilities'].shape}")
    print(f"Log Fold-Change shape: {out['log_fold_change'].shape}")
    print(f"Extracted features shape: {out['features'].shape}")
