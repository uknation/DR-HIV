import os
import json

KB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "knowledge_base.json")

def load_knowledge_base():
    """Loads and returns the clinical knowledge base JSON."""
    try:
        with open(KB_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading clinical knowledge base: {e}")
        return {
            "status": "Fallback Mode",
            "drugs": {},
            "scoring_weights": {
                "active_drug_score": 30.0,
                "reduced_activity_score": 15.0,
                "high_resistance_score": 0.0,
                "redundancy_penalty": -50.0,
                "dual_nrtI_bonus": 10.0,
                "class_diversity_bonus": 10.0,
                "first_line_who_preference_bonus": 10.0,
                "high_genetic_barrier_bonus": 10.0,
                "unsupported_drug_penalty": -40.0
            },
            "clinical_rules": {"avoid_coadmin": []},
            "standard_regimens": []
        }

def save_knowledge_base(kb_data):
    """Saves the clinical knowledge base JSON back to disk."""
    try:
        with open(KB_PATH, "w") as f:
            json.dump(kb_data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving clinical knowledge base: {e}")
        return False

DRUG_NAME_ALIASES = {
    "tenofovir": ["tenofovir", "tdf", "taf"],
    "lamivudine": ["lamivudine", "3tc"],
    "emtricitabine": ["emtricitabine", "ftc"],
    "abacavir": ["abacavir", "abc"],
    "zidovudine": ["zidovudine", "azt", "zdv"],
    "efavirenz": ["efavirenz", "efv"],
    "nevirapine": ["nevirapine", "nvp"],
    "rilpivirine": ["rilpivirine", "rpv"],
    "doravirine": ["doravirine", "dor"],
    "etravirine": ["etravirine", "etr"],
    "dolutegravir": ["dolutegravir", "dtg"],
    "bictegravir": ["bictegravir", "bic"],
    "raltegravir": ["raltegravir", "ral"],
    "cabotegravir": ["cabotegravir", "cab"],
    "darunavir": ["darunavir", "drv", "drv/r"],
    "lopinavir": ["lopinavir", "lpv", "lpv/r"],
    "atazanavir": ["atazanavir", "atv", "atv/r"],
    "fosamprenavir": ["fosamprenavir", "fpv"],
    "indinavir": ["indinavir", "idv"],
    "nelfinavir": ["nelfinavir", "nfv"],
    "saquinavir": ["saquinavir", "sqv"],
    "tipranavir": ["tipranavir", "tpv"],
    "elvitegravir": ["elvitegravir", "evg"],
    "stavudine": ["stavudine", "d4t"],
    "didanosine": ["didanosine", "ddi"],
    "lenacapavir": ["lenacapavir", "len"],
    "fostemsavir": ["fostemsavir", "ftr"]
}

def get_prediction_for_drug(drug_key, drug_predictions):
    """Retrieves drug prediction whether keyed by generic name or standard abbreviation."""
    aliases = DRUG_NAME_ALIASES.get(drug_key.lower(), [drug_key.lower()])
    for a in aliases:
        for k in [a, a.upper(), a.lower()]:
            if k in drug_predictions:
                return drug_predictions[k]
    return {}

def evaluate_regimen(regimen_drugs, drug_predictions, kb, clinical_data=None):
    """
    Scores a single combination of drugs based on ANRS v35 algorithms, WHO/NACO guidelines,
    and individual predicted drug susceptibilities.
    
    Returns:
      dict: score, active_count, burden_level, clinical_warnings, and guideline justification.
    """
    weights = kb.get("scoring_weights", {})
    rules = kb.get("clinical_rules", {})
    drugs_def = kb.get("drugs", {})
    
    raw_score = 0.0
    active_count = 0
    burden_score = 0
    unsupported_count = 0
    redundant_count = 0
    
    classes_present = set()
    mutations_detected = clinical_data.get("mutations", []) if clinical_data else []
    if isinstance(mutations_detected, str):
        mutations_detected = [m.strip() for m in mutations_detected.replace(";", ",").split(",") if m.strip()]
        
    # 1. Evaluate each drug in the regimen
    for drug in regimen_drugs:
        drug_def = drugs_def.get(drug, {})
        drug_class = drug_def.get("class", "Unknown")
        classes_present.add(drug_class)
        
        pred_data = get_prediction_for_drug(drug, drug_predictions)
        pred_val = pred_data.get("interpretation") or pred_data.get("prediction", "Insufficient training information")
        if isinstance(pred_val, int):
            pred_val = "High" if pred_val == 1 else "Susceptible"
            
        if pred_val == "Susceptible":
            raw_score += weights.get("active_drug_score", 30.0)
            active_count += 1
        elif pred_val == "Reduced" or pred_val == "Intermediate Resistance":
            raw_score += weights.get("reduced_activity_score", 15.0)
            active_count += 1
            burden_score += 1
        elif pred_val == "High" or pred_val == "High-Level Resistance":
            raw_score += weights.get("high_resistance_score", 0.0)
            burden_score += 2
        else: # Insufficient training information
            raw_score += weights.get("unsupported_drug_penalty", -40.0)
            burden_score += 1
            unsupported_count += 1
            
        # High Genetic Barrier Bonus (DTG, BIC, DRV, LEN)
        if drug in ["dolutegravir", "bictegravir", "darunavir", "lenacapavir"]:
            raw_score += weights.get("high_genetic_barrier_bonus", 10.0)
            
    # 2. Check clinical guidelines & co-administration rules
    avoid_pairs = rules.get("avoid_coadmin", [["lamivudine", "emtricitabine"]])
    for pair in avoid_pairs:
        if len(pair) == 2:
            if pair[0] in regimen_drugs and pair[1] in regimen_drugs:
                raw_score += weights.get("redundancy_penalty", -50.0)
                redundant_count += 1
                
    # 3. Backbone bonuses
    nrti_count = sum(1 for d in regimen_drugs if drugs_def.get(d, {}).get("class") == "NRTI")
    if nrti_count == 2:
        raw_score += weights.get("dual_nrtI_bonus", 10.0)
        
    # Class diversity: contains drugs from at least 2 distinct classes
    if len(classes_present) >= 2:
        raw_score += weights.get("class_diversity_bonus", 10.0)
        
    # 4. ANRS v35 Virological Algorithm Rule Adjustments
    # 4.1 M184V Hypersensitization:
    # When M184V is present, 3TC/FTC are resistant, BUT M184V increases RT fidelity and hypersensitizes TDF & AZT!
    has_m184v = any("184" in m for m in mutations_detected)
    if has_m184v:
        if "tenofovir" in regimen_drugs or "zidovudine" in regimen_drugs:
            raw_score += 10.0 # Clinical synergy bonus
            
    # 4.2 K65R Rule (ANRS v35):
    # K65R causes resistance to TDF, ABC, 3TC, FTC, but hypersensitizes to AZT!
    has_k65r = any("65" in m for m in mutations_detected)
    if has_k65r:
        if "zidovudine" in regimen_drugs:
            raw_score += 15.0 # Preferred alternative backbone in K65R failure
        if "tenofovir" in regimen_drugs:
            raw_score -= 20.0
            
    # 4.3 TAM Clusters (ANRS v35):
    tam1_muts = rules.get("tam_cluster_1", ["M41L", "L210W", "T215Y"])
    tam_count = sum(1 for m in mutations_detected if any(t in m for t in tam1_muts))
    if tam_count >= 2 and "zidovudine" in regimen_drugs:
        raw_score -= 20.0 # High AZT resistance
        
    # 4.4 Multi-NRTI Complex (Q151M or 69 insertion):
    multi_nrti = rules.get("multi_nrtI_complex", ["Q151M", "T69Ins"])
    has_multi = any(any(mn in m for mn in multi_nrti) for m in mutations_detected)
    if has_multi and nrti_count > 0:
        raw_score -= 30.0 # High cross-resistance across all NRTIs
        
    # 5. Advanced Clinical Features & Adjustments (Renal/Pregnancy)
    crcl = 100.0
    is_pregnant = False
    renal_warning = False
    pregnancy_warning = False
    clinical_warnings = []
    
    if clinical_data:
        is_pregnant = clinical_data.get("is_pregnant", False)
        age = clinical_data.get("age", 30)
        weight = clinical_data.get("weight", 60)
        creat = clinical_data.get("serum_creatinine", 1.0)
        is_female = is_pregnant or (clinical_data.get("gender") == "Female")
        gender_factor = 0.85 if is_female else 1.0
        
        try:
            if creat > 0:
                crcl = ((140 - age) * weight) / (72 * creat) * gender_factor
        except Exception:
            pass
            
        # Renal Clearance warnings for Tenofovir (TDF)
        if crcl < 50.0 and "tenofovir" in regimen_drugs:
            renal_warning = True
            raw_score -= 25.0
            clinical_warnings.append("Tenofovir Disoproxil (TDF) requires dose adjustment or renal-sparing substitution (CrCl < 50 mL/min).")
            
        # Pregnancy warning for Efavirenz
        if is_pregnant and "efavirenz" in regimen_drugs:
            pregnancy_warning = True
            raw_score -= 15.0
            clinical_warnings.append("Efavirenz should be avoided in first trimester of pregnancy if active DTG or PI options exist.")
            
        # Abacavir HLA-B*5701 warning
        if "abacavir" in regimen_drugs:
            clinical_warnings.append("Abacavir (ABC) requires screening for HLA-B*5701 allele prior to initiation to prevent severe hypersensitivity.")
            
    # 6. Normalize score (0-100 scale)
    max_raw_score = 130.0
    compatibility_score = max(0, min(100, int((raw_score / max_raw_score) * 100)))
    
    if redundant_count > 0:
        compatibility_score = min(compatibility_score, 25)
        
    if burden_score == 0:
        burden_level = "Low"
    elif burden_score <= 2:
        burden_level = "Moderate"
    else:
        burden_level = "High"
        
    return {
        "score": compatibility_score,
        "active_agents": active_count,
        "burden_score": burden_score,
        "burden_level": burden_level,
        "unsupported_count": unsupported_count,
        "redundant_count": redundant_count,
        "classes_present": list(classes_present),
        "crcl_calculated": round(crcl, 1),
        "renal_warning": renal_warning,
        "pregnancy_warning": pregnancy_warning,
        "clinical_warnings": clinical_warnings
    }

def rank_regimens(drug_predictions, overall_category, clinical_data=None):
    """
    Ranks standard and dynamically generated candidate regimens based on drug-level predictions.
    """
    kb = load_knowledge_base()
    templates = kb.get("standard_regimens", [])
    
    ranked_candidates = []
    
    for idx, temp in enumerate(templates):
        eval_res = evaluate_regimen(temp["drugs"], drug_predictions, kb, clinical_data)
        
        reasons_pro = []
        reasons_con = []
        
        # Pro: Active agents
        if eval_res["active_agents"] == len(temp["drugs"]):
            reasons_pro.append(f"All {len(temp['drugs'])} agents are predicted susceptible/active.")
        elif eval_res["active_agents"] >= 2:
            reasons_pro.append(f"{eval_res['active_agents']} fully active agents present in the combination.")
            
        # Resistance burden
        if eval_res["burden_level"] == "Low":
            reasons_pro.append("Zero resistance burden detected across all component drugs.")
        elif eval_res["burden_level"] == "High":
            reasons_con.append("High resistance burden detected for one or more agents.")
            
        # Class check
        if temp["category"] == overall_category:
            cat_display = overall_category.replace('_', ' ')
            reasons_pro.append(f"Directly matches the patient profile category ({cat_display}).")
            
        # High genetic barrier bonus
        if any(d in temp["drugs"] for d in ["dolutegravir", "bictegravir", "darunavir", "lenacapavir"]):
            reasons_pro.append("Includes high-genetic-barrier agent (DTG/BIC/DRV/LEN) protecting against future resistance.")
            
        # Line Tier
        tier = temp.get("line_tier", "Standard Regimen")
        if "Preferred" in tier:
            reasons_pro.append("Endorsed as Preferred First-Line therapy under WHO & NACO 2024 protocols.")
            
        # Drug-specific checks
        for d in temp["drugs"]:
            pred_data = get_prediction_for_drug(d, drug_predictions)
            pred_v = pred_data.get("interpretation") or pred_data.get("prediction", "Unknown")
            if isinstance(pred_v, int):
                pred_v = "High" if pred_v == 1 else "Susceptible"
            d_display = kb.get("drugs", {}).get(d, {}).get("display_name", d)
            if pred_v in ["High", "High-Level Resistance"]:
                reasons_con.append(f"High resistance predicted for {d_display}.")
            elif pred_v in ["Reduced", "Intermediate Resistance"]:
                reasons_con.append(f"Reduced susceptibility predicted for {d_display}.")
                
        # Redundant drugs check
        if eval_res["redundant_count"] > 0:
            reasons_con.append("Redundant co-administration of similar drugs detected (e.g. 3TC + FTC).")
            
        for cw in eval_res.get("clinical_warnings", []):
            reasons_con.append(cw)
            
        ranked_candidates.append({
            "id": temp["id"],
            "name": temp["name"],
            "category": temp["category"].replace("_", " "),
            "line_tier": temp.get("line_tier", "Standard"),
            "drugs": temp["drugs"],
            "description": temp["description"],
            "score": eval_res["score"],
            "active_agents": eval_res["active_agents"],
            "burden_level": eval_res["burden_level"],
            "unsupported_count": eval_res["unsupported_count"],
            "reasons_pro": reasons_pro,
            "reasons_con": reasons_con,
            "crcl_calculated": eval_res.get("crcl_calculated"),
            "renal_warning": eval_res.get("renal_warning"),
            "pregnancy_warning": eval_res.get("pregnancy_warning"),
            "clinical_warnings": eval_res.get("clinical_warnings", [])
        })
        
    ranked_candidates = sorted(ranked_candidates, key=lambda x: x["score"], reverse=True)
    
    for i, candidate in enumerate(ranked_candidates):
        candidate["rank"] = i + 1
        if i == 0:
            candidate["ranking_comparison"] = "Top recommended candidate based on predicted susceptibility profile and guideline alignment."
        else:
            diff = ranked_candidates[0]["score"] - candidate["score"]
            if diff > 0:
                candidate["ranking_comparison"] = f"Scored {diff} points lower than Rank #1 due to higher predicted resistance burden or class mismatch."
            else:
                candidate["ranking_comparison"] = "Equivalent compatibility score, clinician preference should guide selection."
                
    return ranked_candidates
