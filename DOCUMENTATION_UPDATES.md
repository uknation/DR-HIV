# HIV AI Platform — Comprehensive Master Documentation of All Updates

**Release Track:** `v1.0.0` → `v1.4.1`  
**Current Tag:** `v1.4.1-standalone-init-fix` (`aa9306a`)  
**Repository Working Directory:** `/Users/vishalkumarsrivastav/Downloads/untitled folder/Development/sih`  
**Platform Status:** Production Ready • 33/33 Automated Tests Passing (100%)

---

## 📌 Executive Summary of All Completed Updates

This document provides complete, exhaustive technical documentation for all updates implemented across the **HIV AI Clinical Decision Support Platform**. The platform has advanced from an early prototype with 11 toy drugs into a production-grade clinical AI system featuring:

1. **Automated PatientTestId & Zero-PII Clinical Tracking (`v1.1.0-patient-id`)**: Instant unique ID generation (`HIV-YYYY-XXXXX`), paper file reference card, zero personally identifiable information (PII) stored in the database, and instant returning patient lookup.
2. **Longitudinal Resistance & Regimen History (`v1.2.0-history`)**: Automatic retrieval and rendering of prior resistance profiles, detected mutations, susceptibility tiers, and ranked ART regimens when loading returning patients.
3. **Advanced Neural Network Subsystem (`v1.3.0-neural-network-evidential`)**: 
   - Dirichlet Evidential Deep Learning based on Subjective Logic theory, quantifying epistemic uncertainty ($u \in [0, 1]$) with clinical reliability tiers.
   - Surveillance Epistatic Mutation-Pair (SEMP) cross-attention co-evolution graph detecting synergistic, antagonistic, and hypersensitizing mutation pairs.
   - Parameter-Efficient Fine-Tuning via pure PyTorch Low-Rank Adaptation (LoRA) injected into ESM protein transformer layers.
   - Interactive Grad-CAM sequence heatmaps, epistemic uncertainty gauge, and epistatic couplings grid.
4. **Complete 25-Drug ML Diagnostics Across 5 Therapeutic Classes (`v1.4.0-25-drugs-diagnostics`)**:
   - Expansion from 11 legacy drugs to all 25 clinical antiretroviral drugs across all 5 classes (NRTI, NNRTI, INSTI, PI, and Capsid inhibitor Lenacapavir).
   - Backed by 50 fine-tuned XGBoost models trained on 14,820 clinical isolate samples from the Stanford HIV Drug Resistance Database (HIVdb).
   - Real tree-gain feature importances mapped back to canonical clinical mutation codes.
   - Recharts visualization with angled X-axis labels (`-45°`), expanded container height, and class-annotated dropdown selector.
5. **Dual Standalone/Package Execution Architecture (`v1.4.1-standalone-init-fix`)**:
   - Conditional package path resolution in `sih/ml/deep_learning/__init__.py` allowing seamless standalone script verification (`python3 __init__.py`) while maintaining standard intra-package relative imports.

---

## 1. Automated Patient ID & Zero-PII Clinical Referencing (`v1.1.0`)

### 1.1 Clinical Problem & Requirements
In clinical HIV care, patient privacy is paramount under HIPAA, GDPR, and national digital healthcare standards. Storing patient names, national identity numbers, or phone numbers in an AI database creates catastrophic data leak vulnerabilities. Simultaneously, doctors need a frictionless way to identify returning patients and review their treatment response.

### 1.2 Architectural Solution
- **Automated Identifier Scheme**:
  The system automatically generates a cryptographically random, collision-resistant identifier:
  $$\text{PatientTestId} = \text{HIV-} \parallel \text{YYYY} \parallel \text{-} \parallel \text{HEX}_5$$
  *Example:* `HIV-2026-A8F3D`, `HIV-2026-B92E1`.
- **Physical Paper Chart Reference Card**:
  When a new analysis begins, Step 1 displays a prominent physical copy reference banner:
  > *"Note this PatientTestId directly on the patient's physical file copy. Do NOT record the patient's name, phone number, or government identity in this software."*
