# HIV AI Platform — Complete Conversation & Task Context Log

> **NOTE FOR FUTURE AI ASSISTANT / AGENT ON NEW DEVICE:**  
> Read this document completely to restore 100% of the conversation context, architectural decisions, and current state without needing the user to re-explain anything.

---

## 1. Project Background & Core Mission
* **Domain:** Clinical HIV-1 Genotype Resistance Prediction & Antiretroviral Therapy (ART) Optimization Platform.
* **Core Dataset:** Stanford University HIV Drug Resistance Database (HIVdb) containing clinical isolate genotypes and corresponding phenotypic drug susceptibility fold-change measurements across five drug classes:
  - **PI (Protease Inhibitors):** 8 drugs (`FPV`, `ATV`, `IDV`, `LPV`, `NFV`, `SQV`, `TPV`, `DRV`) across 99 amino acid Protease (`PR`).
  - **NRTI (Nucleoside RT Inhibitors):** 6 drugs (`3TC`, `ABC`, `AZT`, `D4T`, `DDI`, `TDF`) across first 240 amino acids of Reverse Transcriptase (`RT`).
  - **NNRTI (Non-Nucleoside RT Inhibitors):** 5 drugs (`EFV`, `NVP`, `ETR`, `RPV`, `DOR`) across first 240 amino acids of Reverse Transcriptase (`RT`).
  - **INSTI (Integrase Strand Transfer Inhibitors):** 5 drugs (`DTG`, `BIC`, `CAB`, `EVG`, `RAL`) across 288 amino acids of Integrase (`IN`).
  - **Capsid Inhibitor:** 1 drug (`LEN` - Lenacapavir) across 231 amino acids of Capsid (`CA`).

---

## 2. Chronological History of User Requests & Delivered Features

### Request 1: Model Training & CatBoost Integration
- Trained tabular ML resistance prediction models using CatBoost on Stanford datasets.
- Preprocessed `PI_DataSet_processed.csv`, `NRTI_DataSet_processed.csv`, `NNRTI_DataSet_processed.csv`. Trained CatBoost classifiers with multi-drug binary resistance and metrics serialization in `sih/ml/models/`.

### Request 2: Transition to Sequence-Aware Deep Learning
- Developed sequence reconstruction pipeline from wildtype consensus (`sequence_tokenizer.py`).
- Implemented `HIV1DCNN` multi-scale convolutional network with $k=3, 5, 7$ kernels, residual bottleneck blocks, dual global pooling, and multi-task heads (`models_cnn.py`).
- Implemented `ESM2ProteinEncoder` (4-layer RoPE Transformer) and `ESMResistanceClassifier` (`models_esm.py`).
- Implemented `GradCAM1D` class activation mapping generating per-residue heatmaps (`explainability.py`).
- Implemented unified inference engine `predict_deep.py`.

### Request 3: Step 2 Mutation Selection UI Overhaul
- Created `mutationCatalog.js` with 60+ categorized mutations.
- Created `MutationSelectDropdown.jsx` with search, class tabs, custom entry, and chip removal.
- Created `SequenceGradCAMViewer.jsx` for 1D sequence heatmap rendering.
- Added AI Engine Selector in `App.jsx` (`CatBoost`, `1D-CNN`, `ESM-2`, `Hybrid Ensemble`).

### Request 4: Backend API Integration & Initial Testing
- Wired `/api/genotype/analyze` with `engine` parameter.
- Established test suite with 18 tests passing.

### Request 5: White Screen Resolution & Safari Cache Busting
- User reported UI was not visible. Diagnosed browser caching of stale compiled chunks in Safari/Chrome.
- Re-synced clean React 18 production bundle, added cache-busting asset naming (`index-v5capsid.js`), set `?v=3` query parameter in `index.html`, and added HTTP `Cache-Control: no-store` headers.

### Request 6: Automated Patient ID & Zero-PII Patient Tracking (`v1.1.0-patient-id`)
- **User Directive:** System must automatically generate `PatientTestId`, clinician records it directly on the physical paper chart copy, returning patient search restores profile by ID, and zero personal information (name, phone, government ID) is ever stored.
- **Delivered:**
  - Automated ID generator: `HIV-YYYY-HEX5` (e.g. `HIV-2026-A8F3D`).
  - Physical file reference card in Step 1.
  - One-click search bar querying `GET /api/cases/search?patient_id=...`.
  - Backend endpoints `POST /api/cases/generate-id` and `GET /api/cases/search`.

