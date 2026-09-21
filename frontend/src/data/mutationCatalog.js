/**
 * Clinically Curated Catalog of HIV-1 Drug Resistance Mutations (WHO & Stanford HIVdb).
 * Categorized by drug class, target gene, and primary resistance profile.
 */

export const MUTATION_CATALOG = [
  // --- NRTI Mutations (Reverse Transcriptase) ---
  { id: 'M184V', name: 'M184V', gene: 'RT', class: 'NRTI', impact: 'High-level 3TC/FTC resistance; hypersensitizes to TDF/AZT', frequency: 'High' },
  { id: 'M184I', name: 'M184I', gene: 'RT', class: 'NRTI', impact: 'Transient 3TC/FTC high resistance', frequency: 'Moderate' },
  { id: 'K65R', name: 'K65R', gene: 'RT', class: 'NRTI', impact: 'Broad cross-resistance to TDF, ABC, 3TC, FTC', frequency: 'High' },
  { id: 'T215Y', name: 'T215Y', gene: 'RT', class: 'NRTI', impact: 'Thymidine analogue mutation (TAM-1); high AZT resistance', frequency: 'High' },
  { id: 'T215F', name: 'T215F', gene: 'RT', class: 'NRTI', impact: 'Thymidine analogue mutation (TAM-1)', frequency: 'Moderate' },
  { id: 'M41L', name: 'M41L', gene: 'RT', class: 'NRTI', impact: 'TAM-1; AZT/TDF reduced susceptibility', frequency: 'High' },
  { id: 'L210W', name: 'L210W', gene: 'RT', class: 'NRTI', impact: 'TAM-1; synergistic multi-NRTI resistance', frequency: 'Moderate' },
  { id: 'D67N', name: 'D67N', gene: 'RT', class: 'NRTI', impact: 'TAM-2; intermediate AZT/d4T resistance', frequency: 'Moderate' },
  { id: 'K70R', name: 'K70R', gene: 'RT', class: 'NRTI', impact: 'TAM-2; AZT/TDF resistance pathway', frequency: 'Moderate' },
  { id: 'K219Q', name: 'K219Q', gene: 'RT', class: 'NRTI', impact: 'TAM-2 accessory mutation', frequency: 'Moderate' },
  { id: 'K219E', name: 'K219E', gene: 'RT', class: 'NRTI', impact: 'TAM-2 accessory mutation', frequency: 'Low' },
  { id: 'L74V', name: 'L74V', gene: 'RT', class: 'NRTI', impact: 'High ABC/ddI resistance', frequency: 'Moderate' },
  { id: 'L74I', name: 'L74I', gene: 'RT', class: 'NRTI', impact: 'Intermediate ABC resistance', frequency: 'Low' },
  { id: 'Y115F', name: 'Y115F', gene: 'RT', class: 'NRTI', impact: 'Abacavir (ABC) specific resistance', frequency: 'Moderate' },
  { id: 'Q151M', name: 'Q151M', gene: 'RT', class: 'NRTI', impact: 'Multi-NRTI complex major mutation', frequency: 'Low' },

  // --- NNRTI Mutations (Reverse Transcriptase) ---
  { id: 'K103N', name: 'K103N', gene: 'RT', class: 'NNRTI', impact: 'High-level EFV/NVP cross-resistance (>50-fold)', frequency: 'High' },
  { id: 'K103S', name: 'K103S', gene: 'RT', class: 'NNRTI', impact: 'High-level EFV/NVP resistance', frequency: 'Low' },
  { id: 'Y181C', name: 'Y181C', gene: 'RT', class: 'NNRTI', impact: 'Broad cross-resistance to NVP, EFV, ETR, RPV', frequency: 'High' },
  { id: 'Y181I', name: 'Y181I', gene: 'RT', class: 'NNRTI', impact: 'High-level NVP/EFV/ETR/RPV resistance', frequency: 'Low' },
  { id: 'Y181V', name: 'Y181V', gene: 'RT', class: 'NNRTI', impact: 'High-level NNRTI cross-resistance', frequency: 'Low' },
  { id: 'G190A', name: 'G190A', gene: 'RT', class: 'NNRTI', impact: 'High-level NVP, intermediate EFV resistance', frequency: 'High' },
  { id: 'G190S', name: 'G190S', gene: 'RT', class: 'NNRTI', impact: 'High-level NVP/EFV resistance', frequency: 'Low' },
  { id: 'Y188L', name: 'Y188L', gene: 'RT', class: 'NNRTI', impact: 'Extreme high-level EFV/NVP resistance (>100-fold)', frequency: 'Moderate' },
  { id: 'K101E', name: 'K101E', gene: 'RT', class: 'NNRTI', impact: 'Reduced susceptibility to EFV, NVP, RPV, ETR', frequency: 'Moderate' },
  { id: 'K101P', name: 'K101P', gene: 'RT', class: 'NNRTI', impact: 'High-level NNRTI cross-resistance', frequency: 'Low' },
  { id: 'E138K', name: 'E138K', gene: 'RT', class: 'NNRTI', impact: 'Rilpivirine (RPV) & Etravirine (ETR) resistance', frequency: 'High' },
  { id: 'E138A', name: 'E138A', gene: 'RT', class: 'NNRTI', impact: 'Intermediate RPV resistance', frequency: 'Moderate' },
  { id: 'V106M', name: 'V106M', gene: 'RT', class: 'NNRTI', impact: 'Subtype C signature; high EFV/NVP resistance', frequency: 'High' },
  { id: 'V106A', name: 'V106A', gene: 'RT', class: 'NNRTI', impact: 'High-level NVP, intermediate EFV resistance', frequency: 'Moderate' },
  { id: 'H221Y', name: 'H221Y', gene: 'RT', class: 'NNRTI', impact: 'Secondary NNRTI accessory mutation', frequency: 'Low' },
  { id: 'P225H', name: 'P225H', gene: 'RT', class: 'NNRTI', impact: 'Synergistic with K103N on EFV resistance', frequency: 'Moderate' },
  { id: 'M230L', name: 'M230L', gene: 'RT', class: 'NNRTI', impact: 'Broad cross-resistance across all NNRTIs', frequency: 'Low' },

  // --- INSTI Mutations (Integrase Strand Transfer Inhibitors) ---
  { id: 'Q148H', name: 'Q148H', gene: 'IN', class: 'INSTI', impact: 'High-level DTG/BIC/RAL resistance when with G140S', frequency: 'High' },
  { id: 'Q148R', name: 'Q148R', gene: 'IN', class: 'INSTI', impact: 'Major DTG/BIC/RAL resistance pathway', frequency: 'High' },
  { id: 'Q148K', name: 'Q148K', gene: 'IN', class: 'INSTI', impact: 'Major DTG/BIC/RAL resistance pathway', frequency: 'Moderate' },
  { id: 'N155H', name: 'N155H', gene: 'IN', class: 'INSTI', impact: 'High RAL/EVG resistance; low effect on DTG/BIC alone', frequency: 'High' },
  { id: 'Y143R', name: 'Y143R', gene: 'IN', class: 'INSTI', impact: 'Raltegravir (RAL) specific high resistance', frequency: 'Moderate' },
  { id: 'Y143C', name: 'Y143C', gene: 'IN', class: 'INSTI', impact: 'Raltegravir (RAL) specific resistance', frequency: 'Low' },
  { id: 'R263K', name: 'R263K', gene: 'IN', class: 'INSTI', impact: 'Dolutegravir (DTG) signature selection mutation', frequency: 'High' },
  { id: 'G140S', name: 'G140S', gene: 'IN', class: 'INSTI', impact: 'Compensatory secondary mutation for Q148H/R', frequency: 'High' },
  { id: 'G140A', name: 'G140A', gene: 'IN', class: 'INSTI', impact: 'Compensatory mutation for Q148K', frequency: 'Moderate' },
  { id: 'T66I', name: 'T66I', gene: 'IN', class: 'INSTI', impact: 'Elvitegravir (EVG) specific resistance', frequency: 'Low' },
  { id: 'E92Q', name: 'E92Q', gene: 'IN', class: 'INSTI', impact: 'High EVG, intermediate RAL resistance', frequency: 'Moderate' },
  { id: 'S147G', name: 'S147G', gene: 'IN', class: 'INSTI', impact: 'Elvitegravir (EVG) resistance', frequency: 'Low' },

  // --- PI Mutations (Protease Inhibitors) ---
  { id: 'D30N', name: 'D30N', gene: 'PR', class: 'PI', impact: 'Nelfinavir (NFV) specific major mutation', frequency: 'High' },
  { id: 'M46I', name: 'M46I', gene: 'PR', class: 'PI', impact: 'Protease flap major mutation (ATV, FPV, IDV, LPV)', frequency: 'High' },
  { id: 'M46L', name: 'M46L', gene: 'PR', class: 'PI', impact: 'Protease flap mutation', frequency: 'Moderate' },
  { id: 'I84V', name: 'I84V', gene: 'PR', class: 'PI', impact: 'Active site major mutation across all PIs including DRV', frequency: 'High' },
  { id: 'I84A', name: 'I84A', gene: 'PR', class: 'PI', impact: 'Active site major mutation', frequency: 'Low' },
  { id: 'V82A', name: 'V82A', gene: 'PR', class: 'PI', impact: 'Substrate cavity major mutation (LPV, IDV)', frequency: 'High' },
  { id: 'V82T', name: 'V82T', gene: 'PR', class: 'PI', impact: 'Substrate cavity mutation', frequency: 'Moderate' },
  { id: 'V82F', name: 'V82F', gene: 'PR', class: 'PI', impact: 'Broad PI resistance', frequency: 'Moderate' },
  { id: 'V82S', name: 'V82S', gene: 'PR', class: 'PI', impact: 'Tipranavir / LPV resistance', frequency: 'Low' },
  { id: 'L90M', name: 'L90M', gene: 'PR', class: 'PI', impact: 'Core catalytic scaffold major mutation (SQV, NFV, ATV, IDV)', frequency: 'High' },
  { id: 'I50V', name: 'I50V', gene: 'PR', class: 'PI', impact: 'Amprenavir/Darunavir signature flap mutation', frequency: 'Moderate' },
  { id: 'I50L', name: 'I50L', gene: 'PR', class: 'PI', impact: 'Atazanavir (ATV) specific high resistance', frequency: 'Moderate' },
  { id: 'I54V', name: 'I54V', gene: 'PR', class: 'PI', impact: 'Flap region secondary mutation', frequency: 'Moderate' },
  { id: 'I54M', name: 'I54M', gene: 'PR', class: 'PI', impact: 'Flap region secondary mutation', frequency: 'Low' },
  { id: 'I54L', name: 'I54L', gene: 'PR', class: 'PI', impact: 'Flap region secondary mutation', frequency: 'Low' },
  { id: 'L76V', name: 'L76V', gene: 'PR', class: 'PI', impact: 'Darunavir & Lopinavir resistance', frequency: 'Moderate' },
  { id: 'N88D', name: 'N88D', gene: 'PR', class: 'PI', impact: 'Nelfinavir resistance', frequency: 'Moderate' },
  { id: 'N88S', name: 'N88S', gene: 'PR', class: 'PI', impact: 'Atazanavir high resistance', frequency: 'Low' },
  { id: 'L33F', name: 'L33F', gene: 'PR', class: 'PI', impact: 'PI accessory mutation', frequency: 'Moderate' },
  { id: 'V32I', name: 'V32I', gene: 'PR', class: 'PI', impact: 'Darunavir / Lopinavir resistance', frequency: 'Low' },
  { id: 'I47V', name: 'I47V', gene: 'PR', class: 'PI', impact: 'Darunavir resistance', frequency: 'Low' },
  { id: 'I47A', name: 'I47A', gene: 'PR', class: 'PI', impact: 'Lopinavir resistance', frequency: 'Low' },

  // --- Capsid Inhibitor Mutations (Capsid p24) ---
  { id: 'M66I', name: 'M66I', gene: 'CA', class: 'Capsid', impact: 'Major Lenacapavir (LEN) resistance mutation (>100-fold)', frequency: 'High' },
  { id: 'Q67H', name: 'Q67H', gene: 'CA', class: 'Capsid', impact: 'Lenacapavir intermediate resistance & accessory mutation', frequency: 'Moderate' },
  { id: 'K70R', name: 'K70R', gene: 'CA', class: 'Capsid', impact: 'Lenacapavir accessory resistance mutation', frequency: 'Moderate' },
  { id: 'N74D', name: 'N74D', gene: 'CA', class: 'Capsid', impact: 'Major Lenacapavir resistance pathway (10-30 fold)', frequency: 'High' },
  { id: 'A105T', name: 'A105T', gene: 'CA', class: 'Capsid', impact: 'Lenacapavir accessory mutation', frequency: 'Moderate' },
  { id: 'T107N', name: 'T107N', gene: 'CA', class: 'Capsid', impact: 'Lenacapavir reduced susceptibility', frequency: 'Moderate' }
];

export const DRUG_CLASSES = ['All', 'NRTI', 'NNRTI', 'INSTI', 'PI', 'Capsid'];