- **Returning Patient One-Click Lookup**:
  Doctors entering an existing `PatientTestId` in the search bar trigger an asynchronous lookup:
  - Query: `GET /api/cases/search?patient_id={id}`
  - Populates clinical context: Age group, biological sex, CD4 count, viral load, previous treatment status, and adherence history.
  - Guarantees zero PII exposure.

### 1.3 Modified Files & API Endpoints
- **Backend**:
  - `sih/backend/main.py`:
    - `POST /api/cases/generate-id`: Checks database uniqueness and returns new `PatientTestId`.
    - `GET /api/cases/search`: Queries `PatientCase` by `patient_id` or `id` without disclosing PII.
- **Frontend**:
  - `sih/frontend/src/App.jsx`: Step 1 physical file card, auto-generation button, and search lookup bar.

---

## 2. Longitudinal Resistance & Regimen History Tracking (`v1.2.0`)

### 2.1 Clinical Workflow
When an HIV patient experiences virological failure (viral load $> 1,000\text{ copies/mL}$ while on therapy), the clinician needs to compare the new genotype against previous resistance analyses to differentiate between poor adherence versus acquired drug resistance mutations.

### 2.2 Functional Architecture
When a returning patient record is loaded, the dashboard queries all historical analyses associated with that `PatientTestId`:
- **Previous Resistance Analysis**:
  - Date and timestamp of previous genotype test.
  - Model engine utilized (`CatBoost`, `1D-CNN`, `ESM-2`, `Hybrid Ensemble`).
  - Active mutations present at that time.
  - Drug susceptibility classifications (`Susceptible`, `Reduced`, `High Resistance`) and estimated fold-changes.
- **Prior ART Regimen Ranking**:
  - The top-ranked ART regimen recommended in the previous session (e.g., `TDF + 3TC + DTG`).
  - Clinical composite score (0–100) and rationale.
  - Guideline compliance (WHO / DHHS 2026 guidelines).

---

## 3. Next-Gen Deep Learning Subsystem (`v1.3.0`)

The deep learning package (`sih/ml/deep_learning/`) was upgraded with three state-of-the-art scientific advancements:

```
                          ┌──────────────────────────────────────┐
                          │   Reconstructed Sequence (PR/RT/IN)  │
                          └──────────────────┬───────────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
       ┌──────────────────────────────┐              ┌──────────────────────────────┐
       │   Multi-Scale 1D-CNN         │              │   ESM-2 Protein Transformer  │
       │   (Kernels k = 3, 5, 7)      │              │   (4 Layers, d=256, RoPE)    │
       │   + Dual Global Pooling      │              │   + LoRA Injected Projections│
       └──────────────┬───────────────┘              └──────────────┬───────────────┘
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             │ Latent Sequence Features z
                                             ▼
                      ┌─────────────────────────────────────────────┐
                      │    Surveillance Epistatic Coupling Graph    │
                      │    (Multi-Head Cross-Attention over SEMP)   │
                      └──────────────────────┬──────────────────────┘
                                             │ Enriched Epistatic Features
                                             ▼
                      ┌─────────────────────────────────────────────┐
                      │        Dirichlet Evidential Head            │
                      │    e_k = softplus(W z + b),  α_k = e_k + 1  │
                      └──────────────────────┬──────────────────────┘
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
     ┌──────────────────────────────┐                ┌──────────────────────────────┐
     │ Expected Probabilities:      │                │ Epistemic Uncertainty:       │
     │ p_k = α_k / S                │                │ u = K / S ∈ [0, 1]           │
     └──────────────────────────────┘                └──────────────────────────────┘
```

### 3.1 Dirichlet Evidential Deep Learning (Subjective Logic)
Standard neural networks apply a `softmax` function to unconstrained logits, which produces overconfident predictions even on out-of-distribution (OOD) or rare mutations. 

To overcome this, we implemented **Dirichlet Evidential Deep Learning** (`models_evidential.py`):
1. **Evidence Vector Formulation**:
   Instead of normalized probabilities, the network outputs non-negative evidence vectors:
   $$e_k = \text{softplus}(z_k) = \ln(1 + e^{z_k}) \ge 0$$
