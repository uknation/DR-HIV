"""
Sequence-Aware Deep Learning Package for HIV-1 Drug Resistance.
Includes 1D-CNNs, ESM-2 Protein Transformer embeddings, and 1D Grad-CAM explainability.
"""

import sys
import os

# Allow direct standalone execution (python3 __init__.py) as well as package imports
if __name__ == "__main__" or not __package__:
    pkg_dir = os.path.dirname(os.path.abspath(__file__))
    if pkg_dir not in sys.path:
        sys.path.insert(0, pkg_dir)
    parent_dir = os.path.abspath(os.path.join(pkg_dir, ".."))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

    from sequence_tokenizer import (
        reconstruct_sequence,
        tokenize_sequence,
        batch_tokenize,
        parse_stanford_columns,
        parse_mutation_token,
        HXB2_PR,
        HXB2_RT,
        HXB2_IN,
        HXB2_CA,
        REFERENCE_SEQUENCES
    )
    from models_cnn import HIV1DCNN
    from models_esm import ESM2ProteinEncoder, ESMResistanceClassifier, ESMTransformerLayer, LoRALinear
    from models_evidential import DirichletEvidentialHead, EvidentialUncertaintyEstimator, EvidentialLoss
    from models_epistatic import SurveillanceEpistaticGraph
    from models_biophysical import BiophysicalResidueEmbedding
    from models_spatial import SpatialContactBias
    from models_multidrug_attention import DrugSequenceCrossAttention
    from models_moe import SparseMoEFFN
    from explainability import GradCAM1D, map_cam_to_mutations
    from predict_deep import predict_sequence_aware_resistance
else:
    from .sequence_tokenizer import (
        reconstruct_sequence,
        tokenize_sequence,
        batch_tokenize,
        parse_stanford_columns,
        parse_mutation_token,
        HXB2_PR,
        HXB2_RT,
        HXB2_IN,
        HXB2_CA,
        REFERENCE_SEQUENCES
    )
    from .models_cnn import HIV1DCNN
    from .models_esm import ESM2ProteinEncoder, ESMResistanceClassifier, ESMTransformerLayer, LoRALinear
    from .models_evidential import DirichletEvidentialHead, EvidentialUncertaintyEstimator, EvidentialLoss
    from .models_epistatic import SurveillanceEpistaticGraph
    from .models_biophysical import BiophysicalResidueEmbedding
    from .models_spatial import SpatialContactBias
    from .models_multidrug_attention import DrugSequenceCrossAttention
    from .models_moe import SparseMoEFFN
    from .explainability import GradCAM1D, map_cam_to_mutations
    from .predict_deep import predict_sequence_aware_resistance

__all__ = [
    "reconstruct_sequence",
    "tokenize_sequence",
    "batch_tokenize",
    "parse_stanford_columns",
    "parse_mutation_token",
    "HIV1DCNN",
    "ESM2ProteinEncoder",
    "ESMResistanceClassifier",
    "ESMTransformerLayer",
    "LoRALinear",
    "DirichletEvidentialHead",
    "EvidentialUncertaintyEstimator",
    "EvidentialLoss",
    "SurveillanceEpistaticGraph",
    "BiophysicalResidueEmbedding",
    "SpatialContactBias",
    "DrugSequenceCrossAttention",
    "SparseMoEFFN",
    "GradCAM1D",
    "map_cam_to_mutations",
    "predict_sequence_aware_resistance",
    "HXB2_PR",
    "HXB2_RT",
    "HXB2_IN",
    "HXB2_CA",
    "REFERENCE_SEQUENCES"
]

if __name__ == "__main__":
    print("\n✅ Sequence-Aware Deep Learning Package loaded successfully!")
    print(f"📦 Exported components ({len(__all__)}):")
    for item in __all__:
        print(f"   • {item}")
    print("\n🚀 Ready for clinical sequence-aware resistance inference.")
