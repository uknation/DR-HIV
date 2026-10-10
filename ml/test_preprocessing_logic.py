import os
import sys
import csv
import math
from typing import Dict, List, Tuple, Set, Any

# Ensure project root in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from deep_learning.sequence_tokenizer import parse_stanford_columns, reconstruct_sequence, REFERENCE_SEQUENCES

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

CLASS_CONFIGS = {
    "PI": {
        "raw_file": "PI.csv",
        "processed_file": "PI_DataSet_processed.csv",
        "sequence_file": "PI_sequences.csv",
        "gene": "PR",
        "seq_len": 99,
        "drugs": ["FPV", "ATV", "IDV", "LPV", "NFV", "SQV", "TPV", "DRV"],
        "cutoffs": {
            "FPV": 1.5, "ATV": 3.0, "IDV": 3.0, "LPV": 3.0,
            "NFV": 3.0, "SQV": 3.0, "TPV": 3.0, "DRV": 3.0
        }
    },
    "NRTI": {
        "raw_file": "NRTI.csv",
        "processed_file": "NRTI_DataSet_processed.csv",
        "sequence_file": "NRTI_sequences.csv",
        "gene": "RT",
        "seq_len": 240,
        "drugs": ["3TC", "ABC", "AZT", "D4T", "DDI", "TDF"],
        "cutoffs": {
            "3TC": 3.0, "ABC": 3.0, "AZT": 3.0, "D4T": 3.0,
            "DDI": 3.0, "TDF": 1.5
        }
    },
    "NNRTI": {
        "raw_file": "NNRTI.csv",
        "processed_file": "NNRTI_DataSet_processed.csv",
        "sequence_file": "NNRTI_sequences.csv",
        "gene": "RT",
        "seq_len": 240,
        "drugs": ["EFV", "NVP", "ETR", "RPV", "DOR"],
        "cutoffs": {
            "EFV": 3.0, "NVP": 3.0, "ETR": 3.0, "RPV": 2.0, "DOR": 2.5
        }
    },
    "INSTI": {
        "raw_file": "INI.csv",
        "processed_file": "INSTI_DataSet_processed.csv",
        "sequence_file": "INSTI_sequences.csv",
        "gene": "IN",
        "seq_len": 288,
        "drugs": ["RAL", "EVG", "DTG", "BIC", "CAB"],
        "cutoffs": {
            "RAL": 2.0, "EVG": 2.5, "DTG": 3.0, "BIC": 2.5, "CAB": 2.5
        }
    },
    "CAPSID": {
        "raw_file": "CAI.csv",
        "processed_file": "Capsid_DataSet_processed.csv",
        "sequence_file": "Capsid_sequences.csv",
        "gene": "CA",
        "seq_len": 231,
        "drugs": ["LEN"],
        "cutoffs": {
            "LEN": 3.0
        }
    }
}

print("Testing configurations and data reading...")
for grp, cfg in CLASS_CONFIGS.items():
    raw_path = os.path.join(DATA_DIR, cfg["raw_file"])
    assert os.path.exists(raw_path), f"Missing {raw_path}"
    with open(raw_path) as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    print(f"[{grp}] {cfg['raw_file']}: {len(rows)} samples, drugs: {cfg['drugs']}")
print("\nAll 5 raw dataset files confirmed.")