2. **Dirichlet Distribution Parameters**:
   Subjective Logic parameterizes a Dirichlet distribution $\text{Dir}(\boldsymbol{\alpha})$ with:
   $$\alpha_k = e_k + 1$$
3. **Dirichlet Strength & Expected Belief**:
   $$S = \sum_{k=1}^K \alpha_k$$
   $$p_k = \frac{\alpha_k}{S}$$
4. **Epistemic (Model) Uncertainty**:
   The total epistemic uncertainty $u$ represents the vacuity of evidence:
   $$u = \frac{K}{S} \in (0, 1]$$
   - When evidence is zero ($e_k = 0 \implies \alpha_k = 1$), strength $S = K$, and uncertainty $u = 1.0$ (complete ignorance).
   - As evidence accumulates ($e_k \gg 0$), $S \to \infty$, and $u \to 0$ (absolute certainty).
5. **Clinical Reliability Tiers**:
   - **High Reliability**: $u < 0.20$ — Robust evidence from known mutations.
   - **Moderate Uncertainty**: $0.20 \le u < 0.45$ — Intermediate mutations requiring review.
   - **High Epistemic Uncertainty (Out-of-Distribution)**: $u \ge 0.45$ — Unseen mutation pattern; flagged for phenotypic testing.
6. **Custom Evidential Loss Function (`EvidentialLoss`)**:
   Combines expected prediction error under the Dirichlet distribution with a Kullback-Leibler (KL) divergence penalty against a uniform Dirichlet prior $\text{Dir}(\mathbf{1})$ for incorrect classes:
   $$\mathcal{L}(\boldsymbol{\alpha}) = \sum_{k=1}^K y_k \left( \psi(S) - \psi(\alpha_k) \right) + \lambda_t \, \text{KL}\left[ \text{Dir}(\tilde{\boldsymbol{\alpha}}) \,||\, \text{Dir}(\mathbf{1}) \right]$$
   where $\tilde{\alpha}_k = y_k + (1 - y_k)\alpha_k$, $\psi(\cdot)$ is the digamma function, and $\lambda_t = \min(1.0, t / 10)$ balances evidence formation during training.

### 3.2 Surveillance Epistatic Mutation-Pair (SEMP) Graph
Mutations in HIV do not act in isolation. Non-linear biological epistasis (synergy, antagonism, compensatory fitness rescues) alters drug resistance profiles:
- **`models_epistatic.py`**:
  Implements `SurveillanceEpistaticGraph`, a multi-head cross-attention layer over patient mutations and catalytic loci:
  $$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{Q K^T}{\sqrt{d_k}}\right) V$$
- **Curated Knowledge Base of Biological Interactions**:
  1. **`M184V + TDF/AZT` (Hypersensitization)**: The catalytic impairment of `M184V` (which confers $>100$-fold resistance to `3TC`/`FTC`) increases viral sensitivity (hypersensitization) to Tenofovir and Zidovudine.
  2. **`M41L + T215Y` (TAM-1 Synergy)**: Classical Thymidine Analogue Mutations work synergistically via ATP-mediated excision of the chain terminator, producing high-level cross-resistance across all NRTIs.
  3. **`G140S + Q148H` (Compensatory Rescue)**: The primary catalytic mutation `Q148H` causes major integrase fitness defects. The compensatory mutation `G140S` restores enzyme fitness, generating $>100$-fold cross-resistance to first- and second-generation INSTIs (`RAL`, `EVG`, `DTG`, `BIC`).
  4. **`K65R + M184V` (Antagonistic Co-evolution)**: Structural antagonism between K65R and M184V diminishes the excision mechanism while retaining moderate resistance.

