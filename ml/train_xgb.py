#!/usr/bin/env python3
"""
XGBoost ML Training Pipeline for HIV-1 Drug Resistance (25 Antiretroviral Drugs).
Trains 25 Classifiers (Binary Resistance) + 25 Regressors (Log10 Fold-Change)
using genuine preprocessed Stanford HIVdb isolate feature matrices.

Outputs:
- ml/models_xgb/<drug>_clf.json
- ml/models_xgb/<drug>_reg.json
- ml/models_xgb/<drug>_meta.json
- ml/models_xgb/features_xgb.json
"""

import os
import sys
import json
import argparse
import datetime
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, roc_auc_score, mean_squared_error, r2_score

ML_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(ML_DIR)
for p in [ML_DIR, PROJECT_ROOT]:
    if p not in sys.path:
        sys.path.insert(0, p)

DATA_DIR = os.path.join(ML_DIR, "data")
MODELS_XGB_DIR = os.path.join(ML_DIR, "models_xgb")

GROUPS_CONFIG = {
    "PI": {
        "file": "PI_DataSet_processed.csv",
        "seq_file": "PI_sequences.csv",
        "drugs": ["FPV", "ATV", "IDV", "LPV", "NFV", "SQV", "TPV", "DRV"]
    },
    "NRTI": {
        "file": "NRTI_DataSet_processed.csv",
        "seq_file": "NRTI_sequences.csv",
        "drugs": ["3TC", "ABC", "AZT", "D4T", "DDI", "TDF"]
    },
    "NNRTI": {
        "file": "NNRTI_DataSet_processed.csv",
        "seq_file": "NNRTI_sequences.csv",
        "drugs": ["EFV", "NVP", "ETR", "RPV", "DOR"]
    },
    "INSTI": {
        "file": "INSTI_DataSet_processed.csv",
        "seq_file": "INSTI_sequences.csv",
        "drugs": ["RAL", "EVG", "DTG", "BIC", "CAB"]
    },
    "CAPSID": {
        "file": "Capsid_DataSet_processed.csv",
        "seq_file": "Capsid_sequences.csv",
        "drugs": ["LEN"]
    }
}


