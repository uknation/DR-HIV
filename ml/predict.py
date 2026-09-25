import os
import pickle
import json
import re
import pandas as pd
import numpy as np

import sys

# Ensure directory is in sys.path
ML_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(ML_DIR)
for p in [ML_DIR, PROJECT_ROOT]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Import preprocessing features
try:
    from ml.preprocessing import preprocess_single_input, ALL_MUTATIONS
except ImportError:
    from preprocessing import preprocess_single_input, ALL_MUTATIONS

# Path settings
MODELS_DIR = os.path.join(ML_DIR, "models")
XGB_DIR = os.path.join(ML_DIR, "models_xgb")

# Cache for models and metrics
_MODELS_CACHE = None
_METRICS = None
_XGB_CACHE = {"clf": {}, "reg": {}}
_XGB_FEAT_MAP = None

def load_xgb_features():
    """Loads XGBoost feature mappings lazily."""
    global _XGB_FEAT_MAP
    if _XGB_FEAT_MAP is None:
        feat_path = os.path.join(XGB_DIR, "features_xgb.json")
        if os.path.exists(feat_path):
            try:
                with open(feat_path, "r") as f:
                    _XGB_FEAT_MAP = json.load(f)
            except Exception as e:
                print(f"Warning loading features_xgb.json: {e}")
                _XGB_FEAT_MAP = {}
        else:
            _XGB_FEAT_MAP = {}
    return _XGB_FEAT_MAP

def get_single_xgb_model(drug_code):
    """Loads single XGBoost Classifier & Regressor on demand to conserve RAM."""
    global _XGB_CACHE
    if drug_code not in _XGB_CACHE["clf"]:
        clf_path = os.path.join(XGB_DIR, f"{drug_code}_clf.json")
        if os.path.exists(clf_path):
            try:
                import xgboost as xgb
                clf = xgb.XGBClassifier()
                clf.load_model(clf_path)
                _XGB_CACHE["clf"][drug_code] = clf
            except Exception as e:
                print(f"Warning loading XGBoost clf for {drug_code}: {e}")

    if drug_code not in _XGB_CACHE["reg"]:
        reg_path = os.path.join(XGB_DIR, f"{drug_code}_reg.json")
        if os.path.exists(reg_path):
            try:
                import xgboost as xgb
                reg = xgb.XGBRegressor()
                reg.load_model(reg_path)
                _XGB_CACHE["reg"][drug_code] = reg
            except Exception as e:
                print(f"Warning loading XGBoost reg for {drug_code}: {e}")

    return _XGB_CACHE["clf"].get(drug_code), _XGB_CACHE["reg"].get(drug_code)

def load_xgb_resources():
    """Backward-compatible loader providing cached XGBoost maps."""
    return _XGB_CACHE, load_xgb_features()

ALL_25_DRUGS_CONFIG = [
    # Protease Inhibitors (PI) - 8 drugs
    {"code": "FPV", "name": "Fosamprenavir", "class": "PI", "key": "fosamprenavir"},
    {"code": "ATV", "name": "Atazanavir", "class": "PI", "key": "atazanavir"},
    {"code": "IDV", "name": "Indinavir", "class": "PI", "key": "indinavir"},
    {"code": "LPV", "name": "Lopinavir", "class": "PI", "key": "lopinavir"},
    {"code": "NFV", "name": "Nelfinavir", "class": "PI", "key": "nelfinavir"},
    {"code": "SQV", "name": "Saquinavir", "class": "PI", "key": "saquinavir"},
    {"code": "TPV", "name": "Tipranavir", "class": "PI", "key": "tipranavir"},
    {"code": "DRV", "name": "Darunavir", "class": "PI", "key": "darunavir"},

    # Nucleoside Reverse Transcriptase Inhibitors (NRTI) - 6 drugs
    {"code": "3TC", "name": "Lamivudine", "class": "NRTI", "key": "lamivudine"},
    {"code": "ABC", "name": "Abacavir", "class": "NRTI", "key": "abacavir"},
    {"code": "AZT", "name": "Zidovudine", "class": "NRTI", "key": "zidovudine"},
    {"code": "D4T", "name": "Stavudine", "class": "NRTI", "key": "stavudine"},
    {"code": "DDI", "name": "Didanosine", "class": "NRTI", "key": "didanosine"},
    {"code": "TDF", "name": "Tenofovir Disoproxil", "class": "NRTI", "key": "tenofovir"},

    # Non-Nucleoside Reverse Transcriptase Inhibitors (NNRTI) - 5 drugs
    {"code": "EFV", "name": "Efavirenz", "class": "NNRTI", "key": "efavirenz"},
    {"code": "ETR", "name": "Etravirine", "class": "NNRTI", "key": "etravirine"},
    {"code": "NVP", "name": "Nevirapine", "class": "NNRTI", "key": "nevirapine"},
    {"code": "RPV", "name": "Rilpivirine", "class": "NNRTI", "key": "rilpivirine"},
    {"code": "DOR", "name": "Doravirine", "class": "NNRTI", "key": "doravirine"},

    # Integrase Strand Transfer Inhibitors (INSTI) - 5 drugs
    {"code": "DTG", "name": "Dolutegravir", "class": "INSTI", "key": "dolutegravir"},
    {"code": "BIC", "name": "Bictegravir", "class": "INSTI", "key": "bictegravir"},
    {"code": "CAB", "name": "Cabotegravir", "class": "INSTI", "key": "cabotegravir"},
    {"code": "EVG", "name": "Elvitegravir", "class": "INSTI", "key": "elvitegravir"},
    {"code": "RAL", "name": "Raltegravir", "class": "INSTI", "key": "raltegravir"},

    # Capsid Inhibitor - 1 drug
    {"code": "LEN", "name": "Lenacapavir", "class": "Capsid", "key": "lenacapavir"}
]