### Request 7: Longitudinal Resistance & Regimen History Tracking (`v1.2.0-history`)
- **User Directive:** After loading patient record, show previous resistance analysis and previous regimen rankings.
- **Delivered:**
  - Loaded returning patient data renders a historical comparison card showing prior test date, detected mutations, susceptibility classification, and top-ranked regimen with clinical rationale.

### Request 8: Next-Generation Neural Network Subsystem (`v1.3.0-neural-network-evidential`)
- **User Directive:** Is there still room for upgrade in neural network? Saved version and planned Dirichlet evidential uncertainty, epistatic graph, and LoRA adaptation with zero external dependencies.
- **Delivered:**
  1. `models_evidential.py`: Dirichlet Evidential Head, Subjective Logic uncertainty $u = K / S$, 3 reliability tiers, and `EvidentialLoss` with KL divergence regularization.
  2. `models_epistatic.py`: `SurveillanceEpistaticGraph` multi-head cross-attention layer over patient mutations and catalytic loci with biology knowledge base (`M184V + TDF/AZT` hypersensitization, `M41L + T215Y` TAM synergy, `G140S + Q148H` compensatory rescue, `K65R + M184V` antagonism).
  3. `models_esm.py`: Pure PyTorch `LoRALinear` projection adapters injected into ESM query and value layers.
  4. Step 4 UI: Dirichlet Epistemic Reliability Gauge and Pairwise Epistatic Couplings Grid added to `SequenceGradCAMViewer.jsx`.
  5. 4 new unit tests added (total: 33 tests).

### Request 9: 25-Drug ML Diagnostics Portfolio Across 5 Classes (`v1.4.0-25-drugs-diagnostics`)
- **User Directive:** "check this page there is only 11 drugs are visible but there are 25 drugs are present in ml models and database fix it"
- **Delivered:**
  1. Diagnosed legacy `ml/models/metrics.json` placeholder.
  2. Extracted real tree-gain feature importances from all 50 XGBoost models in `ml/models_xgb/` across all 25 drugs in 5 classes (NRTI, NNRTI, INSTI, PI, Capsid).
  3. Mapped internal features (`P66_I`, `P140_S`) back to canonical mutation tokens (`M66I`, `G140S`, `M184V`, `K103N`, `Q148H`).
  4. Updated `metrics.json` reflecting 14,820 Stanford HIVdb isolate pairs.
  5. Updated `App.jsx` and compiled production bundle (`index-v5capsid.js`): 25-bar accuracy chart with angled `-45°` labels, 25-drug dropdown selector with class badges and safe fallback.
  6. Cache bumped to `?v=7`.

### Request 10: Standalone Execution Architecture for Deep Learning (`v1.4.1-standalone-init-fix`)
- **User Directive:** Fix `ImportError: attempted relative import with no known parent package` when executing `python3 __init__.py` inside `sih/ml/deep_learning/`.
- **Delivered:**
  - Implemented conditional import resolution: detects `if __name__ == "__main__" or not __package__`, inserts package dir into `sys.path`, and uses absolute imports; otherwise relative imports.
  - Verified standalone banner with 22 exported modules.

### Request 11: Comprehensive Platform Documentation
- **User Directive:** "document all the updates"
- **Delivered:**
  - Created `sih/DOCUMENTATION_UPDATES.md` detailing every architecture change, mathematical formulation, API endpoint, and release tag.
  - Updated `sih/PROJECT_DOCUMENTATION.md` and `sih/README.md`.
  - Updated `AI_CONVERSATION_CONTEXT.md` (this file).

---

## 3. Directory Structure & Key Files