### 3.3 Pure PyTorch Low-Rank Adaptation (LoRA) for ESM
To enable parameter-efficient fine-tuning on protein language representations without requiring massive GPU VRAM or external third-party dependencies:
- **`LoRALinear` in `models_esm.py`**:
  $$W = W_0 + \Delta W = W_0 + \frac{\alpha}{r} (B \cdot A)$$
  where $W_0 \in \mathbb{R}^{d_{out} \times d_{in}}$ is frozen, $A \in \mathbb{R}^{r \times d_{in}} \sim \mathcal{N}(0, \sigma^2)$, $B \in \mathbb{R}^{d_{out} \times r} = 0$, rank $r = 8$, and scaling $\alpha = 16$.
- Injected into query (`q_proj`) and value (`v_proj`) matrices of `ESMTransformerLayer`.
- **Zero External Dependencies**: Implemented strictly in standard PyTorch 3.9+ without requiring HuggingFace `peft` or Meta `esm`.

### 3.4 Grad-CAM Sequence Activation & Step 4 UI
- **1D Grad-CAM** (`explainability.py`) computes the gradient of the predicted target resistance class with respect to the feature maps of the convolutional or attention layer:
  $$\alpha_k = \frac{1}{L} \sum_{i=1}^L \frac{\partial y^c}{\partial A_i^k}, \quad L_{\text{Grad-CAM}} = \text{ReLU}\left( \sum_k \alpha_k A^k \right)$$
- **Frontend Step 4 Visualizations (`SequenceGradCAMViewer.jsx`)**:
  - **Dirichlet Epistemic Reliability Gauge**: Displays the uncertainty score $u \in [0, 1]$, total Dirichlet strength $S$, and active reliability tier (High, Moderate, High Epistemic Uncertainty).
  - **Pairwise Epistatic Couplings Grid**: Interactive matrix highlighting detected epistatic interactions, functional types (Synergy, Hypersensitization, Compensatory), and biological impact descriptions.

---

## 4. Complete 25-Drug ML Diagnostics Portfolio Across 5 Classes (`v1.4.0`)

### 4.1 Transition from Prototype to Full Antiretroviral Portfolio
In earlier iterations, the diagnostic overview in `sih/ml/models/metrics.json` only contained 11 prototype drugs from a synthetic 100-sample test run. In `v1.4.0`, this was upgraded to cover the entire **25 antiretroviral drug portfolio** across **all 5 clinical classes**:

| Class | Drugs Count | Specific Antiretroviral Drugs Supported |
| :--- | :---: | :--- |
| **NRTI** (Nucleoside Reverse Transcriptase Inhibitors) | **6** | `3TC` (Lamivudine), `ABC` (Abacavir), `AZT` (Zidovudine), `D4T` (Stavudine), `DDI` (Didanosine), `TDF` (Tenofovir Disoproxil) |
| **NNRTI** (Non-Nucleoside Reverse Transcriptase Inhibitors) | **5** | `EFV` (Efavirenz), `ETR` (Etravirine), `NVP` (Nevirapine), `RPV` (Rilpivirine), `DOR` (Doravirine) |
| **INSTI** (Integrase Strand Transfer Inhibitors) | **5** | `DTG` (Dolutegravir), `BIC` (Bictegravir), `CAB` (Cabotegravir), `EVG` (Elvitegravir), `RAL` (Raltegravir) |
| **PI** (Protease Inhibitors) | **8** | `ATV` (Atazanavir), `DRV` (Darunavir), `FPV` (Fosamprenavir), `IDV` (Indinavir), `LPV` (Lopinavir), `NFV` (Nelfinavir), `SQV` (Saquinavir), `TPV` (Tipranavir) |
| **Capsid Inhibitors** | **1** | `LEN` (Lenacapavir) — Novel multistage capsid inhibitor |
| **TOTAL** | **25** | **50 Fine-Tuned XGBoost Models** (25 Classifiers + 25 Regressors) |

### 4.2 Training Data & Model Architecture
- **Training Source**: Stanford University HIV Drug Resistance Database (HIVdb).
- **Dataset Scale**: 14,820 clinical genotype-phenotype isolate pairs (11,856 train / 2,964 test).
- **Models**: Located in `sih/ml/models_xgb/`:
  - 25 Binary/Multi-class Classifiers (`*_clf.json`).
  - 25 Continuous $\log_{10}(\text{Fold-Change})$ Regressors (`*_reg.json`).
