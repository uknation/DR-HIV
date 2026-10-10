#!/usr/bin/env python3
"""
HIV Drug Resistance Dataset Preprocessing Pipeline.
Processes genuine Stanford HIVdb isolate datasets (PI, NRTI, NNRTI, INSTI, Capsid)
into standardized feature matrices for Tabular Machine Learning (XGBoost, CatBoost)
and sequence arrays for Deep Learning (1D-CNN, ESM-2 Transformer, Evidential, Epistatic).

Extensible design: allows adding future dataset batches seamlessly via CLI or programmatic API.
"""

import os
import sys
import csv
import json
import math
import shutil
import argparse
from datetime import datetime
from typing import Dict, List, Tuple, Set, Any, Optional

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.deep_learning.sequence_tokenizer import (
    parse_stanford_columns,
    reconstruct_sequence,
    REFERENCE_SEQUENCES,
    HXB2_PR,
    HXB2_RT,
    HXB2_IN,
    HXB2_CA
)

DEFAULT_DATA_DIR = os.path.join(PROJECT_ROOT, "ml", "data")

# Comprehensive Clinical Cutoffs & Configuration for all 25 Antiretroviral Drugs across 5 Classes
DATASET_CONFIGS = {
    "PI": {
        "class_name": "Protease Inhibitors (PI)",
        "gene_type": "PR",
        "seq_len": 99,
        "raw_file": "PI.csv",
        "processed_file": "PI_DataSet_processed.csv",
        "sequence_file": "PI_sequences.csv",
        "drugs": ["FPV", "ATV", "IDV", "LPV", "NFV", "SQV", "TPV", "DRV"],
        "cutoffs": {
            "FPV": 1.5,
            "ATV": 3.0,
            "IDV": 3.0,
            "LPV": 3.0,
            "NFV": 3.0,
            "SQV": 3.0,
            "TPV": 3.0,
            "DRV": 3.0
        }
    },
    "NRTI": {
        "class_name": "Nucleoside Reverse Transcriptase Inhibitors (NRTI)",
        "gene_type": "RT",
        "seq_len": 240,
        "raw_file": "NRTI.csv",
        "processed_file": "NRTI_DataSet_processed.csv",
        "sequence_file": "NRTI_sequences.csv",
        "drugs": ["3TC", "ABC", "AZT", "D4T", "DDI", "TDF"],
        "cutoffs": {
            "3TC": 3.0,
            "ABC": 3.0,
            "AZT": 3.0,
            "D4T": 3.0,
            "DDI": 3.0,
            "TDF": 1.5
        }
    },
    "NNRTI": {
        "class_name": "Non-Nucleoside Reverse Transcriptase Inhibitors (NNRTI)",
        "gene_type": "RT",
        "seq_len": 240,
        "raw_file": "NNRTI.csv",
        "processed_file": "NNRTI_DataSet_processed.csv",
        "sequence_file": "NNRTI_sequences.csv",
        "drugs": ["EFV", "NVP", "ETR", "RPV", "DOR"],
        "cutoffs": {
            "EFV": 3.0,
            "NVP": 3.0,
            "ETR": 3.0,
            "RPV": 2.0,
            "DOR": 2.5
        }
    },
    "INSTI": {
        "class_name": "Integrase Strand Transfer Inhibitors (INSTI)",
        "gene_type": "IN",
        "seq_len": 288,
        "raw_file": "INI.csv",
        "processed_file": "INSTI_DataSet_processed.csv",
        "sequence_file": "INSTI_sequences.csv",
        "drugs": ["RAL", "EVG", "DTG", "BIC", "CAB"],
        "cutoffs": {
            "RAL": 2.0,
            "EVG": 2.5,
            "DTG": 3.0,
            "BIC": 2.5,
            "CAB": 2.5
        }
    },
    "CAPSID": {
        "class_name": "Capsid Inhibitor (Capsid)",
        "gene_type": "CA",
        "seq_len": 231,
        "raw_file": "CAI.csv",
        "processed_file": "Capsid_DataSet_processed.csv",
        "sequence_file": "Capsid_sequences.csv",
        "drugs": ["LEN"],
        "cutoffs": {
            "LEN": 3.0
        }
    }
}