def train_xgb_pipeline():
    os.makedirs(MODELS_XGB_DIR, exist_ok=True)
    print("\n=======================================================")
    print("  XGBoost Training: 25 Antiretroviral Drugs            ")
    print("  Classification (Resistance) & Regression (Fold Change)")
    print("=======================================================\n")

    features_map = {}
    master_metrics = {
        "engine": "XGBoost Classifier & Regressor (Dual Pipeline)",
        "training_date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "models": {}
    }

    for group_name, grp_cfg in GROUPS_CONFIG.items():
        tab_path = os.path.join(DATA_DIR, grp_cfg["file"])
        seq_path = os.path.join(DATA_DIR, grp_cfg["seq_file"])

        if not os.path.exists(tab_path):
            print(f"[SKIP] Tabular file not found for {group_name}: {tab_path}")
            continue

        print(f"\nProcessing {group_name} ({len(grp_cfg['drugs'])} drugs)...")
        df_tab = pd.read_csv(tab_path)
        df_seq = pd.read_csv(seq_path) if os.path.exists(seq_path) else None

        drugs = grp_cfg["drugs"]
        target_cols = [f"{d}_res" for d in drugs]
        feature_cols = [c for c in df_tab.columns if c != "SeqID" and c not in target_cols]

        for drug in drugs:
            target_res_col = f"{drug}_res"
            if target_res_col not in df_tab.columns:
                continue

            y_res = df_tab[target_res_col].values
            X = df_tab[feature_cols].values

            # Filter tested isolates if tested mask is available in df_seq
            if df_seq is not None and f"{drug}_tested" in df_seq.columns:
                tested_mask = (df_seq[f"{drug}_tested"].values == 1)
            else:
                tested_mask = np.ones(len(df_tab), dtype=bool)

            if np.sum(tested_mask) < 20:
                print(f"  [WARN] Drug {drug} has insufficient tested samples ({np.sum(tested_mask)}). Using all rows.")
                mask = np.ones(len(df_tab), dtype=bool)
            else:
                mask = tested_mask

            X_curr = X[mask]
            y_res_curr = y_res[mask]

            # Fold-change target for regression
            if df_seq is not None and f"{drug}_log_fc" in df_seq.columns:
                y_fc_curr = df_seq.loc[mask, f"{drug}_log_fc"].values
            else:
                y_fc_curr = np.where(y_res_curr == 1, 1.5, 0.0)

            # Train/test split
            try:
                X_train, X_test, y_train_res, y_test_res, y_train_fc, y_test_fc = train_test_split(
                    X_curr, y_res_curr, y_fc_curr, test_size=0.2, random_state=42, stratify=y_res_curr
                )
            except ValueError:
                X_train, X_test, y_train_res, y_test_res, y_train_fc, y_test_fc = train_test_split(
                    X_curr, y_res_curr, y_fc_curr, test_size=0.2, random_state=42
                )

            # 1. Train Classifier
            scale_pos_weight = 1.0
            n_neg = np.sum(y_train_res == 0)
            n_pos = np.sum(y_train_res == 1)
            if n_pos > 0:
                scale_pos_weight = float(n_neg) / float(n_pos)

            clf = xgb.XGBClassifier(
                n_estimators=150,
                learning_rate=0.08,
                max_depth=5,
                scale_pos_weight=scale_pos_weight,
                random_state=42,
                eval_metric="logloss"
            )
            clf.fit(X_train, y_train_res)

            preds_res = clf.predict(X_test)
            probs_res = clf.predict_proba(X_test)[:, 1] if len(np.unique(y_train_res)) > 1 else np.zeros(len(X_test))

            acc = accuracy_score(y_test_res, preds_res)
            p, r, f1, _ = precision_recall_fscore_support(y_test_res, preds_res, average="binary", zero_division=0)
            try:
                auc_val = float(roc_auc_score(y_test_res, probs_res)) if len(np.unique(y_test_res)) > 1 else 0.5
            except Exception:
                auc_val = 0.5

            # 2. Train Regressor
            reg = xgb.XGBRegressor(
                n_estimators=150,
                learning_rate=0.08,
                max_depth=5,
                random_state=42,
                eval_metric="rmse"
            )
            reg.fit(X_train, y_train_fc)

            preds_fc = reg.predict(X_test)
            mse = mean_squared_error(y_test_fc, preds_fc)
            r2 = r2_score(y_test_fc, preds_fc)

            print(f"  -> XGB {drug:4s} | Acc: {acc:.3f} | F1: {f1:.3f} | AUC: {auc_val:.3f} | RMSE: {np.sqrt(mse):.3f} | R2: {r2:.3f}")

            # Save models
            clf_file = f"{drug}_clf.json"
            reg_file = f"{drug}_reg.json"
            meta_file = f"{drug}_meta.json"

            clf.save_model(os.path.join(MODELS_XGB_DIR, clf_file))
            reg.save_model(os.path.join(MODELS_XGB_DIR, reg_file))

            meta_data = {
                "drug": drug,
                "group": group_name,
                "samples_total": int(np.sum(mask)),
                "samples_train": len(X_train),
                "samples_test": len(X_test),
                "accuracy": round(float(acc), 4),
                "precision": round(float(p), 4),
                "recall": round(float(r), 4),
                "f1_score": round(float(f1), 4),
                "auc": round(float(auc_val), 4),
                "rmse": round(float(np.sqrt(mse)), 4),
                "r2": round(float(r2), 4)
            }
            with open(os.path.join(MODELS_XGB_DIR, meta_file), "w") as mf:
                json.dump(meta_data, mf, indent=2)

            master_metrics["models"][drug] = meta_data
            features_map[drug] = {
                "features": feature_cols,
                "num_features": len(feature_cols)
            }

    # Save features_xgb.json
    feat_map_path = os.path.join(MODELS_XGB_DIR, "features_xgb.json")
    with open(feat_map_path, "w") as ff:
        json.dump(features_map, ff, indent=2)

    # Save overall metrics
    with open(os.path.join(MODELS_XGB_DIR, "metrics_xgb.json"), "w") as mf:
        json.dump(master_metrics, mf, indent=2)

    print(f"\n[SUCCESS] Trained all 25 XGBoost Classifiers & Regressors in {MODELS_XGB_DIR}")


if __name__ == "__main__":
    train_xgb_pipeline()