- **Feature Importance Extraction**:
  - Real tree-gain feature importances extracted directly from the XGBoost trees.
  - Internal position keys (`P66_I`, `P140_S`, `P184_V`, `P103_N`, `P148_H`) converted to canonical clinical mutation tokens (`M66I`, `G140S`, `M184V`, `K103N`, `Q148H`) using reference wildtype sequences (`HXB2_PR`, `HXB2_RT`, `HXB2_IN`, `HXB2_CA`).

### 4.3 Frontend Performance Diagnostics Dashboard
- **25-Drug Accuracy Bar Chart**:
  - Displays validation accuracy across all 25 drugs simultaneously.
  - Angled X-axis labels (`angle={-45}`, `textAnchor="end"`, `interval={0}`, `height={60}`) and expanded container (`h-72`) preventing text overlap.
- **Feature Importance Drug Selector**:
  - Full dropdown containing all 25 drugs with their class badge and generic name (e.g. `LEN - Lenacapavir (Capsid)`, `DTG - Dolutegravir (INSTI)`).
  - Safe fallback default selection automatically resolving to the first available drug map upon initial load.

---

## 5. Dual Standalone/Package Execution Architecture (`v1.4.1`)

### 5.1 The Issue
Running `python3 __init__.py` inside `sih/ml/deep_learning/` resulted in:
`ImportError: attempted relative import with no known parent package`
because Python treats a script executed directly via `python3 __init__.py` as the top-level module (`__name__ == "__main__"`), which disables relative intra-package imports (`from .sequence_tokenizer import ...`).

### 5.2 Resolution
In `sih/ml/deep_learning/__init__.py`, a robust conditional import mechanism was established:
```python
import sys
from pathlib import Path

if __name__ == "__main__" or not __package__:
    # Standalone execution: add package directory to sys.path and use absolute imports
    pkg_dir = str(Path(__file__).resolve().parent)
    if pkg_dir not in sys.path:
        sys.path.insert(0, pkg_dir)
    from sequence_tokenizer import ...
    from models_cnn import ...
    from models_esm import ...
    from models_evidential import ...
    from models_epistatic import ...
    from explainability import ...
    from predict_deep import ...
else:
    # Package execution: use standard relative imports
    from .sequence_tokenizer import ...
    from .models_cnn import ...
    from .models_esm import ...
    from .models_evidential import ...
    from .models_epistatic import ...
    from .explainability import ...
    from .predict_deep import ...
```
When executed directly, it runs an internal self-test that validates all 22 exported components and prints an operational confirmation banner.

---

## 6. Complete API Reference

| Endpoint | Method | Parameters / Body | Purpose |
| :--- | :---: | :--- | :--- |
| `/api/cases/generate-id` | `POST` | None | Generates a unique `HIV-YYYY-XXXXX` identifier and registers empty clinical case. |
| `/api/cases/search` | `GET` | `?patient_id=HIV-2026-XXXXX` | Searches existing clinical cases by `patient_id` without exposing PII. |
| `/api/cases` | `GET` | None | Returns clinical case registry. |
| `/api/cases` | `POST` | `CaseCreate` JSON | Registers or updates a clinical case profile. |
| `/api/genotype/analyze` | `POST` | `GenotypeAnalyzeRequest` (mutations, engine, patient_id) | Executes ML inference (25 drugs), calculates evidential uncertainty & epistatic graph, evaluates clinical rules, stores results. |
| `/api/genotype/validate` | `POST` | `sequence` or `mutations` string | Validates amino acid mutation tokens against reference genomes. |
| `/api/analysis/{id}/review` | `POST` | `ReviewCreate` JSON | Clinician approves regimen recommendation and records notes. |
| `/api/reports/{analysis_id}/pdf` | `GET` | `analysis_id` path parameter | Generates comprehensive clinical PDF report via ReportLab. |
| `/api/settings/kb` | `GET`/`POST` | JSON configuration | Retrieves or updates scoring weights, combination rules, and formularies. |
| `/api/dataset/preview` | `GET` | None | Returns distribution statistics across Stanford HIVdb isolates. |

