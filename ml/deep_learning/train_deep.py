"""
Training Pipeline for Sequence-Aware Deep Learning Models (1D-CNN and ESM-2 Transformer).
Trains on Stanford University clinical genotype-phenotype datasets.
"""

import os
import sys
import json
import datetime
import argparse
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, mean_squared_error

# Add paths
ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(ML_DIR)
DEEP_DIR = os.path.join(ML_DIR, "deep_learning")
DEEP_MODELS_DIR = os.path.join(ML_DIR, "deep_models")
os.makedirs(DEEP_MODELS_DIR, exist_ok=True)

for p in [ML_DIR, PROJECT_ROOT, DEEP_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from sequence_tokenizer import parse_stanford_columns, tokenize_sequence, reconstruct_sequence
from models_cnn import HIV1DCNN
from models_esm import ESMResistanceClassifier

class HIVSequenceDataset(Dataset):
    """PyTorch Dataset for raw amino acid sequences and drug resistance labels."""
    def __init__(self, sequences: List[str], labels: np.ndarray, log_fold_changes: np.ndarray, max_len: int = 100):
        self.sequences = sequences
        self.labels = torch.tensor(labels, dtype=torch.float32)
        self.log_fc = torch.tensor(log_fold_changes, dtype=torch.float32)
        self.max_len = max_len
        self.tokenized = [tokenize_sequence(s, max_len=max_len) for s in sequences]

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        return {
            "tokens": self.tokenized[idx],
            "labels": self.labels[idx],
            "log_fc": self.log_fc[idx],
            "sequence": self.sequences[idx]
        }

def find_dataset(filename: str) -> Optional[str]:
    candidate_paths = [
        os.path.join(ML_DIR, "data", filename),
        os.path.join(PROJECT_ROOT, "dataset", filename),
        os.path.join(os.path.dirname(PROJECT_ROOT), "dataset", filename),
        os.path.join(PROJECT_ROOT, "ResearchAndProductData", filename),
        os.path.join(os.path.dirname(PROJECT_ROOT), "ResearchAndProductData", filename),
        filename
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            return os.path.abspath(p)
    return None

def calculate_specificity(cm):
    if cm.shape == (2, 2):
        tn, fp, fn, tp = cm.ravel()
        denom = tn + fp
        return float(tn / denom) if denom > 0 else 1.0
    return 1.0

try:
    torch.set_num_threads(max(1, (os.cpu_count() or 4) - 1))
except Exception:
    pass

def train_group_deep_models(
    group_name: str,
    raw_file: str,
    drugs: List[str],
    gene_type: str,
    max_len: int,
    epochs: int = 5,
    batch_size: int = 128,
    lr: float = 1e-3,
    force_retrain: bool = False
) -> Dict[str, Any]:
    print(f"\n=======================================================")
    print(f"  Training Deep Models for {group_name} ({gene_type})  ")
    print(f"  Drugs: {', '.join(drugs)}                           ")
    print(f"=======================================================\n")
    
    file_path = find_dataset(raw_file)
    if not file_path:
        print(f"Error: {raw_file} not found. Skipping {group_name}.")
        return {}
        
    df = pd.read_csv(file_path)
    if len(df) > 500:
        df = df.sample(500, random_state=42).reset_index(drop=True)
    print(f"Loaded {len(df)} sequences for deep learning training from {file_path}")
    
    # 1. Reconstruct full sequence for each sample
    sequences = []
    for _, row in df.iterrows():
        # Check if row has P1...Pn columns
        row_dict = row.to_dict()
        if "P1" in row_dict:
            seq = parse_stanford_columns(row_dict, gene_type=gene_type)
        elif "CompMutList" in row_dict and pd.notna(row_dict["CompMutList"]):
            seq = reconstruct_sequence(str(row_dict["CompMutList"]), gene_type=gene_type)
        elif "insti_mutations" in row_dict and pd.notna(row_dict["insti_mutations"]) and str(row_dict["insti_mutations"]).lower() != "none":
            seq = reconstruct_sequence(str(row_dict["insti_mutations"]), gene_type="IN")
        else:
            seq = reconstruct_sequence([], gene_type=gene_type)
        sequences.append(seq)
        
    # 2. Extract drug resistance labels and log fold changes
    labels_list = []
    log_fc_list = []
    
    DRUG_ALIASES = {
        "DTG": "dolutegravir_resistance",
        "BIC": "bictegravir_resistance",
        "RAL": "raltegravir_resistance",
        "EVG": "elvitegravir_resistance",
        "CAB": "cabotegravir_resistance",
        "DOR": "doravirine_resistance"
    }
    
    for drug in drugs:
        alias_col = DRUG_ALIASES.get(drug, f"{drug.lower()}_resistance")
        if f"{drug}_res" in df.columns:
            lbl = df[f"{drug}_res"].fillna(0).values
        elif drug in df.columns:
            # Threshold from continuous fold-change (cutoff ~ 3.0)
            fc_vals = pd.to_numeric(df[drug], errors='coerce').fillna(1.0).values
            lbl = (fc_vals >= 3.0).astype(int)
        elif alias_col in df.columns:
            res_str = df[alias_col].astype(str).str.lower()
            lbl = (res_str.isin(["high", "reduced", "resistant", "1"])).astype(int).values
        else:
            lbl = np.zeros(len(df))
            
        if drug in df.columns:
            fc_raw = pd.to_numeric(df[drug], errors='coerce').fillna(1.0).clip(lower=0.1, upper=1000.0)
            log_fc = np.log10(fc_raw.values)
        elif alias_col in df.columns:
            res_str = df[alias_col].astype(str).str.lower()
            fc_sim = np.where(res_str == "high", 1.5, np.where(res_str == "reduced", 0.7, 0.0))
            log_fc = fc_sim
        else:
            log_fc = np.zeros(len(df))
            
        labels_list.append(lbl)
        log_fc_list.append(log_fc)
        
    labels_matrix = np.column_stack(labels_list) # (N, num_drugs)
    log_fc_matrix = np.column_stack(log_fc_list) # (N, num_drugs)
    
    # Split train/test (80/20)
    train_idx, test_idx = train_test_split(np.arange(len(df)), test_size=0.2, random_state=42)
    test_labels = labels_matrix[test_idx]
    
    train_dataset = HIVSequenceDataset(
        [sequences[i] for i in train_idx],
        labels_matrix[train_idx],
        log_fc_matrix[train_idx],
        max_len=max_len
    )
    test_dataset = HIVSequenceDataset(
        [sequences[i] for i in test_idx],
        labels_matrix[test_idx],
        log_fc_matrix[test_idx],
        max_len=max_len
    )
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")
    
    cnn_save_path = os.path.join(DEEP_MODELS_DIR, f"cnn_{group_name}.pt")
    esm_save_path = os.path.join(DEEP_MODELS_DIR, f"esm_{group_name}.pt")
    
    # --- A. Train 1D-CNN (or load if already trained) ---
    if os.path.exists(cnn_save_path) and not force_retrain:
        print(f"[CACHE] Found existing 1D-CNN model: {cnn_save_path}. Loading metrics...")
        ckpt = torch.load(cnn_save_path, map_location=device)
        cnn_metrics = ckpt.get("metrics", {})
    else:
        cnn = HIV1DCNN(num_drugs=len(drugs), drug_names=drugs, gene_type=gene_type).to(device)
        bce_loss_fn = nn.BCEWithLogitsLoss()
        mse_loss_fn = nn.MSELoss()
        optimizer = optim.AdamW(cnn.parameters(), lr=lr, weight_decay=1e-4)
        scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
        
        print(f"\n--- Training 1D-CNN ({epochs} epochs) ---")
        cnn.train()
        for epoch in range(1, epochs + 1):
            total_loss = 0.0
            for batch in train_loader:
                tokens = batch["tokens"].to(device)
                labels = batch["labels"].to(device)
                log_fc = batch["log_fc"].to(device)
                
                optimizer.zero_grad()
                out = cnn(tokens)
                loss_cls = bce_loss_fn(out["logits"], labels)
                loss_reg = mse_loss_fn(out["log_fold_change"], log_fc)
                loss = loss_cls + 0.5 * loss_reg
                
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
                
            scheduler.step()
            if epoch % 5 == 0 or epoch == epochs:
                print(f"Epoch {epoch}/{epochs} | Loss: {total_loss / len(train_loader):.4f}")
                
        # Evaluate 1D-CNN
        cnn.eval()
        all_preds = []
        all_labels = []
        all_log_fc_preds = []
        all_log_fc_true = []
        
        with torch.no_grad():
            for batch in test_loader:
                tokens = batch["tokens"].to(device)
                out = cnn(tokens)
                all_preds.append(out["probabilities"].cpu().numpy())
                all_labels.append(batch["labels"].numpy())
                all_log_fc_preds.append(out["log_fold_change"].cpu().numpy())
                all_log_fc_true.append(batch["log_fc"].numpy())
                
        test_probs = np.vstack(all_preds)
        test_labels = np.vstack(all_labels)
        test_bin_preds = (test_probs >= 0.5).astype(int)
        
        cnn_metrics = {}
        print(f"\n--- 1D-CNN Test Results ({group_name}) ---")
        for idx, drug in enumerate(drugs):
            y_t = test_labels[:, idx]
            y_p = test_bin_preds[:, idx]
            acc = accuracy_score(y_t, y_p)
            p, r, f1, _ = precision_recall_fscore_support(y_t, y_p, average='binary', zero_division=0)
            cm = confusion_matrix(y_t, y_p)
            spec = calculate_specificity(cm)
            
            print(f"1D-CNN {drug:4s} -> Acc: {acc:.4f} | Recall: {r:.4f} | Spec: {spec:.4f} | F1: {f1:.4f}")
            cnn_metrics[drug] = {
                "model_type": "HIV1DCNN",
                "accuracy": float(acc),
                "precision": float(p),
                "recall": float(r),
                "specificity": float(spec),
                "f1_score": float(f1)
            }
            
        # Save 1D-CNN model
        torch.save({
            "state_dict": cnn.state_dict(),
            "drug_names": drugs,
            "gene_type": gene_type,
            "max_len": max_len,
            "metrics": cnn_metrics
        }, cnn_save_path)
        print(f"Saved 1D-CNN weights to {cnn_save_path}")
        
    # --- B. Train ESM-2 Transfer Learning Classifier ---
    if os.path.exists(esm_save_path) and not force_retrain:
        print(f"[CACHE] Found existing ESM-2 model: {esm_save_path}. Loading metrics...")
        ckpt = torch.load(esm_save_path, map_location=device)
        esm_metrics = ckpt.get("metrics", {})
    else:
        esm_model = ESMResistanceClassifier(num_drugs=len(drugs), drug_names=drugs).to(device)
        if not torch.cuda.is_available():
            for p in esm_model.encoder.parameters():
                p.requires_grad = False
            esm_opt = optim.AdamW(filter(lambda p: p.requires_grad, esm_model.parameters()), lr=1e-3, weight_decay=1e-4)
        else:
            esm_opt = optim.AdamW(esm_model.parameters(), lr=5e-4, weight_decay=1e-4)
        esm_scheduler = optim.lr_scheduler.CosineAnnealingLR(esm_opt, T_max=epochs)
        bce_loss_fn = nn.BCEWithLogitsLoss()
        mse_loss_fn = nn.MSELoss()
        
        print(f"\n--- Training ESM-2 Transformer Classifier ({epochs} epochs) ---")
        esm_model.train()
        for epoch in range(1, epochs + 1):
            total_loss = 0.0
            for batch in train_loader:
                tokens = batch["tokens"].to(device)
                labels = batch["labels"].to(device)
                log_fc = batch["log_fc"].to(device)
                
                esm_opt.zero_grad()
                out = esm_model(tokens)
                loss_cls = bce_loss_fn(out["logits"], labels)
                loss_reg = mse_loss_fn(out["log_fold_change"], log_fc)
                loss = loss_cls + 0.5 * loss_reg
                
                loss.backward()
                esm_opt.step()
                total_loss += loss.item()
                
            esm_scheduler.step()
            if epoch % 5 == 0 or epoch == epochs:
                print(f"Epoch {epoch}/{epochs} | Loss: {total_loss / len(train_loader):.4f}")
                
        # Evaluate ESM-2
        esm_model.eval()
        esm_preds = []
        with torch.no_grad():
            for batch in test_loader:
                tokens = batch["tokens"].to(device)
                out = esm_model(tokens)
                esm_preds.append(out["probabilities"].cpu().numpy())
                
        esm_test_probs = np.vstack(esm_preds)
        esm_test_bin = (esm_test_probs >= 0.5).astype(int)
        
        esm_metrics = {}
        print(f"\n--- ESM-2 Transformer Test Results ({group_name}) ---")
        for idx, drug in enumerate(drugs):
            y_t = test_labels[:, idx]
            y_p = esm_test_bin[:, idx]
            acc = accuracy_score(y_t, y_p)
            p, r, f1, _ = precision_recall_fscore_support(y_t, y_p, average='binary', zero_division=0)
            cm = confusion_matrix(y_t, y_p)
            spec = calculate_specificity(cm)
            
            print(f"ESM-2  {drug:4s} -> Acc: {acc:.4f} | Recall: {r:.4f} | Spec: {spec:.4f} | F1: {f1:.4f}")
            esm_metrics[drug] = {
                "model_type": "ESM2ProteinTransformer",
                "accuracy": float(acc),
                "precision": float(p),
                "recall": float(r),
                "specificity": float(spec),
                "f1_score": float(f1)
            }
            
        # Save ESM model
        torch.save({
            "state_dict": esm_model.state_dict(),
            "drug_names": drugs,
            "gene_type": gene_type,
            "max_len": max_len,
            "metrics": esm_metrics
        }, esm_save_path)
        print(f"Saved ESM-2 weights to {esm_save_path}")
        
    return {
        "cnn_metrics": cnn_metrics,
        "esm_metrics": esm_metrics
    }

def train_all_deep_models(epochs: int = 15, force_retrain: bool = False):
    configs = [
        {
            "group_name": "PI",
            "raw_file": "PI_DataSet_processed.csv",
            "drugs": ["FPV", "ATV", "IDV", "LPV", "NFV", "SQV", "TPV", "DRV"],
            "gene_type": "PR",
            "max_len": 99
        },
        {
            "group_name": "NRTI",
            "raw_file": "NRTI_DataSet_processed.csv",
            "drugs": ["3TC", "ABC", "AZT", "D4T", "DDI", "TDF"],
            "gene_type": "RT",
            "max_len": 240
        },
        {
            "group_name": "NNRTI",
            "raw_file": "NNRTI_DataSet_processed.csv",
            "drugs": ["EFV", "NVP", "ETR", "RPV"],
            "gene_type": "RT",
            "max_len": 240
        },
        {
            "group_name": "INSTI",
            "raw_file": "hiv_full_drug_synthetic_100_HIV101-200.csv",
            "drugs": ["DTG", "BIC", "RAL", "EVG", "CAB"],
            "gene_type": "IN",
            "max_len": 288
        },
        {
            "group_name": "CAPSID",
            "raw_file": "Capsid_DataSet_processed.csv",
            "drugs": ["LEN"],
            "gene_type": "CA",
            "max_len": 231
        }
    ]
    
    all_deep_metrics = {
        "engine": "Sequence-Aware Deep Learning (1D-CNN & ESM-2 Transformer)",
        "training_date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "groups": {}
    }
    
    for cfg in configs:
        res = train_group_deep_models(
            # pyrefly: ignore [bad-argument-type]
            group_name=cfg["group_name"],
            # pyrefly: ignore [bad-argument-type]
            raw_file=cfg["raw_file"],
            drugs=cfg["drugs"],
            gene_type=cfg["gene_type"],
            max_len=cfg["max_len"],
            epochs=epochs,
            force_retrain=force_retrain
        )
        all_deep_metrics["groups"][cfg["group_name"]] = res
        
    metrics_path = os.path.join(DEEP_MODELS_DIR, "metrics_deep.json")
    with open(metrics_path, "w") as f:
        json.dump(all_deep_metrics, f, indent=4)
        
    print(f"\n[SUCCESS] Deep Learning models trained and metrics written to {metrics_path}!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Sequence-Aware Deep Learning Models")
    parser.add_argument("--epochs", type=int, default=8, help="Number of training epochs per group")
    parser.add_argument("--force", action="store_true", help="Force retrain even if checkpoints exist")
    args = parser.parse_args()
    train_all_deep_models(epochs=args.epochs, force_retrain=args.force)
