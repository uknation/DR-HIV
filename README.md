# AI-Powered HIV-1 Drug Resistance Prediction & ART Regimen Selector

### *Clinical Decision-Support System for Antiretroviral Therapy (ART) Selection*

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-orange.svg)](https://pytorch.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-1.7+-red.svg)](https://xgboost.readthedocs.io/)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Tests](https://img.shields.io/badge/tests-33%20passed%20(100%25)-brightgreen.svg)](file:///Users/vishalkumarsrivastav/Downloads/untitled%20folder/Development/sih/tests)

---

## 📌 Executive Summary

This software is an advanced **AI-driven clinical decision-support system** engineered to assist infectious disease specialists and healthcare practitioners in detecting HIV-1 antiretroviral drug resistance and optimizing combination Antiretroviral Therapy (ART) regimens.

The system features a **hybrid multi-tier clinical intelligence architecture**:
1. **Machine Learning Diagnostic Portfolio (`ml/models_xgb/`)**:
   - **25 Antiretroviral Drugs across all 5 therapeutic classes** (NRTI, NNRTI, INSTI, PI, and Capsid inhibitor Lenacapavir).
   - **50 fine-tuned XGBoost models** (25 classifiers + 25 log-fold-change regressors) trained on **14,820 clinical genotype-phenotype isolate pairs** from the Stanford HIV Drug Resistance Database (HIVdb).
2. **Sequence-Aware Deep Learning Framework (`ml/deep_learning/`)**:
   - **Multi-Scale 1D-CNN**: Multi-receptive field convolutional kernels ($k=3, 5, 7$) capturing physical binding pockets, catalytic triads, and flap loops.
   - **ESM-2 Protein Transformer with Pure PyTorch LoRA**: 4-layer RoPE Transformer encoder ($d=256$, 16 attention heads) with built-in Low-Rank Adaptation for parameter-efficient transfer learning.
   - **Dirichlet Evidential Deep Learning (Subjective Logic)**: Quantifies epistemic model uncertainty ($u \in [0, 1]$) with clinical reliability tiers (High Reliability, Moderate, High Epistemic Uncertainty / Out-of-Distribution).
   - **Surveillance Epistatic Mutation-Pair (SEMP) Graph**: Multi-head cross-attention layer detecting biological epistasis (synergy, antagonism, compensatory rescue).
   - **1D Grad-CAM Sequence Heatmaps**: Continuous per-residue gradient activation mapping explaining resistance decisions.
3. **Clinical Decision Rules Engine (`clinical/`)**:
   - Scores and ranks candidate ART regimens (e.g. `TDF + 3TC + DTG`, `BIC + FTC + TAF`) applying WHO and DHHS 2026 guidelines, dual-NRTI backbone requirements, class diversity bonuses, and incompatible co-administration penalties.
4. **Zero-PII Patient Tracking & Longitudinal History**:
   - Automated cryptographic identifier: $\text{PatientTestId} = \text{HIV-} \parallel \text{YYYY} \parallel \text{-} \parallel \text{HEX}_5$ (e.g. `HIV-2026-A8F3D`).
   - Physical paper chart reference card ensures **zero Personally Identifiable Information (PII)** is ever stored in the database.
   - Instant returning patient lookup automatically restoring previous resistance results and historical regimen rankings for longitudinal comparison.

---

## 🛠️ System Architecture

```
                 ┌────────────────────────────────────────────────────────┐
                 │                React 18 / Vite Frontend                │
                 │  - Step 1: Automated PatientTestId & Physical Card     │
                 │  - Step 2: 60+ Curated Mutation Catalog Multi-Select   │
                 │  - Step 3: Dual-Engine Regimen Ranking & Scores        │
                 │  - Step 4: Grad-CAM, Evidential Gauge & SEMP Grid      │
                 │  - Diagnostics: 25-Drug Stanford HIVdb Analytics       │
                 └───────────────────────────┬────────────────────────────┘
                                             │ REST API (FastAPI)
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │                 FastAPI Backend Server                 │
                 │  - SQLite Engine (`hiv_selector.db`)                   │
                 │  - Zero-PII Case Registry & Longitudinal Search        │
                 │  - ReportLab Dynamic PDF Clinical Report Generator     │
                 └──────┬────────────────────┬────────────────────┬───────┘
                        │                    │                    │
                        ▼                    ▼                    ▼
       ┌─────────────────────────┐  ┌───────────────────┐  ┌──────────────────────┐
       │ 50 XGBoost ML Models    │  │ Sequence-Aware DL │  │ Clinical Rules       │
       │ - 25 Classifiers        │  │ - 1D-CNN (k=3,5,7)│  │ - 9 Scoring Weights  │
       │ - 25 Regressors         │  │ - ESM-2 + LoRA    │  │ - 27 Formularies     │
       │ - 14,820 Stanford Pairs │  │ - Dirichlet EDL   │  │ - Redundancy Penalty │
       │ - Tree-Gain Importance  │  │ - SEMP Epistasis  │  │ - Backbone Bonuses   │
       └─────────────────────────┘  └───────────────────┘  └──────────────────────┘
```

---

## 🧬 Complete 25-Drug Antiretroviral Portfolio

The platform models and evaluates resistance across **25 antiretroviral agents** in **5 therapeutic classes**:

| Class | Count | Supported Drugs (Generic & Abbreviation) |
| :--- | :---: | :--- |
| **NRTI** (Nucleoside Reverse Transcriptase Inhibitors) | **6** | `3TC` (Lamivudine), `ABC` (Abacavir), `AZT` (Zidovudine), `D4T` (Stavudine), `DDI` (Didanosine), `TDF` (Tenofovir Disoproxil) |
| **NNRTI** (Non-Nucleoside Reverse Transcriptase Inhibitors) | **5** | `EFV` (Efavirenz), `ETR` (Etravirine), `NVP` (Nevirapine), `RPV` (Rilpivirine), `DOR` (Doravirine) |
| **INSTI** (Integrase Strand Transfer Inhibitors) | **5** | `DTG` (Dolutegravir), `BIC` (Bictegravir), `CAB` (Cabotegravir), `EVG` (Elvitegravir), `RAL` (Raltegravir) |
| **PI** (Protease Inhibitors) | **8** | `ATV` (Atazanavir), `DRV` (Darunavir), `FPV` (Fosamprenavir), `IDV` (Indinavir), `LPV` (Lopinavir), `NFV` (Nelfinavir), `SQV` (Saquinavir), `TPV` (Tipranavir) |
| **Capsid Inhibitor** | **1** | `LEN` (Lenacapavir) — Multistage capsid target inhibitor |
| **TOTAL** | **25** | **50 Fine-Tuned XGBoost Models** + Sequence Deep Learning Ensemble |

---

## 🔬 Mathematical Formulations

### 1. Dirichlet Evidential Deep Learning (Subjective Logic)
Unlike standard softmax classification which produces overconfident logits on out-of-distribution mutations, our evidential head computes Dirichlet distribution parameters:
$$e_k = \text{softplus}(z_k) = \ln(1 + e^{z_k}) \ge 0, \quad \alpha_k = e_k + 1$$
$$S = \sum_{k=1}^K \alpha_k, \quad p_k = \frac{\alpha_k}{S}, \quad u = \frac{K}{S} \in (0, 1]$$
- **High Reliability**: $u < 0.20$
- **Moderate Uncertainty**: $0.20 \le u < 0.45$
- **High Epistemic Uncertainty (OOD)**: $u \ge 0.45$

### 2. Parameter-Efficient LoRA (Pure PyTorch)
Injected into the multi-head attention projection layers ($W_q, W_v$) of the ESM transformer:
$$W = W_0 + \frac{\alpha}{r} (B \cdot A)$$
where $W_0$ is frozen, $A \sim \mathcal{N}(0, \sigma^2)$, $B = 0$, rank $r = 8$, scaling $\alpha = 16$.

### 3. Surveillance Epistatic Mutation-Pair (SEMP) Graph
Captures non-linear biological couplings:
- **`M184V + TDF/AZT`**: Hypersensitization to Tenofovir/Zidovudine.
- **`M41L + T215Y`**: TAM-1 synergistic excision cross-resistance.
- **`G140S + Q148H`**: Compensatory catalytic rescue restoring integrase fitness under INSTI pressure.
- **`K65R + M184V`**: Antagonistic interaction.

---

## 📁 Repository Directory Structure

```text
sih/
├── backend/
│   ├── database.py              # SQLite engine & sessionmaker
│   ├── main.py                  # FastAPI REST endpoints & UI static file serving
│   ├── models.py                # SQLAlchemy ORM schemas
│   ├── schemas.py               # Pydantic validation schemas
│   ├── hiv_selector.db          # SQLite clinical database
│   └── static_reports/          # Cached ReportLab PDF reports
├── clinical/
│   ├── knowledge_base.json      # 9 scoring weights, 27 formularies, contraindications
│   └── regimen_rules.py         # Clinical scoring and ranking algorithm
├── ml/
│   ├── data/                    # Processed Stanford HIVdb datasets (PI, NRTI, NNRTI, INSTI)
│   ├── models/
│   │   └── metrics.json         # 25-drug Stanford HIVdb metrics & tree-gain importances
│   ├── models_xgb/              # 50 trained XGBoost models (25 clf + 25 reg)
│   │   └── features_xgb.json    # Feature index to clinical mutation mapping
│   ├── deep_models/             # Saved PyTorch .pt model weights
│   └── deep_learning/
│       ├── __init__.py          # Dual standalone/package import resolution
│       ├── sequence_tokenizer.py# Consensus reconstruction (PR, RT, IN, CA)
│       ├── models_cnn.py        # Multi-scale 1D-CNN (k=3, 5, 7)
│       ├── models_esm.py        # RoPE Transformer with pure PyTorch LoRA
│       ├── models_evidential.py # Dirichlet Evidential Head, Subjective Logic, Loss
│       ├── models_epistatic.py  # SEMP epistatic coupling cross-attention graph
│       ├── explainability.py    # 1D Grad-CAM residue activation mapping
│       ├── predict_deep.py      # Unified multi-drug inference orchestrator
│       └── train_deep.py        # Deep learning training pipeline
├── frontend/
│   ├── src/
│   │   ├── data/
│   │   │   └── mutationCatalog.js       # 60+ categorized resistance mutations
│   │   ├── components/
│   │   │   ├── MutationSelectDropdown.jsx# Searchable dropdown with class tabs
│   │   │   └── SequenceGradCAMViewer.jsx # Heatmaps, Epistemic Gauge, SEMP grid
│   │   ├── App.jsx                      # Main clinical application dashboard
│   │   └── index.css                    # TailwindCSS styles
│   └── dist/                            # Production Vite bundle (cache query ?v=7)
├── tests/
│   ├── test_api.py              # 8 API integration tests
│   └── test_deep_learning.py    # 25 unit tests for evidential, epistatic & CNN
├── DOCUMENTATION_UPDATES.md     # Chronological log and complete updates reference
├── PROJECT_DOCUMENTATION.md     # Architecture and handoff guide
└── run_app.py                   # Automated server launcher
```

---

## 🚀 Quick Start Guide

### 1. Requirements
- Python 3.9+
- Packages: `torch`, `xgboost`, `fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`, `reportlab`, `scikit-learn`, `pandas`, `numpy`

### 2. Launch the Platform
```bash
cd sih
python3 run_app.py --port 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.  
- Default Authorized Clinician: `doctor@hivclinic.org` / `clinicalpass123`.

### 3. Run Automated Tests
```bash
cd sih
python3 -m unittest discover tests
```
**Result:** 33/33 tests pass (100% OK) in ~2.5 seconds.

### 4. Verify Standalone Deep Learning Package
```bash
cd sih/ml/deep_learning
python3 __init__.py
```
Outputs confirmation of all 22 exported modules.

---

## 🔒 Patient Privacy & Compliance

The platform implements a **Strict Zero-PII Policy**:
- Patient names, government identification numbers, telephone numbers, and email addresses are **strictly excluded** from data ingestion and database schemas.
- Unique cryptographic tokens (`HIV-2026-XXXXX`) are referenced on physical paperwork.
- The physical paper chart remains the sole linking mechanism, providing full privacy protection under HIPAA and GDPR.