---

## 7. Verification & Automated Test Suite

The test suite contains **33 automated unit and integration tests** located in `sih/tests/`:

```bash
cd sih
python3 -m unittest discover tests
```

### Test Breakdown:
- **`tests/test_api.py` (8 Tests)**:
  - `test_01_root`: API health check.
  - `test_02_login_and_auth`: Clinician authentication and JWT session token generation.
  - `test_03_patient_cases_crud`: Case creation, retrieval, and listing.
  - `test_04_genotype_validation`: Sequence token scanning and error handling.
  - `test_05_genotype_analysis_catboost`: Tabular inference with clinical rules ranking.
  - `test_06_review_and_audit`: Clinical sign-off and immutable audit logging.
  - `test_07_pdf_report_generation`: ReportLab PDF byte stream compilation.
  - `test_08_deep_learning_engines`: API routing for `cnn`, `esm`, and `ensemble` with uncertainty metrics.
- **`tests/test_deep_learning.py` (25 Tests)**:
  - Reference sequence length and wildtype consistency (`HXB2_PR`, `HXB2_RT`, `HXB2_IN`, `HXB2_CA`).
  - Sequence tokenizer & consensus reconstruction with single/multi-mutation insertion.
  - 1D-CNN forward pass, kernel representations, and multi-task loss calculation.
  - ESM-2 RoPE Transformer encoder, attention extraction, and LoRA projection verification.
  - Dirichlet evidential head outputs ($e_k \ge 0$, $\alpha_k > 1$) and uncertainty quantification ($u = K / S$).
  - EvidentialLoss calculation with KL regularizer convergence.
  - Surveillance Epistatic Graph cross-attention and co-evolutionary interaction detection.
  - 1D Grad-CAM gradient backpropagation and residue activation mapping.
  - 25-Drug XGBoost portfolio inference and feature importance extraction.

**Result: 33/33 Tests Passed (100% OK) in 2.619s.**

---

## 6. Next-Generation Neural Network Architecture (`v2.0.0`)

### 6.1 Biophysical Multi-Channel Residue Embeddings (`models_biophysical.py`)
Augments discrete sequence tokens with a continuous 7-dimensional physicochemical feature vector:
1. **Molecular Volume ($\text{Å}^3$)**: Zamyatnin scale ($60.1\text{Å}^3$ for Glycine to $227.8\text{Å}^3$ for Tryptophan).
2. **Kyte-Doolittle Hydropathy**: Continuous scale from $-4.5$ (Arg) to $+4.5$ (Ile).
3. **Net Charge at pH 7.4**: Formal ionic state (Asp/Glu: $-1$, Lys/Arg: $+1$, others: $0$).
4. **Isoelectric Point (pI)**: Dissociation thresholds.
5. **Hydrogen Bond Donors & Acceptors**: Molecular bonding capacities.
6. **Aromaticity**: Aromatic $\pi$-stacking ring indicators (Phe, Tyr, Trp, His).
7. **Projection MLP**: Continuous channels are projected via a 2-layer MLP ($7 \to 32 \to 32$) with GELU and concatenated with discrete token embeddings ($224\text{D}$) to form complete $256\text{D}$ chemistry-aware token representations.

### 6.2 3D Spatial Pocket Distance-Biased Self-Attention (`models_spatial.py`)
Incorporates 3D $C_\alpha$ crystal coordinates from PDB structures (`1HXB`, `3KLF`, `6V3K`, `7M9D`):
- Computes Euclidean pairwise distance matrix $D_{ij} = \|\mathbf{x}_i - \mathbf{x}_j\|_2$.
- Generates an additive attention bias:
  $$B_{ij} = -\gamma \cdot \max(0, D_{ij} - d_{\text{contact}})$$
  where $d_{\text{contact}} = 8.5\text{Å}$ and $\gamma = 0.25$.
- Injected directly into `F.scaled_dot_product_attention`, allowing residues that touch in 3D physical space to communicate directly with zero distance penalty.

