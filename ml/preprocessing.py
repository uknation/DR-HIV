import os
import pandas as pd
import numpy as np

# Fixed list of 25 unique mutations identified in the dataset
ALL_MUTATIONS = [
    'D30N', 'D67N', 'E138K', 'G190A', 'I54V', 'I84V', 'K103N', 'K219Q', 'K65R', 'K70R',
    'L74V', 'L90M', 'M184V', 'M46I', 'N155H', 'P225H', 'Q148H', 'Q148R', 'R263K', 'T215Y',
    'V106M', 'V32I', 'V82A', 'Y143R', 'Y181C'
]

# Fixed list of 4 key mutation interaction pairs
MUTATION_INTERACTIONS = [
    ('M184V', 'K65R'),
    ('M184V', 'K103N'),
    ('T215Y', 'M184V'),
    ('L90M', 'M46I')
]

# Supported values for categorical clinical features to prevent column mismatch in inference
CATEGORICAL_LEVELS = {
    'subtype': ['A1', 'B', 'C', 'CRF01_AE', 'CRF02_AG'],
    'viral_load_category': ['Low', 'Moderate', 'High', 'Unknown'],
    'cd4_category': ['Very_Low', 'Low', 'Moderate', 'High', 'Unknown'],
    'adherence_category': ['Good', 'Moderate', 'Poor', 'Unknown']
}

def clean_and_impute(df):
    """Fills missing values with defaults for clinical features."""
    df_clean = df.copy()
    
    # Impute missing clinical characteristics
    df_clean['subtype'] = df_clean.get('subtype', pd.Series(dtype=str)).fillna('C')
    if 'subtype' not in df_clean.columns:
        df_clean['subtype'] = 'C'
    df_clean['viral_load_category'] = df_clean['viral_load_category'].fillna('Unknown')
    df_clean['cd4_category'] = df_clean['cd4_category'].fillna('Unknown')
    df_clean['adherence_category'] = df_clean['adherence_category'].fillna('Unknown')
    
    # Comorbidity flag: Present or None
    df_clean['comorbidity_flag'] = df_clean['comorbidity_flag'].fillna('None')
    df_clean['comorbidity_flag'] = df_clean['comorbidity_flag'].apply(lambda x: 'Present' if x == 'Present' else 'None')
    
    # Previous ART failure and treatment history are fully populated, but ensure clean strings
    df_clean['treatment_history'] = df_clean['treatment_history'].fillna('Treatment_Naive')
    df_clean['previous_art_failure'] = df_clean['previous_art_failure'].fillna('No')
    
    return df_clean

def parse_mutations(df):
    """
    Parses semicolon-separated mutation columns and returns binary indicator columns.
    Ensures all 25 mutations in ALL_MUTATIONS have a binary column.
    """
    df_muts = df.copy()
    
    # Initialize binary columns for all mutations
    for mut in ALL_MUTATIONS:
        df_muts[f'mut_{mut}'] = 0
        
    mutation_cols = ['nrtI_mutations', 'nnrti_mutations', 'pi_mutations', 'insti_mutations']
    
    for idx, row in df_muts.iterrows():
        detected_muts = set()
        
        # 1. Parse lists from semicolon columns
        for col in mutation_cols:
            val = str(row.get(col, ''))
            if val and val != 'nan' and val != 'None':
                parts = [p.strip() for p in val.split(';')]
                detected_muts.update(parts)
                
        # 2. Check also if binary indicator columns exist in original df and are 1
        for mut in ALL_MUTATIONS:
            orig_col = f'{mut}_present'
            if orig_col in df_muts.columns and row[orig_col] == 1:
                detected_muts.add(mut)
                
        # 3. Set binary values
        for mut in detected_muts:
            if mut in ALL_MUTATIONS:
                df_muts.at[idx, f'mut_{mut}'] = 1
                
    return df_muts