def natural_sort_key_pos(col_name: str) -> Tuple[int, str]:
    """Sort key for P<pos>_<val> columns by numerical position then letter."""
    try:
        parts = col_name.split("_", 1)
        pos = int(parts[0][1:])
        val = parts[1] if len(parts) > 1 else ""
        return pos, val
    except Exception:
        return 9999, col_name


def natural_sort_key_mut(mut_name: str) -> Tuple[int, str]:
    """Sort key for mut_<wt><pos><mut> by numerical position."""
    try:
        token = mut_name.replace("mut_", "")
        # Extract numerical position from token like D30N, M184V, T69Ins, etc.
        import re
        match = re.search(r'\d+', token)
        if match:
            pos = int(match.group(0))
            return pos, token
        return 9999, token
    except Exception:
        return 9999, mut_name


class StanfordDatasetPreprocessor:
    """
    Modular Preprocessor for Stanford HIVdb genotype-phenotype isolate datasets.
    Generates tabular feature matrices (P-onehot, mut-tokens, binary labels)
    and sequence representations with log-fold-change annotations.
    """

    def __init__(self, data_dir: str = DEFAULT_DATA_DIR):
        self.data_dir = data_dir

    def backup_legacy_file(self, filename: str, backup_suffix: str = "_legacy_backup"):
        """Safely creates a backup copy of an existing file if not already backed up."""
        src_path = os.path.join(self.data_dir, filename)
        if os.path.exists(src_path):
            base, ext = os.path.splitext(filename)
            backup_name = f"{base}{backup_suffix}{ext}"
            dst_path = os.path.join(self.data_dir, backup_name)
            if not os.path.exists(dst_path):
                shutil.copy2(src_path, dst_path)
                print(f"  [BACKUP] Created backup: {backup_name}")

    def preprocess_dataset(
        self,
        group_key: str,
        config: Dict[str, Any],
        custom_raw_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes a single drug group dataset.
        Returns detailed summary metrics and saves tabular & sequence CSV files.
        """
        raw_file = custom_raw_path or os.path.join(self.data_dir, config["raw_file"])
        if not os.path.exists(raw_file):
            raise FileNotFoundError(f"Raw dataset file not found: {raw_file}")

        print(f"\n=======================================================")
        print(f"  Preprocessing: {config['class_name']} ({config['gene_type']})")
        print(f"  Raw Source: {os.path.basename(raw_file)}")
        print(f"  Target Drugs: {', '.join(config['drugs'])}")
        print(f"=======================================================")

        # Backup existing target processed file if present
        self.backup_legacy_file(config["processed_file"])

        # 1. Read Raw CSV
        with open(raw_file, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            raw_rows = list(reader)

        total_samples = len(raw_rows)
        print(f"  Loaded {total_samples} raw isolate records.")

        drugs = config["drugs"]
        cutoffs = config["cutoffs"]
        gene_type = config["gene_type"]
        seq_len = config["seq_len"]

        # Identify all position columns P1...Pn in header
        first_row = raw_rows[0]
        pos_cols = [k for k in first_row.keys() if k.startswith("P") and k[1:].isdigit()]
        pos_cols.sort(key=lambda k: int(k[1:]))

        # 2. First Pass: Collect all observed single-character amino acid variants per position
        # and all unique mutation tokens from CompMutList
        observed_p_variants: Set[str] = set()
        observed_mut_tokens: Set[str] = set()

        for row in raw_rows:
            # Position variants
            for p_col in pos_cols:
                raw_val = row.get(p_col, "").strip()
                if not raw_val or raw_val in [".", "NA", "null"]:
                    continue
                # For each single character in cell (handles mixtures like 'RK' -> 'P41_R', 'P41_K')
                for char in raw_val:
                    if char != ".":
                        observed_p_variants.add(f"{p_col}_{char}")

            # Mutation tokens
            comp_muts = row.get("CompMutList", "")
            if comp_muts and comp_muts.strip() not in ["", "NA", "None", "NULL"]:
                for token in comp_muts.split(","):
                    clean_tok = token.strip()
                    if clean_tok and clean_tok not in ["NULL", "None", "NA"]:
                        observed_mut_tokens.add(clean_tok)

        # Sort columns systematically
        sorted_p_cols = sorted(list(observed_p_variants), key=natural_sort_key_pos)
        sorted_mut_cols = sorted([f"mut_{t}" for t in observed_mut_tokens], key=natural_sort_key_mut)

        print(f"  Feature dimensions extracted:")
        print(f"    - Position-specific features (P*): {len(sorted_p_cols)}")
        print(f"    - Mutation token features (mut_*): {len(sorted_mut_cols)}")
        print(f"    - Total Tabular Features: {len(sorted_p_cols) + len(sorted_mut_cols)}")

        # 3. Second Pass: Build Tabular and Sequence Records
        tabular_records: List[Dict[str, Any]] = []
        sequence_records: List[Dict[str, Any]] = []

        drug_stats: Dict[str, Dict[str, Any]] = {
            d: {"tested": 0, "resistant": 0, "susceptible": 0, "cutoff": cutoffs[d]}
            for d in drugs
        }

        for row_idx, row in enumerate(raw_rows):
            seq_id = row.get("SeqID", str(row_idx + 1))

            # --- Target Evaluation ---
            drug_res_dict = {}
            drug_log_fc_dict = {}
            drug_tested_dict = {}
            drug_raw_fc_dict = {}

            for d in drugs:
                raw_val = row.get(d, "").strip()
                cutoff = cutoffs[d]
                if raw_val and raw_val not in ["NA", "", "null", "None"]:
                    try:
                        fc = float(raw_val)
                        is_res = 1 if fc >= cutoff else 0
                        log_fc = round(float(math.log10(max(1.0, fc))), 3)
                        drug_res_dict[f"{d}_res"] = is_res
                        drug_log_fc_dict[f"{d}_log_fc"] = log_fc
                        drug_tested_dict[f"{d}_tested"] = 1
                        drug_raw_fc_dict[f"{d}_raw_fc"] = fc
                        drug_stats[d]["tested"] += 1
                        if is_res:
                            drug_stats[d]["resistant"] += 1
                        else:
                            drug_stats[d]["susceptible"] += 1
                    except ValueError:
                        # Non-numeric fallback
                        drug_res_dict[f"{d}_res"] = 0
                        drug_log_fc_dict[f"{d}_log_fc"] = 0.0
                        drug_tested_dict[f"{d}_tested"] = 0
                        drug_raw_fc_dict[f"{d}_raw_fc"] = "NA"
                else:
                    # Missing measurement (unphenotyped in this isolate)
                    drug_res_dict[f"{d}_res"] = 0
                    drug_log_fc_dict[f"{d}_log_fc"] = 0.0
                    drug_tested_dict[f"{d}_tested"] = 0
                    drug_raw_fc_dict[f"{d}_raw_fc"] = "NA"

            # --- Full Amino Acid Sequence Reconstruction ---
            if pos_cols:
                reconstructed_seq = parse_stanford_columns(row, gene_type=gene_type)
            else:
                reconstructed_seq = reconstruct_sequence(row.get("CompMutList", ""), gene_type=gene_type)

            # Ensure expected domain length
            if len(reconstructed_seq) < seq_len:
                ref = REFERENCE_SEQUENCES.get(gene_type, "")
                reconstructed_seq = reconstructed_seq + ref[len(reconstructed_seq):seq_len]
            elif len(reconstructed_seq) > seq_len:
                reconstructed_seq = reconstructed_seq[:seq_len]

            # --- Row Mutation Indicators ---
            row_mut_set: Set[str] = set()
            comp_muts = row.get("CompMutList", "")
            if comp_muts and comp_muts.strip() not in ["", "NA", "None", "NULL"]:
                for t in comp_muts.split(","):
                    tok = t.strip()
                    if tok and tok not in ["NULL", "None", "NA"]:
                        row_mut_set.add(f"mut_{tok}")

            # --- Build Tabular Row (Pure Numeric) ---
            tab_row: Dict[str, Any] = {"SeqID": seq_id}
            # Drug binary targets
            for d in drugs:
                tab_row[f"{d}_res"] = drug_res_dict[f"{d}_res"]

            # Position features
            for p_feat in sorted_p_cols:
                p_col, char = p_feat.split("_", 1)
                cell_val = row.get(p_col, "")
                tab_row[p_feat] = 1 if (char in cell_val and cell_val != ".") else 0

            # Mutation features
            for m_feat in sorted_mut_cols:
                tab_row[m_feat] = 1 if m_feat in row_mut_set else 0

            tabular_records.append(tab_row)

            # --- Build Sequence Record (for Deep Learning) ---
            seq_row: Dict[str, Any] = {
                "SeqID": seq_id,
                "gene_type": gene_type,
                "reconstructed_sequence": reconstructed_seq,
                "CompMutList": comp_muts if comp_muts != "NA" else ""
            }
            # Add drug annotations
            for d in drugs:
                seq_row[f"{d}_res"] = drug_res_dict[f"{d}_res"]
                seq_row[f"{d}_log_fc"] = drug_log_fc_dict[f"{d}_log_fc"]
                seq_row[f"{d}_raw_fc"] = drug_raw_fc_dict[f"{d}_raw_fc"]
                seq_row[f"{d}_tested"] = drug_tested_dict[f"{d}_tested"]

            sequence_records.append(seq_row)

        # 4. Save Processed Tabular File
        proc_out_path = os.path.join(self.data_dir, config["processed_file"])
        tab_fieldnames = ["SeqID"] + [f"{d}_res" for d in drugs] + sorted_p_cols + sorted_mut_cols
        with open(proc_out_path, "w", newline="", encoding="utf-8") as f_out:
            writer = csv.DictWriter(f_out, fieldnames=tab_fieldnames)
            writer.writeheader()
            writer.writerows(tabular_records)

        print(f"  [SAVED] Tabular ML Dataset: {config['processed_file']}")
        print(f"          Rows: {len(tabular_records)}, Columns: {len(tab_fieldnames)}")

        # 5. Save Sequence Deep Learning File
        seq_out_path = os.path.join(self.data_dir, config["sequence_file"])
        seq_fieldnames = (
            ["SeqID", "gene_type", "reconstructed_sequence", "CompMutList"] +
            [f"{d}_res" for d in drugs] +
            [f"{d}_log_fc" for d in drugs] +
            [f"{d}_raw_fc" for d in drugs] +
            [f"{d}_tested" for d in drugs]
        )
        with open(seq_out_path, "w", newline="", encoding="utf-8") as f_out:
            writer = csv.DictWriter(f_out, fieldnames=seq_fieldnames)
            writer.writeheader()
            writer.writerows(sequence_records)

        print(f"  [SAVED] Deep Learning Sequence Dataset: {config['sequence_file']}")
        print(f"          Rows: {len(sequence_records)}, Columns: {len(seq_fieldnames)}")

        # Print per-drug class balance
        print(f"  Phenotypic Resistance Class Balances:")
        for d in drugs:
            st = drug_stats[d]
            rate = (st["resistant"] / max(1, st["tested"])) * 100
            print(f"    - {d:4s} (cutoff {st['cutoff']}x): tested={st['tested']}, res={st['resistant']} ({rate:.1f}%), susc={st['susceptible']}")

        return {
            "group_key": group_key,
            "class_name": config["class_name"],
            "gene_type": gene_type,
            "seq_len": seq_len,
            "samples_count": total_samples,
            "drugs": drugs,
            "drug_stats": drug_stats,
            "position_features_count": len(sorted_p_cols),
            "mutation_features_count": len(sorted_mut_cols),
            "total_tabular_columns": len(tab_fieldnames),
            "tabular_file": config["processed_file"],
            "sequence_file": config["sequence_file"]
        }

    def create_master_sequence_dataset(
        self,
        summaries: Dict[str, Dict[str, Any]]
    ) -> str:
        """
        Creates a unified cross-class master dataset (all_25_drugs_sequences.csv)
        containing all 6,574 clinical isolate sequences with drug susceptibility labels.
        """
        master_path = os.path.join(self.data_dir, "all_25_drugs_sequences.csv")
        all_drugs_ordered = []
        for grp, cfg in DATASET_CONFIGS.items():
            all_drugs_ordered.extend(cfg["drugs"])

        master_fieldnames = (
            ["SeqID", "class_group", "gene_type", "reconstructed_sequence", "CompMutList"] +
            [f"{d}_res" for d in all_drugs_ordered] +
            [f"{d}_log_fc" for d in all_drugs_ordered] +
            [f"{d}_tested" for d in all_drugs_ordered]
        )

        total_master_rows = 0
        with open(master_path, "w", newline="", encoding="utf-8") as f_out:
            writer = csv.DictWriter(f_out, fieldnames=master_fieldnames)
            writer.writeheader()

            for grp, cfg in DATASET_CONFIGS.items():
                seq_file_path = os.path.join(self.data_dir, cfg["sequence_file"])
                if not os.path.exists(seq_file_path):
                    continue

                with open(seq_file_path, "r", encoding="utf-8") as f_in:
                    reader = csv.DictReader(f_in)
                    for r in reader:
                        master_row: Dict[str, Any] = {
                            "SeqID": f"{grp}_{r['SeqID']}",
                            "class_group": grp,
                            "gene_type": r["gene_type"],
                            "reconstructed_sequence": r["reconstructed_sequence"],
                            "CompMutList": r["CompMutList"]
                        }
                        # Populate all 25 drug indicators (fill 0 for drugs outside this class)
                        for d in all_drugs_ordered:
                            master_row[f"{d}_res"] = r.get(f"{d}_res", 0)
                            master_row[f"{d}_log_fc"] = r.get(f"{d}_log_fc", 0.0)
                            master_row[f"{d}_tested"] = r.get(f"{d}_tested", 0)

                        writer.writerow(master_row)
                        total_master_rows += 1

        print(f"\n[MASTER] Generated unified multi-class sequence dataset: all_25_drugs_sequences.csv")
        print(f"         Total Isolates: {total_master_rows} across 25 drugs.")
        return master_path

    def process_all_datasets(self) -> Dict[str, Any]:
        """Runs complete preprocessing across all 5 therapeutic classes."""
        print("\n=======================================================")
        print("  HIV-1 Clinical Resistance Dataset Preprocessor       ")
        print("  Processing 5 Therapeutic Classes & 25 Clinical Drugs  ")
        print(f"  Working Directory: {self.data_dir}                   ")
        print("=======================================================\n")

        summaries = {}
        for group_key, cfg in DATASET_CONFIGS.items():
            summary = self.preprocess_dataset(group_key, cfg)
            summaries[group_key] = summary

        # Create master unified dataset
        master_file = self.create_master_sequence_dataset(summaries)

        # Save metadata manifest
        manifest = {
            "title": "Stanford HIVdb Clinical Genotype-Phenotype Resistance Manifest",
            "version": "v2.0-genuine-stanford-clinical",
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_drug_classes": len(DATASET_CONFIGS),
            "total_antiretroviral_drugs": 25,
            "total_isolate_samples": sum(s["samples_count"] for s in summaries.values()),
            "classes": summaries,
            "unified_master_dataset": os.path.basename(master_file),
            "guideline_standards": "Stanford HIVdb 9.5 / WHO 2024 / ANRS v35"
        }

        manifest_path = os.path.join(self.data_dir, "datasets_manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as f_man:
            json.dump(manifest, f_man, indent=2)

        print(f"\n[MANIFEST] Saved complete dataset registry to {manifest_path}")
        print("\n[SUCCESS] All datasets preprocessed and ready for Tabular ML & Deep ML training!\n")
        return manifest


def main():
    parser = argparse.ArgumentParser(description="Preprocess HIV Genotype-Phenotype Datasets for ML/Deep ML")
    parser.add_argument("--data-dir", default=DEFAULT_DATA_DIR, help="Path to ml/data folder")
    parser.add_argument("--group", choices=["PI", "NRTI", "NNRTI", "INSTI", "CAPSID", "ALL"], default="ALL",
                        help="Specific drug group to process, or ALL")
    args = parser.parse_args()

    preprocessor = StanfordDatasetPreprocessor(data_dir=args.data_dir)

    if args.group == "ALL":
        preprocessor.process_all_datasets()
    else:
        cfg = DATASET_CONFIGS[args.group]
        preprocessor.preprocess_dataset(args.group, cfg)


if __name__ == "__main__":
    main()