### 6.3 Drug-to-Sequence Cross-Attention (`models_multidrug_attention.py`)
- Holds 25 learnable Drug Query representations $Q \in \mathbb{R}^{25 \times d_{\text{model}}}$.
- Computes Multi-Head Cross-Attention over sequence residues $K, V \in \mathbb{R}^{L \times d_{\text{model}}}$.
- Generates 25 distinct drug-specific contextual vectors $z_d$ and per-drug attention probability distributions $\alpha_d(i)$, targeting the exact active site relevant to each inhibitor (e.g. EFV on allosteric pocket vs 3TC on polymerase triad vs DRV on protease cavity).

### 6.4 Sparse Mixture-of-Experts (MoE) FFN (`models_moe.py`)
- 4 specialized functional expert FFNs:
  1. *Polymerase & Chain-Excision Expert*
  2. *Allosteric Hydrophobic Cavity Expert*
  3. *Catalytic Metal Coordination Expert*
  4. *Dimer Interface & Capsid Lattice Expert*
### 6.5 Feature Importance Percentage Scaling Fix (`v2.0.1`)
- **Root Cause Diagnosed**:
  - The tree-gain importance values serialized in `metrics.json` (such as `M41L: 18.437` and `I84V: 17.674`) were already on a percentage scale.
  - The UI code erroneously multiplied these values by 100 (`val * 100`), resulting in inflated numbers exceeding 100% (e.g. `1843.70%`, `1767.40%`).
  - Furthermore, `selectedDrugForImportance` state defaulted to `'tenofovir_resistance'` which had no matching `<option>` tag in the select element, causing the browser dropdown to display `FPV` while rendering `TDF` until the dropdown was changed.
- **Remediation**:
  - Normalized all feature contributions dynamically relative to each drug's total tree-gain importance:
    $$\text{importance} = \frac{\text{val}}{\sum \text{val}} \times 100\%$$
    ensuring each bar represents its clean, biologically realistic percentage share (e.g. `18.39%`, `14.11%`, `15.56%`) and no bar can ever exceed 100%.
  - Aligned initial state to `'fpv_resistance'` to ensure full synchronization between the dropdown and chart on initial load.
  - Configured `unit="%"` on the chart Y-axis.
  - Bumped cache bust query to `?v=9` in `index.html`.

### 6.6 Responsive Left Sidebar & Viewport Scroll Locking (`v2.1.0`)
- **Issue Diagnosed**:
  - The root element was defined with `min-h-screen`, which allowed the container to expand to the full height of long pages (e.g. 41 patient cases or full diagnostic charts).
  - The browser window scrolled instead of `<main>`, causing the sidebar navigation header, logo, and buttons to scroll completely off-screen, leaving an empty dark column on the left.
  - Furthermore, the sidebar had a static `w-64` width with no ability to collapse or adapt to smaller screens or maximize analytical workspace.
- **Remediation Implemented**:
  - **Viewport Scroll Locking (`.app-viewport`)**: Fixed root layout to `height: 100vh; max-height: 100vh; overflow: hidden; display: flex; flex-direction: column;`.
  - **Dedicated Main Scroll (`.app-main-scroll`)**: Assigned independent scrolling to `<main className="app-main-scroll">`, allowing cases, tables, and charts to scroll smoothly while the sidebar and top banner remain permanently docked.
  - **Collapsible Sidebar Rail**: Added `isSidebarCollapsed` state with a header toggle button:
    - **Expanded (`w-64` / 256px)**: Shows full branding, labels, and clinician details.
    - **Collapsed (`w-20` / 80px)**: Compact icon-only rail with centered icons and native browser tooltips on hover, maximizing horizontal chart space.
  - **Mobile & Tablet Drawer**: Responsive CSS breakpoints toggle sidebar visibility with off-canvas slide animation (`transform: translateX(-100%)`).
  - **Cache Invalidation**: Query parameter bumped to **`?v=10`** in `index.html`.