def encode_features(df):
    """
    Encodes clinical features to numeric representations.
    Returns feature matrix X and targets.
    """
    df_encoded = df.copy()
    
    # Binary variables (0 or 1)
    df_encoded['feat_treatment_history_treated'] = (df_encoded['treatment_history'] == 'Previously_Treated').astype(int)
    df_encoded['feat_prev_failure_yes'] = (df_encoded['previous_art_failure'] == 'Yes').astype(int)
    df_encoded['feat_comorbidity_present'] = (df_encoded['comorbidity_flag'] == 'Present').astype(int)
    
    # One-hot encode multi-level categorical variables using predefined levels
    for col, levels in CATEGORICAL_LEVELS.items():
        for level in levels:
            df_encoded[f'feat_{col}_{level}'] = (df_encoded[col] == level).astype(int)
            
    # Add mutation interaction features
    for m1, m2 in MUTATION_INTERACTIONS:
        feat_name = f'mut_int_{m1}_{m2}'
        m1_col = f'mut_{m1}'
        m2_col = f'mut_{m2}'
        if m1_col in df_encoded.columns and m2_col in df_encoded.columns:
            df_encoded[feat_name] = (df_encoded[m1_col] * df_encoded[m2_col]).astype(int)
        else:
            df_encoded[feat_name] = 0
            
    # Compile the final input feature list
    feature_cols = []
    
    # Add mutation indicators
    feature_cols.extend([f'mut_{mut}' for mut in ALL_MUTATIONS])
    
    # Add mutation interaction indicators
    feature_cols.extend([f'mut_int_{m1}_{m2}' for m1, m2 in MUTATION_INTERACTIONS])
    
    # Add clinical indicators
    feature_cols.extend(['feat_treatment_history_treated', 'feat_prev_failure_yes', 'feat_comorbidity_present'])
    for col, levels in CATEGORICAL_LEVELS.items():
        feature_cols.extend([f'feat_{col}_{level}' for level in levels])
        
    return df_encoded, feature_cols

def preprocess_dataframe(df):
    """
    Combines cleaning, parsing mutations, and feature encoding.
    Returns X (features) and a dictionary of targets.
    """
    df_clean = clean_and_impute(df)
    df_mut = parse_mutations(df_clean)
    df_encoded, feature_cols = encode_features(df_mut)
    
    # Targets for drug resistance models
    res_cols = [
        'tenofovir_resistance', 'lamivudine_resistance', 'emtricitabine_resistance',
        'abacavir_resistance', 'zidovudine_resistance', 'efavirenz_resistance',
        'nevirapine_resistance', 'rilpivirine_resistance', 'dolutegravir_resistance',
        'bictegravir_resistance', 'darunavir_resistance'
    ]
    
    targets = {}
    for col in res_cols:
        if col in df_encoded.columns:
            # Map classes: Susceptible -> 0, Reduced -> 1, High -> 2
            # Handle binary cases too: Susceptible -> 0, High -> 2 (or 1 depending on mapping)
            targets[col] = df_encoded[col].map({'Susceptible': 0, 'Reduced': 1, 'High': 2}).fillna(0).astype(int)
            
    if 'model_target' in df_encoded.columns:
        targets['model_target'] = df_encoded['model_target']
        
    X = df_encoded[feature_cols]
    return X, targets, feature_cols

def preprocess_single_input(mutations_list, clinical_data):
    """
    Preprocesses a single case (e.g. from UI) to format it for ML prediction.
    - mutations_list: list of strings (e.g. ['M184V', 'K103N'])
    - clinical_data: dict of values for subtype, cd4_category, viral_load_category,
                     treatment_history, previous_art_failure, adherence_category, comorbidity_flag
    """
    # Initialize inputs
    features = {}
    
    # 1. Mutations
    for mut in ALL_MUTATIONS:
        features[f'mut_{mut}'] = 1 if mut in mutations_list else 0
        
    # 1.5 Mutation Interactions
    for m1, m2 in MUTATION_INTERACTIONS:
        features[f'mut_int_{m1}_{m2}'] = 1 if (m1 in mutations_list and m2 in mutations_list) else 0
        
    # 2. Binary clinical features
    features['feat_treatment_history_treated'] = 1 if clinical_data.get('treatment_history') == 'Previously_Treated' else 0
    features['feat_prev_failure_yes'] = 1 if clinical_data.get('previous_art_failure') == 'Yes' else 0
    features['feat_comorbidity_present'] = 1 if clinical_data.get('comorbidity_flag') == 'Present' else 0
    
    # 3. Categorical clinical features
    for col, levels in CATEGORICAL_LEVELS.items():
        val = clinical_data.get(col, 'Unknown')
        # Default fallback
        if val not in levels:
            val = 'Unknown'
        for level in levels:
            features[f'feat_{col}_{level}'] = 1 if val == level else 0
            
    # Return as DataFrame matching training shape
    # The columns must match the exact feature order
    feature_cols = []
    feature_cols.extend([f'mut_{mut}' for mut in ALL_MUTATIONS])
    feature_cols.extend([f'mut_int_{m1}_{m2}' for m1, m2 in MUTATION_INTERACTIONS])
    feature_cols.extend(['feat_treatment_history_treated', 'feat_prev_failure_yes', 'feat_comorbidity_present'])
    for col, levels in CATEGORICAL_LEVELS.items():
        feature_cols.extend([f'feat_{col}_{level}' for level in levels])
        
    df_single = pd.DataFrame([features])[feature_cols]
    return df_single