DRUG_CODE_MAP = {d["key"]: d["code"] for d in ALL_25_DRUGS_CONFIG}
DRUG_CODE_MAP["emtricitabine"] = "3TC"

class LazyModelDict(dict):
    """Lazy dictionary that loads .pkl models on first access to conserve RAM."""
    def __getitem__(self, key):
        if not super().__contains__(key):
            model_path = os.path.join(MODELS_DIR, f"model_{key}.pkl")
            if os.path.exists(model_path):
                with open(model_path, "rb") as f:
                    super().__setitem__(key, pickle.load(f))
            else:
                raise KeyError(key)
        return super().__getitem__(key)
        
    def __contains__(self, key):
        if super().__contains__(key):
            return True
        model_path = os.path.join(MODELS_DIR, f"model_{key}.pkl")
        return os.path.exists(model_path)
        
    def get(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            return default

    def __bool__(self):
        return os.path.exists(MODELS_DIR) and any(f.endswith('.pkl') for f in os.listdir(MODELS_DIR))

def predict_single_xgb_drug(drug_code, mutations_list):
    """Executes dual inference using fine-tuned XGBoost Classifier + Regressor (loaded on-demand)."""
    feat_map = load_xgb_features()
    if not feat_map or drug_code not in feat_map:
        return None
        
    clf, reg = get_single_xgb_model(drug_code)
    if clf is None:
        return None
        
    info = feat_map[drug_code]
    feats = info["features"]
    
    x = np.zeros((1, len(feats)), dtype=np.float32)
    feat_idx = {f: i for i, f in enumerate(feats)}
    contributors = []
    
    for m in mutations_list:
        m_clean = m.strip().upper()
        match = re.match(r'^([A-Z]?)([0-9]+)([A-Z])$', m_clean)
        if match:
            _, pos, mut = match.groups()
            feat_name = f"P{pos}_{mut}"
            if feat_name in feat_idx:
                x[0, feat_idx[feat_name]] = 1.0
                contributors.append({"mutation": m_clean, "importance": 1.0})
                
    prob = clf.predict_proba(x)[0]
    res_prob = float(prob[1])
    fold_change = float(reg.predict(x)[0]) if reg is not None else (10.0 ** res_prob)
    if fold_change < 1.0:
        fold_change = 1.0
        
    if res_prob >= 0.70:
        label = "High"
        interp = "High Resistance"
    elif res_prob >= 0.40:
        label = "Reduced"
        interp = "Reduced Susceptibility"
    else:
        label = "Susceptible"
        interp = "Susceptible"
        
    confidence = float(max(prob[0], prob[1]))
    
    return {
        "prediction": label,
        "interpretation": interp,
        "confidence": round(confidence, 4),
        "confidence_score": round(confidence, 4),
        "resistance_probability": round(res_prob, 4),
        "estimated_fold_change": round(fold_change, 1),
        "contributors": contributors,
        "status": "Success (XGBoost 50-Model Suite)"
    }

def load_ml_resources():
    """Loads models and metrics into cache lazily."""
    global _MODELS_CACHE, _METRICS
    
    if _METRICS is None:
        metrics_path = os.path.join(MODELS_DIR, "metrics.json")
        if os.path.exists(metrics_path):
            with open(metrics_path, "r") as f:
                _METRICS = json.load(f)
        else:
            print("Warning: metrics.json not found. Run train.py first.")
            _METRICS = {}
            
    if _MODELS_CACHE is None:
        _MODELS_CACHE = LazyModelDict()
                
    return _MODELS_CACHE, _METRICS

def get_class_label(class_numeric):
    """Maps numerical predictions back to text resistance labels."""
    mapping = {0: "Susceptible", 1: "Reduced", 2: "High"}
    return mapping.get(class_numeric, "Unknown")

def predict_resistance(mutations_list, clinical_data, engine: str = "catboost"):
    """
    Predicts drug-level resistance for all standard drugs and the overall target class.
    
    - mutations_list: list of strings (e.g., ['M184V', 'K103N'])
    - clinical_data: dictionary of clinical attributes.
    - engine: 'catboost' or 'xgboost'
    
    Returns:
      dict: containing drug_predictions, overall_category, overall_confidence, and metrics.
    """
    models, metrics = load_ml_resources()
    
    if not models:
        return {"error": "ML models are currently unavailable. Please run training first."}
        
    # Preprocess the input sample
    df_single = preprocess_single_input(mutations_list, clinical_data)
    
    # 1. Individual drug resistance prediction
    drug_predictions = {}
    
    # 1. Iterate over ALL 25 drugs across 5 classes using the 50-model XGBoost suite (+ CatBoost where available)
    for item in ALL_25_DRUGS_CONFIG:
        code = item["code"]
        name = item["name"]
        cls = item["class"]
        key = item["key"]
        display_name = f"{code} ({name})"
        
        xgb_res = predict_single_xgb_drug(code, mutations_list)
        catboost_model_name = f"{key}_resistance"
        
        if engine == "catboost" and models and catboost_model_name in models:
            model = models[catboost_model_name]
            raw_pred = model.predict(df_single)
            pred_class = int(np.ravel(raw_pred)[0])
            pred_probs = model.predict_proba(df_single)[0]
            class_indices = model.classes_
            prob_idx = np.where(class_indices == pred_class)[0]
            confidence = float(pred_probs[prob_idx[0]]) if len(prob_idx) > 0 else 1.0
            pred_label = get_class_label(pred_class)
            
            contributors = []
            drug_metrics = metrics["models"].get(catboost_model_name, {}) if metrics and "models" in metrics else {}
            importances = drug_metrics.get("mutation_importance", {})
            for m in mutations_list:
                if m in importances and importances[m] > 0.01:
                    contributors.append({"mutation": m, "importance": importances[m]})
            contributors = sorted(contributors, key=lambda x: x["importance"], reverse=True)
            if not contributors and xgb_res:
                contributors = xgb_res.get("contributors", [])
                
            fold_change = xgb_res["estimated_fold_change"] if xgb_res else 1.0
            res_prob = xgb_res["resistance_probability"] if xgb_res else (0.95 if pred_label == "High" else 0.05)
            
            drug_predictions[code] = {
                "drug_name": display_name,
                "class": cls,
                "prediction": pred_label,
                "interpretation": f"{pred_label} Resistance" if pred_label != "Susceptible" else "Susceptible",
                "confidence": round(confidence, 4),
                "confidence_score": round(confidence, 4),
                "resistance_probability": res_prob,
                "estimated_fold_change": fold_change,
                "contributors": contributors,
                "status": "Success (CatBoost + XGBoost)"
            }
        else:
            # XGBoost engine or fine-tuned 50-model suite
            if xgb_res:
                drug_predictions[code] = {
                    "drug_name": display_name,
                    "class": cls,
                    "prediction": xgb_res["prediction"],
                    "interpretation": xgb_res["interpretation"],
                    "confidence": xgb_res["confidence"],
                    "confidence_score": xgb_res["confidence_score"],
                    "resistance_probability": xgb_res["resistance_probability"],
                    "estimated_fold_change": xgb_res["estimated_fold_change"],
                    "contributors": xgb_res["contributors"],
                    "status": "Success (XGBoost 50-Model Suite)"
                }
            else:
                drug_predictions[code] = {
                    "drug_name": display_name,
                    "class": cls,
                    "prediction": "Susceptible",
                    "interpretation": "Susceptible",
                    "confidence": 0.95,
                    "confidence_score": 0.95,
                    "resistance_probability": 0.05,
                    "estimated_fold_change": 1.0,
                    "contributors": [],
                    "status": "Baseline"
                }
        
    # 2. Overall regimen category model prediction
    overall_category = "Specialist_review_required"
    overall_confidence = 0.5
    class_probabilities = {}
    
    if "target" in models:
        model_target = models["target"]
        raw_cat_pred = model_target.predict(df_single)
        pred_cat = np.ravel(raw_cat_pred)[0]
        pred_probs = model_target.predict_proba(df_single)[0]
        
        overall_category = str(pred_cat)
        classes = model_target.classes_
        
        for cls_name, prob in zip(classes, pred_probs):
            class_probabilities[str(cls_name)] = float(prob)
            
        prob_idx = np.where(classes == pred_cat)[0]
        overall_confidence = float(pred_probs[prob_idx[0]]) if len(prob_idx) > 0 else 0.5
        
    # 3. Assess overall system confidence
    # If any active drug model has very low confidence, or if the main model confidence is low, flag it
    low_confidence_flag = False
    reasons = []
    
    if overall_confidence < 0.65:
        low_confidence_flag = True
        reasons.append(f"Regimen target model confidence is low ({overall_confidence:.1%})")
        
    # If the user has a high mutation count, warn
    if len(mutations_list) >= 6:
        low_confidence_flag = True
        reasons.append(f"High mutation count ({len(mutations_list)} detected) complicates standard modeling")
        
    return {
        "drug_predictions": drug_predictions,
        "overall_category": overall_category,
        "overall_confidence": overall_confidence,
        "class_probabilities": class_probabilities,
        "low_confidence_flag": low_confidence_flag,
        "low_confidence_reasons": reasons,
        "model_version": metrics.get("model_version", "v1.0 CatBoost-Powered Clinical Engine") if metrics else "v1.0 CatBoost-Powered Clinical Engine",
        "training_date": metrics.get("training_date", "") if metrics else ""
    }