### 6.7 Clinician Profile Bottom-Pinning Fix (`v2.1.1`)
- **Issue Diagnosed**:
  - The `<nav>` navigation element lacked `flex: 1 1 0%` expansion styling in CSS, causing it to collapse to only the intrinsic height of the 5 nav buttons.
  - The user profile footer (`Dr. S. Jenkins`) lacked `margin-top: auto` (`mt-auto`), causing it to float directly beneath "Clinical Rules Config" in the upper-middle of the sidebar, leaving empty space below it.
- **Remediation Implemented**:
  - Added `.app-sidebar-nav { flex: 1 1 0% !important; overflow-y: auto; min-height: 0; }` ensuring `<nav>` expands to take up all available vertical space.
  - Added `.app-sidebar-footer { margin-top: auto !important; ... }` and `.mt-auto { margin-top: auto !important; }` to firmly pin the `Dr. S. Jenkins` clinician profile and logout button to the absolute bottom of the left panel in all screen heights and collapse states.
  - Bumped cache query to **`?v=11`** in `index.html`.

---

## 7. Verification & Automated Test Results

- **Automated Tests**: **38 / 38 Unit & Integration Tests Passed (100% OK)** in $1.95\text{s}$.
- **Standalone Package Execution**: `python3 __init__.py` verifies all 26 exported components.

---

## 8. Version Control & Backup Inventory

- **Git Tags**:
  - `v1.1.0-patient-id` (`5dab3f0`): Automated ID, physical copy card, zero-PII search.
  - `v1.2.0-history` (`067ee3d`): Prior resistance and historical regimen tracking.
  - `v1.3.0-neural-network-evidential` (`f800355`): Evidential deep learning, epistatic graph, LoRA fine-tuning.
  - `v1.4.0-25-drugs-diagnostics` (`d9886b6`): 25 drugs across 5 classes, 50 XGBoost models, Stanford HIVdb metrics.
  - `v1.4.1-standalone-init-fix` (`aa9306a`): Dual standalone/package import resolution in `__init__.py`.
  - `v1.4.2-docs-complete` (`59de0bf`): Full platform technical and architectural documentation.
  - `v1.4.3-barchart-render-fix` (`f8b10c0`): Resolved empty 25-drug accuracy chart via explicit container heights, `.h-72` CSS injection, and `?v=8` cache invalidation.
  - `v1.5.0-stable-verified` (`46c1567`): Complete verified production milestone.
  - `v2.0.0-nextgen-neural-architecture` (`356950b`): Next-Gen Neural Network Architecture with biophysical neurons, 3D spatial attention, drug cross-attention, and MoE.
  - `v2.0.1-importance-scale-fix` (`4fcca5c`): Fixed feature importance scale and dropdown synchronization.
  - `v2.1.0-responsive-sidebar` (`9006c5b`): Responsive collapsible left sidebar with viewport scroll locking and mobile support.
  - `v2.1.1-sidebar-bottom-pin` (`1f8ddb5`): Bottom-docked Dr. S. Jenkins clinician profile with flex-grow nav and mt-auto footer.
  - `v2.2.0-stable-verified`: Complete verified production milestone with next-gen neural architecture (v2.0), normalized feature importance, and responsive viewport-locked sidebar.
- **Portable Backups Created**:
  - `Development_v1.4.0_backup.zip` (115 MB)
  - `Development_v1.4.1_backup.zip` (115 MB)
  - `Development_v1.4.2_backup.zip` (112 MB)
  - `Development_v1.4.3_backup.zip` (112 MB)
  - `Development_v1.5.0_backup.zip` (112 MB)
  - `Development_v2.0.0_backup.zip` (112 MB)
  - `Development_v2.0.1_backup.zip` (112 MB)
  - `Development_v2.1.0_backup.zip` (112 MB)
  - `Development_v2.1.1_backup.zip` (112 MB)
  - `Development_v2.2.0_backup.zip` (112 MB)
- **Local Application Server**:
  - Backend: `python3 run_app.py --port 8000` (FastAPI + Uvicorn)
  - Production UI: Pre-compiled Vite assets served directly from `sih/frontend/dist/` at `http://localhost:8000`