```text
sih/
├── backend/
│   ├── main.py                  # FastAPI app (25-drug inference, zero-PII search, static serve)
│   ├── database.py              # SQLite connection & sessionmaker
│   ├── models.py                # SQLAlchemy DB tables
│   ├── schemas.py               # Pydantic schemas
│   └── hiv_selector.db          # SQLite database
├── clinical/
│   ├── knowledge_base.json      # 9 scoring weights, 27 drug formularies, contraindications
│   └── regimen_rules.py         # Clinical scoring algorithm
├── ml/
│   ├── data/                    # Stanford HIVdb dataset files
│   ├── models/
│   │   └── metrics.json         # 25-drug validation metrics & tree-gain importances
│   ├── models_xgb/              # 50 trained XGBoost models (25 clf + 25 reg)
│   │   └── features_xgb.json    # Feature index to mutation token mapping
│   ├── deep_models/             # PyTorch .pt model checkpoints
│   └── deep_learning/
│       ├── __init__.py          # Dual standalone/package import resolution
│       ├── sequence_tokenizer.py# HXB2 consensus sequences & tokenization
│       ├── models_cnn.py        # Multi-scale 1D-CNN (k=3, 5, 7)
│       ├── models_esm.py        # ESM-2 RoPE Transformer with pure PyTorch LoRA
│       ├── models_evidential.py # Dirichlet Evidential Head & Subjective Logic
│       ├── models_epistatic.py  # SEMP Epistatic Co-evolution Attention Graph
│       ├── explainability.py    # 1D Grad-CAM residue activation mapping
│       └── predict_deep.py      # Multi-drug deep inference orchestrator
├── frontend/
│   ├── src/
│   │   ├── data/mutationCatalog.js       # 60+ curated resistance mutations
│   │   ├── components/MutationSelectDropdown.jsx
│   │   ├── components/SequenceGradCAMViewer.jsx
│   │   └── App.jsx                      # Steps 1-4, 25-drug diagnostics
│   └── dist/
│       ├── index.html                   # Entry point (cache query ?v=7)
│       └── assets/index-v5capsid.js     # Production compiled bundle
├── tests/
│   ├── test_api.py              # 8 API integration tests
│   └── test_deep_learning.py    # 25 unit tests (evidential, epistatic, LoRA, CNN)
├── DOCUMENTATION_UPDATES.md     # Chronological log and complete updates reference
├── PROJECT_DOCUMENTATION.md     # Architecture and handoff guide
├── README.md                    # Main project README
└── run_app.py                   # Server launcher
```

---

## 4. Verification & Testing

```bash
# Run all 33 tests
cd sih
python3 -m unittest discover tests

# Standalone deep learning test
cd sih/ml/deep_learning
python3 __init__.py

# Start application server
cd sih
python3 run_app.py --port 8000
```
Open **[http://localhost:8000](http://localhost:8000)** (credentials: `doctor@hivclinic.org` / `clinicalpass123`).

---

## 5. Release Milestones & Git Tags

- `v1.1.0-patient-id` (`5dab3f0`): Automated PatientTestId, physical copy card, zero-PII search.
- `v1.2.0-history` (`067ee3d`): Prior resistance and historical regimen tracking.
- `v1.3.0-neural-network-evidential` (`f800355`): Evidential uncertainty, epistatic graph, LoRA.
- `v1.4.0-25-drugs-diagnostics` (`d9886b6`): 25 drugs across 5 classes, 50 XGBoost models, Stanford HIVdb metrics.
- `v1.4.1-standalone-init-fix` (`aa9306a`): Standalone `python3 __init__.py` execution fix.
- `v1.4.2-docs-complete` (`59de0bf`): Full platform documentation and ignore zip archives.
- `v1.4.3-barchart-render-fix` (`f8b10c0`): Fixed blank accuracy chart via explicit container heights, `.h-72` CSS injection, and `?v=8` cache-busting.
- `v1.5.0-stable-verified` (`46c1567`): Complete verified production milestone.
- `v2.0.0-nextgen-neural-architecture` (`356950b`): Next-Gen Neural Network Architecture with biophysical multi-channel neurons, 3D spatial crystal contact biases, drug-to-sequence cross-attention, and Sparse MoE FFN (38/38 tests passing).
- `v2.0.1-importance-scale-fix` (`4fcca5c`): Normalized mutation contribution percentages relative to total tree-gain importance and aligned initial dropdown state.
- `v2.1.0-responsive-sidebar` (`9006c5b`): Responsive collapsible left sidebar with viewport scroll locking and mobile support.
- `v2.1.1-sidebar-bottom-pin` (`1f8ddb5`): Bottom-docked Dr. S. Jenkins clinician profile with flex-grow nav and mt-auto footer.
- `v2.2.0-stable-verified`: Complete verified production milestone with next-gen neural architecture (v2.0), normalized feature importance, and responsive viewport-locked sidebar.
- Portable Backup Archives: `Development_v1.4.0_backup.zip`, `Development_v1.4.1_backup.zip`, `Development_v1.4.2_backup.zip`, `Development_v1.4.3_backup.zip`, `Development_v1.5.0_backup.zip`, `Development_v2.0.0_backup.zip`, `Development_v2.0.1_backup.zip`, `Development_v2.1.0_backup.zip`, `Development_v2.1.1_backup.zip`, `Development_v2.2.0_backup.zip`.
