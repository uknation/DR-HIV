"""
Evolutionary Scale Protein Language Model (ESM-2 / ProtBERT) Transfer Learning Engine.
Extracts deep sequence embeddings and residue-residue attention contact maps.
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import List, Dict, Optional, Tuple

try:
    from sequence_tokenizer import VOCAB, PAD_IDX, tokenize_sequence, batch_tokenize
    from models_biophysical import BiophysicalResidueEmbedding
    from models_spatial import SpatialContactBias
    from models_multidrug_attention import DrugSequenceCrossAttention, ALL_25_DRUGS
    from models_moe import SparseMoEFFN
except ImportError:
    try:
        from .sequence_tokenizer import VOCAB, PAD_IDX, tokenize_sequence, batch_tokenize
        from .models_biophysical import BiophysicalResidueEmbedding
        from .models_spatial import SpatialContactBias
        from .models_multidrug_attention import DrugSequenceCrossAttention, ALL_25_DRUGS
        from .models_moe import SparseMoEFFN
    except ImportError:
        from ml.deep_learning.sequence_tokenizer import VOCAB, PAD_IDX, tokenize_sequence, batch_tokenize
        from ml.deep_learning.models_biophysical import BiophysicalResidueEmbedding
        from ml.deep_learning.models_spatial import SpatialContactBias
        from ml.deep_learning.models_multidrug_attention import DrugSequenceCrossAttention, ALL_25_DRUGS
        from ml.deep_learning.models_moe import SparseMoEFFN

class RotaryPositionalEmbedding(nn.Module):
    """Rotary Positional Embeddings (RoPE) for Protein Sequence Transformers."""
    def __init__(self, dim: int, max_seq_len: int = 512):
        super().__init__()
        inv_freq = 1.0 / (10000 ** (torch.arange(0, dim, 2).float() / dim))
        t = torch.arange(max_seq_len, dtype=torch.float)
        freqs = torch.einsum("i,j->ij", t, inv_freq)
        emb = torch.cat((freqs, freqs), dim=-1)
        self.register_buffer("cos_cached", emb.cos())
        self.register_buffer("sin_cached", emb.sin())

    def _rotate_half(self, x: torch.Tensor) -> torch.Tensor:
        x1, x2 = x[..., :x.shape[-1] // 2], x[..., x.shape[-1] // 2:]
        return torch.cat((-x2, x1), dim=-1)

    def forward(self, q: torch.Tensor, k: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        seq_len = q.shape[1]
        cos = self.cos_cached[:seq_len, :].unsqueeze(0).unsqueeze(2) # (1, seq_len, 1, dim)
        sin = self.sin_cached[:seq_len, :].unsqueeze(0).unsqueeze(2)
        q_rot = (q * cos) + (self._rotate_half(q) * sin)
        k_rot = (k * cos) + (self._rotate_half(k) * sin)
        return q_rot, k_rot

class LoRALinear(nn.Module):
    """Low-Rank Adaptation (LoRA) projection layer in pure PyTorch."""
    def __init__(self, in_features: int, out_features: int, r: int = 8, lora_alpha: float = 16.0, dropout: float = 0.05):
        super().__init__()
        self.linear = nn.Linear(in_features, out_features)
        self.r = r
        self.lora_alpha = lora_alpha
        self.scaling = lora_alpha / r if r > 0 else 1.0
        
        if r > 0:
            self.lora_A = nn.Parameter(torch.zeros(r, in_features))
            self.lora_B = nn.Parameter(torch.zeros(out_features, r))
            self.lora_dropout = nn.Dropout(p=dropout) if dropout > 0.0 else nn.Identity()
            nn.init.kaiming_uniform_(self.lora_A, a=math.sqrt(5))
            nn.init.zeros_(self.lora_B)
        else:
            self.lora_A = None
            self.lora_B = None

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        result = self.linear(x)
        if self.r > 0:
            lora_out = self.lora_dropout(x) @ self.lora_A.T @ self.lora_B.T
            result = result + lora_out * self.scaling
        return result

class ESMTransformerLayer(nn.Module):
    """Single ESM-2 Transformer Encoder Layer with multi-head attention, 3D spatial bias, and optional MoE."""
    def __init__(
        self,
        embed_dim: int = 320,
        num_heads: int = 20,
        ffn_dim: int = 1280,
        dropout: float = 0.1,
        use_lora: bool = False,
        lora_r: int = 8,
        use_moe: bool = False,
        num_experts: int = 4
    ):
        super().__init__()
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads
        self.use_moe = use_moe
        
        if use_lora and lora_r > 0:
            self.q_proj = LoRALinear(embed_dim, embed_dim, r=lora_r)
            self.k_proj = nn.Linear(embed_dim, embed_dim)
            self.v_proj = LoRALinear(embed_dim, embed_dim, r=lora_r)
        else:
            self.q_proj = nn.Linear(embed_dim, embed_dim)
            self.k_proj = nn.Linear(embed_dim, embed_dim)
            self.v_proj = nn.Linear(embed_dim, embed_dim)
        self.out_proj = nn.Linear(embed_dim, embed_dim)
        
        self.rope = RotaryPositionalEmbedding(self.head_dim)
        self.norm1 = nn.LayerNorm(embed_dim)
        self.norm2 = nn.LayerNorm(embed_dim)
        
        if use_moe:
            self.ffn = SparseMoEFFN(embed_dim=embed_dim, ffn_dim=ffn_dim, num_experts=num_experts, dropout=dropout)
        else:
            self.ffn = nn.Sequential(
                nn.Linear(embed_dim, ffn_dim),
                nn.GELU(),
                nn.Dropout(dropout),
                nn.Linear(ffn_dim, embed_dim),
                nn.Dropout(dropout)
            )
        self.dropout = nn.Dropout(dropout)
        self.last_attention_weights = None

    def forward(
        self,
        x: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
        spatial_bias: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        # Self-Attention
        residual = x
        norm_x = self.norm1(x)
        B, L, D = norm_x.shape
        
        q = self.q_proj(norm_x).view(B, L, self.num_heads, self.head_dim)
        k = self.k_proj(norm_x).view(B, L, self.num_heads, self.head_dim)
        v = self.v_proj(norm_x).view(B, L, self.num_heads, self.head_dim).transpose(1, 2)
        
        q, k = self.rope(q, k)
        q = q.transpose(1, 2) # (B, num_heads, L, head_dim)
        k = k.transpose(1, 2) # (B, num_heads, L, head_dim)
        
        # Merge spatial 3D distance bias with sequence mask
        attn_mask = None
        if spatial_bias is not None:
            attn_mask = spatial_bias
            if mask is not None:
                pad_penalty = (~mask.unsqueeze(1).unsqueeze(2).bool()).float() * -10000.0
                attn_mask = attn_mask + pad_penalty
        elif mask is not None:
            attn_mask = mask.unsqueeze(1).unsqueeze(2).bool()
        
        # Fast scaled dot product attention
        attn_out = F.scaled_dot_product_attention(
            q, k, v,
            attn_mask=attn_mask,
            dropout_p=self.dropout.p if self.training else 0.0
        )
        attn_out = attn_out.transpose(1, 2).contiguous().view(B, L, D)
        out = residual + self.dropout(self.out_proj(attn_out))
        
        # Feed-Forward Network (Dense or MoE)
        if self.use_moe:
            ffn_out, _ = self.ffn(self.norm2(out))
            out = out + ffn_out
        else:
            out = out + self.ffn(self.norm2(out))
        return out

class ESM2ProteinEncoder(nn.Module):
    """
    ESM-2 Lightweight Evolutionary Scale Protein Foundation Architecture.
    Ingests full 99 AA Protease or 240 AA RT sequences and extracts contextual protein embeddings.
    Supports Biophysical Multi-Channel Embeddings, 3D Spatial Pocket Biases, and Sparse MoE.
    """
    def __init__(
        self,
        num_layers: int = 4,
        embed_dim: int = 256,
        num_heads: int = 16,
        vocab_size: int = len(VOCAB),
        use_biophysical: bool = False,
        use_spatial: bool = False,
        protein_type: str = "RT",
        seq_len: int = 240,
        use_moe: bool = False
    ):
        super().__init__()
        self.embed_dim = embed_dim
        self.use_biophysical = use_biophysical
        self.use_spatial = use_spatial
        
        if use_biophysical:
            self.embed_tokens = BiophysicalResidueEmbedding(vocab_size=vocab_size, embed_dim=embed_dim, bio_dim=32)
        else:
            self.embed_tokens = nn.Embedding(vocab_size, embed_dim, padding_idx=PAD_IDX)
            
        if use_spatial:
            self.spatial_bias = SpatialContactBias(length=seq_len, protein_type=protein_type)
        else:
            self.spatial_bias = None

        self.layers = nn.ModuleList([
            ESMTransformerLayer(embed_dim=embed_dim, num_heads=num_heads, ffn_dim=embed_dim * 4, use_moe=use_moe)
            for _ in range(num_layers)
        ])
        self.final_norm = nn.LayerNorm(embed_dim)

    def forward(self, tokens: torch.Tensor, mask: Optional[torch.Tensor] = None) -> Dict[str, torch.Tensor]:
        B, L = tokens.shape
        x = self.embed_tokens(tokens)
        
        spatial_b = None
        if self.use_spatial and self.spatial_bias is not None:
            if self.spatial_bias.length == L:
                spatial_b = self.spatial_bias(batch_size=B, num_heads=self.layers[0].num_heads)
            
        for layer in self.layers:
            x = layer(x, mask=mask, spatial_bias=spatial_b)
            
        residue_emb = self.final_norm(x)
        
        # Mean pooling excluding PAD tokens
        if mask is not None:
            mask_expanded = mask.unsqueeze(-1).float()
            seq_emb = (residue_emb * mask_expanded).sum(dim=1) / mask_expanded.sum(dim=1).clamp(min=1.0)
        else:
            seq_emb = residue_emb.mean(dim=1)
            
        # Extract Contact Map from pairwise residue embedding similarity
        norm_res = F.normalize(residue_emb, p=2, dim=-1)
        contact_map = torch.bmm(norm_res, norm_res.transpose(1, 2))
        
        return {
            "residue_embeddings": residue_emb,
            "sequence_embedding": seq_emb,
            "contact_map": contact_map
        }

class ESMResistanceClassifier(nn.Module):
    """
    Fine-Tuned Protein Transformer Head for HIV-1 Drug Resistance Classification.
    Combines ESM-2 sequence embeddings with clinical projection heads and optional Drug Cross-Attention.
    """
    def __init__(
        self,
        num_drugs: int,
        drug_names: List[str],
        embed_dim: int = 256,
        num_layers: int = 4,
        use_biophysical: bool = False,
        use_spatial: bool = False,
        use_multidrug_attention: bool = False,
        protein_type: str = "RT",
        seq_len: int = 240
    ):
        super().__init__()
        self.num_drugs = num_drugs
        self.drug_names = drug_names
        self.use_multidrug_attention = use_multidrug_attention
        
        self.encoder = ESM2ProteinEncoder(
            num_layers=num_layers,
            embed_dim=embed_dim,
            use_biophysical=use_biophysical,
            use_spatial=use_spatial,
            protein_type=protein_type,
            seq_len=seq_len
        )
        
        if use_multidrug_attention:
            self.multidrug_attn = DrugSequenceCrossAttention(embed_dim=embed_dim, drugs=drug_names)
        else:
            self.multidrug_attn = None
        
        self.classifier_head = nn.Sequential(
            nn.Linear(embed_dim, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.GELU(),
            nn.Linear(128, num_drugs)
        )
        
        self.regression_head = nn.Sequential(
            nn.Linear(embed_dim, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.GELU(),
            nn.Linear(128, num_drugs)
        )

    def forward(self, tokens: torch.Tensor, mask: Optional[torch.Tensor] = None) -> Dict[str, torch.Tensor]:
        enc_out = self.encoder(tokens, mask=mask)
        seq_emb = enc_out["sequence_embedding"]
        residue_emb = enc_out["residue_embeddings"]
        
        logits = self.classifier_head(seq_emb)
        probs = torch.sigmoid(logits)
        log_fc = self.regression_head(seq_emb)
        
        result = {
            "logits": logits,
            "probabilities": probs,
            "log_fold_change": log_fc,
            "sequence_embedding": seq_emb,
            "residue_embeddings": residue_emb,
            "contact_map": enc_out["contact_map"]
        }
        
        if self.use_multidrug_attention and self.multidrug_attn is not None:
            drug_contexts, drug_attn_weights = self.multidrug_attn(residue_emb)
            result["drug_contexts"] = drug_contexts
            result["drug_attention_weights"] = drug_attn_weights
            
        return result

if __name__ == "__main__":
    drugs = ["FPV", "ATV", "IDV", "LPV", "NFV", "SQV", "TPV", "DRV"]
    esm_model = ESMResistanceClassifier(num_drugs=len(drugs), drug_names=drugs)
    
    dummy_tokens = torch.randint(0, len(VOCAB), (2, 99))
    out = esm_model(dummy_tokens)
    
    print("ESM-2 Resistance Classifier initialized successfully!")
    print(f"Probabilities shape: {out['probabilities'].shape}")
    print(f"Sequence embedding shape: {out['sequence_embedding'].shape}")
    print(f"Contact map shape: {out['contact_map'].shape}")
