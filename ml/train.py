import os
import sys
import pickle
import json
import datetime
import argparse
import pandas as pd
import numpy as np

# Ensure ml and project root directories are in sys.path regardless of execution CWD
ML_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(ML_DIR)
for p in [ML_DIR, PROJECT_ROOT]:
    if p not in sys.path:
        sys.path.insert(0, p)

from sklearn.model_selection import train_test_split
from catboost import CatBoostClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

# Import preprocessing
try:
    from ml.preprocessing import preprocess_dataframe, ALL_MUTATIONS
except ImportError:
    from preprocessing import preprocess_dataframe, ALL_MUTATIONS

def calculate_specificity(cm):
    """Calculates macro-averaged specificity from a confusion matrix."""
    K = cm.shape[0]
    specs = []
    for i in range(K):
        tn = float(np.sum(cm) - np.sum(cm[i, :]) - np.sum(cm[:, i]) + cm[i, i])
        fp = float(np.sum(cm[:, i]) - cm[i, i])
        denom = tn + fp
        spec = tn / denom if denom > 0 else 1.0
        specs.append(spec)
    return float(np.mean(specs))

def find_dataset(filename):
    """Searches for a dataset file in all known locations."""
    candidate_paths = [
        os.path.join(ML_DIR, "data", filename),
        os.path.join(PROJECT_ROOT, filename),
        os.path.join(PROJECT_ROOT, "dataset", filename),
        os.path.join(os.path.dirname(PROJECT_ROOT), "dataset", filename),
        os.path.join(ML_DIR, filename),
        filename
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            return os.path.abspath(p)
    return None

def train_synthetic_pipeline():
    """Trains CatBoost models on the synthetic genotype-phenotype cohort."""
    print("\n=======================================================")
    print("  CatBoost Training: Synthetic Genotype Cohort        ")
    print("=======================================================\n")
    
    dataset_name = "hiv_genotype_synthetic_100.csv"
    dataset_path = find_dataset(dataset_name)
    if not dataset_path:
        raise FileNotFoundError(f"Synthetic dataset '{dataset_name}' not found in any standard paths.")
        
    print(f"Loading synthetic cohort from: {dataset_path}")
    df = pd.read_csv(dataset_path)
    print(f"Loaded dataset: {df.shape[0]} samples, {df.shape[1]} columns.")
    
    X, targets, feature_cols = preprocess_dataframe(df)
    print(f"Preprocessed features shape: {X.shape}. Feature columns: {len(feature_cols)}")
    
    models_dir = os.path.join(ML_DIR, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    y_target = targets['model_target']
    X_train, X_test, y_train_target, y_test_target = train_test_split(
        X, y_target, test_size=0.2, random_state=42, stratify=y_target
    )
    
    train_indices = X_train.index.tolist()
    test_indices = X_test.index.tolist()
    
    metrics = {
        "model_version": "v1.0 CatBoost-Powered Clinical Engine",
        "training_date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "dataset_info": {
            "name": dataset_name,
            "samples_total": len(df),
            "samples_train": len(X_train),
            "samples_test": len(X_test),
            "engine": "CatBoost Classifier (Gradient Boosted Decision Trees)"
        },
        "features": feature_cols,
        "models": {}
    }
    
    # Regimen Target Model
    print("Training overall Regimen Category Model with CatBoost...")
    cb_target = CatBoostClassifier(
        iterations=250,
        learning_rate=0.08,
        depth=6,
        auto_class_weights='Balanced',
        random_seed=42,
        verbose=False
    )
    cb_target.fit(X_train, y_train_target)
    cb_pred = cb_target.predict(X_test)
    if isinstance(cb_pred, np.ndarray) and cb_pred.ndim > 1:
        cb_pred = cb_pred.ravel()
        
    cb_acc = accuracy_score(y_test_target, cb_pred)
    p, r, f1, _ = precision_recall_fscore_support(y_test_target, cb_pred, average='weighted', zero_division=0)
    cm = confusion_matrix(y_test_target, cb_pred)
    
    print(f" -> Regimen Category Model - Accuracy: {cb_acc:.4f}, Precision: {p:.4f}, Recall: {r:.4f}, F1: {f1:.4f}")
    
    metrics["models"]["model_target"] = {
        "model_type": "CatBoostClassifier",
        "accuracy": float(cb_acc),
        "precision": float(p),
        "recall": float(r),
        "specificity": calculate_specificity(cm),
        "f1_score": float(f1),
        "confusion_matrix": cm.tolist(),
        "classes": sorted(y_target.unique().tolist())
    }
    
    with open(os.path.join(models_dir, "model_target.pkl"), "wb") as f:
        pickle.dump(cb_target, f)
        
    # Drug Level Models
    print("\nTraining 11 Drug-Level Resistance Models with CatBoost...")
    drug_cols = [c for c in targets.keys() if c != 'model_target']
    
    for drug in drug_cols:
        y_drug = targets[drug]
        X_train_d = X.loc[train_indices]
        X_test_d = X.loc[test_indices]
        y_train_d = y_drug.loc[train_indices]
        y_test_d = y_drug.loc[test_indices]
        
        cb_drug = CatBoostClassifier(
            iterations=250,
            learning_rate=0.08,
            depth=5,
            auto_class_weights='Balanced',
            random_seed=42,
            verbose=False
        )
        cb_drug.fit(X_train_d, y_train_d)
        
        preds_d = cb_drug.predict(X_test_d)
        if isinstance(preds_d, np.ndarray) and preds_d.ndim > 1:
            preds_d = preds_d.ravel()
            
        acc_d = accuracy_score(y_test_d, preds_d)
        p_d, r_d, f1_d, _ = precision_recall_fscore_support(y_test_d, preds_d, average='weighted', zero_division=0)
        cm_d = confusion_matrix(y_test_d, preds_d)
        
        importances = cb_drug.get_feature_importance()
        mut_importances = {}
        for mut in ALL_MUTATIONS:
            feat_name = f"mut_{mut}"
            if feat_name in feature_cols:
                idx = feature_cols.index(feat_name)
                mut_importances[mut] = float(importances[idx])
                
        metrics["models"][drug] = {
            "model_type": "CatBoostClassifier",
            "accuracy": float(acc_d),
            "precision": float(p_d),
            "recall": float(r_d),
            "specificity": calculate_specificity(cm_d),
            "f1_score": float(f1_d),
            "confusion_matrix": cm_d.tolist(),
            "classes": [int(c) for c in sorted(y_drug.unique().tolist())],
            "mutation_importance": mut_importances
        }
        
        with open(os.path.join(models_dir, f"model_{drug}.pkl"), "wb") as f:
            pickle.dump(cb_drug, f)
            
    with open(os.path.join(models_dir, "feature_columns.json"), "w") as f:
        json.dump(feature_cols, f, indent=4)
        
    with open(os.path.join(models_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=4)
        
    print("Synthetic CatBoost models trained and serialized to ml/models/.")

def train_real_pipeline():
    """Trains 18 CatBoost models on the Stanford University genotype-phenotype clinical datasets."""
    print("\n=======================================================")
    print("  CatBoost Training: Stanford Clinical Datasets        ")
    print("=======================================================\n")
    
    models_real_dir = os.path.join(ML_DIR, "models_real")
    os.makedirs(models_real_dir, exist_ok=True)
    
    processed_files = {
        "PI": {
            "file": "PI_DataSet_processed.csv",
            "drugs": ["FPV", "ATV", "IDV", "LPV", "NFV", "SQV", "TPV", "DRV"]
        },
        "NRTI": {
            "file": "NRTI_DataSet_processed.csv",
            "drugs": ["3TC", "ABC", "AZT", "D4T", "DDI", "TDF"]
        },
        "NNRTI": {
            "file": "NNRTI_DataSet_processed.csv",
            "drugs": ["EFV", "NVP", "ETR", "RPV"]
        }
    }
    
    metrics_summary = {
        "model_version": "v1.0 CatBoost Real-Data Clinical Classifier",
        "training_date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "engine": "CatBoost Classifier",
        "models": {}
    }
    
    for group_name, config in processed_files.items():
        file_path = find_dataset(config["file"])
        if not file_path:
            print(f"Skipping {group_name}: '{config['file']}' not found.")
            continue
            
        print(f"\nTraining on {group_name} dataset ({file_path})...")
        df = pd.read_csv(file_path)
        print(f"Shape: {df.shape}")
        
        target_cols = [f"{drug}_res" for drug in config["drugs"]]
        feature_cols = [c for c in df.columns if c != "SeqID" and c not in target_cols]
        X = df[feature_cols]
        
        for drug in config["drugs"]:
            target_name = f"{drug}_res"
            if target_name not in df.columns:
                continue
                
            y = df[target_name]
            try:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42, stratify=y
                )
            except ValueError:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
                
            clf = CatBoostClassifier(
                iterations=250,
                learning_rate=0.08,
                depth=5,
                auto_class_weights='Balanced',
                random_seed=42,
                verbose=False
            )
            clf.fit(X_train, y_train)
            
            y_pred = clf.predict(X_test)
            if isinstance(y_pred, np.ndarray) and y_pred.ndim > 1:
                y_pred = y_pred.ravel()
                
            acc = accuracy_score(y_test, y_pred)
            p, r, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='binary', zero_division=0)
            cm = confusion_matrix(y_test, y_pred)
            spec = calculate_specificity(cm)
            
            print(f" -> CatBoost {drug:4s} | Acc: {acc:.4f} | Recall: {r:.4f} | Spec: {spec:.4f} | F1: {f1:.4f}")
            
            importances = clf.get_feature_importance()
            mut_importances = {}
            for idx, col in enumerate(feature_cols):
                if col.startswith("mut_") and importances[idx] > 0.05:
                    mut_name = col.replace("mut_", "")
                    mut_importances[mut_name] = float(importances[idx])
                    
            sorted_importances = sorted(mut_importances.items(), key=lambda x: x[1], reverse=True)[:15]
            
            metrics_summary["models"][drug] = {
                "group": group_name,
                "model_type": "CatBoostClassifier",
                "accuracy": float(acc),
                "precision": float(p),
                "recall": float(r),
                "specificity": float(spec),
                "f1_score": float(f1),
                "sample_counts": {
                    "total": len(df),
                    "train": len(X_train),
                    "test": len(X_test),
                    "resistant_pct": float(y.mean())
                },
                "top_mutation_importances": dict(sorted_importances)
            }
            
            with open(os.path.join(models_real_dir, f"model_{drug}.pkl"), "wb") as f:
                pickle.dump(clf, f)
                
            with open(os.path.join(models_real_dir, f"feature_cols_{drug}.json"), "w") as f:
                json.dump(feature_cols, f, indent=4)
                
    with open(os.path.join(models_real_dir, "metrics_real.json"), "w") as f:
        json.dump(metrics_summary, f, indent=4)
        
    print("\nStanford Real Clinical CatBoost models trained and serialized to ml/models_real/.")

def main():
    parser = argparse.ArgumentParser(description="CatBoost ML Training Pipeline for HIV ART Regimen Selector")
    parser.add_argument("--mode", choices=["synthetic", "real", "all"], default="all",
                        help="Choose which models to train: 'synthetic', 'real', or 'all' (default: all)")
    args = parser.parse_args()
    
    if args.mode in ["synthetic", "all"]:
        train_synthetic_pipeline()
    if args.mode in ["real", "all"]:
        train_real_pipeline()
        
    print("\n[SUCCESS] All requested CatBoost models successfully trained and serialized!")

if __name__ == "__main__":
    main()
