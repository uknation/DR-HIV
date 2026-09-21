"""
HIV Sequence Tokenizer and Consensus Alignment Subsystem.
Reconstructs full physical amino acid sequences from patient mutation lists
and aligns them with standard HXB2 HIV-1 wildtype reference proteins.
"""

import re
import torch
from typing import List, Dict, Union, Optional

# Standard HIV-1 Reference Sequences (HXB2 Consensus)
HXB2_PR = "PQITLWQRPLVTIKIGGQLKEALLDTGADDTVLEEMNLPGRWKPKMIGGIGGFIKVRQYDQILIEICGHKAIGTVLVGPTPVNIIGRNLLTQIGCTLNF" # 99 AA
HXB2_RT = (
    "PISPIETVPVKLKPGMDGPKVKQWPLTEEKIKALVEICTEMEKEGKISKIGPENPYNTPVFAIKKKDSTKWRKLVDFRELNKRTQDFWEVQLGIPHPAGL"
    "KKKKSVTVLDVGDAYFSVPLDEDFRKYTAFTIPSINNETPGIRYQYNVLPQGWKGSPAIFQSSMTKILEPFRKQNPDIVIYQYMDDLYVGSDLEIGQHR"
    "TKIEELRQHLLRWGLTTPDKKHQKEPPFLWMGYELHPDKWT"
) # Exactly 240 AA
HXB2_IN = (
    "FLDGIDKAQEEHEKYHSNWRAMASDFNLPPVVAKEIVASCDKCQLKGEAMHGQVDCSPGIWQLDCTHLEGKVILVAVHVASGYIEAEVIPAETGQETAY"
    "FLLKLAGRWPVKTVHTDNGSNFTSTTVKAACWWAGIKQEFGIPYNPQSQGVVESMNKELKKIIGQVRDQAEHLKTAVQMAVFIHNFKRKGGIGGYSAGE"
    "RIVDIIATDIQTKELQKQITKIQNFRVYYRDSRDPLWKGPAKLLWKGEGAVVIQDNSDIKVVPRRKAKIIRDYGKQMAGDDCVASRQDED"
) # 288 AA
HXB2_CA = (
    "PIVQNIQGQMVHQAISPRTLNAWVKVVEEKAFSPEVIPMFSALSEGATPQDLNTMLNTVGGHQAAMQMLKETINEEAAEWDRVHPVHAGPIAPGQMREPR"
    "GSDIAGTTSTLQEQIGWMTNNPPIPVGEIYKRWIILGLNKIVRMYSPTSILDIRQGPKEPFRDYVDRFYKTLRAEQASQEVKNWMTETLLVQNANPDCK"
    "TILKALGPAATLEEMMTACQGVGGPGHKARVL"
) # 231 AA

REFERENCE_SEQUENCES = {
    "PR": HXB2_PR,
    "PI": HXB2_PR,
    "RT": HXB2_RT,
    "NRTI": HXB2_RT,
    "NNRTI": HXB2_RT,
    "IN": HXB2_IN,
    "INSTI": HXB2_IN,
    "CA": HXB2_CA,
    "CAPSID": HXB2_CA
}

# 20 Standard Amino Acids + Special Tokens
AMINO_ACIDS = ["A", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "V", "W", "Y"]
SPECIAL_TOKENS = ["<PAD>", "<UNK>", "-", ".", "*", "X"]

VOCAB = SPECIAL_TOKENS + AMINO_ACIDS
AA_TO_IDX = {aa: idx for idx, aa in enumerate(VOCAB)}
IDX_TO_AA = {idx: aa for idx, aa in enumerate(VOCAB)}
PAD_IDX = AA_TO_IDX["<PAD>"]
UNK_IDX = AA_TO_IDX["<UNK>"]

def parse_mutation_token(mut_token: str):
    """
    Parses a mutation string like 'M184V' or 'T215Y/F' or 'D30N'.
    Returns (wildtype_aa, pos, mutant_aa).
    """
    match = re.match(r'^([A-Z\-\*]?)([0-9]+)([A-Z\-\*\./]+)$', mut_token.strip().upper())
    if match:
        wt, pos_str, mut = match.groups()
        pos = int(pos_str)
        # In case of mixtures like Y/F, take the primary mutant
        mut_char = mut.split('/')[0][0]
        return wt, pos, mut_char
    return None, None, None

def reconstruct_sequence(mutations: Union[List[str], str], gene_type: str = "PR") -> str:
    """
    Reconstructs the full amino acid sequence by overlaying mutations onto HXB2 wildtype.
    
    Parameters:
      - mutations: list of mutation strings (e.g. ['M184V', 'K103N']) or semicolon-separated string.
      - gene_type: 'PR' (Protease), 'RT' (Reverse Transcriptase), 'IN' (Integrase).
      
    Returns:
      - Full-length string of amino acids.
    """
    gene_key = gene_type.upper()
    if gene_key not in REFERENCE_SEQUENCES:
        raise ValueError(f"Unknown gene_type: {gene_type}. Choose from {list(REFERENCE_SEQUENCES.keys())}")
        
    ref_seq = list(REFERENCE_SEQUENCES[gene_key])
    seq_len = len(ref_seq)
    
    if isinstance(mutations, str):
        if ";" in mutations:
            mutations_list = mutations.split(";")
        elif "," in mutations:
            mutations_list = mutations.split(",")
        else:
            mutations_list = mutations.split()
    else:
        mutations_list = mutations or []
        
    for mut in mutations_list:
        if not mut or mut.lower() == "none":
            continue
        wt, pos, mutant_aa = parse_mutation_token(mut)
        if pos is not None and 1 <= pos <= seq_len:
            # If wildtype residue is given and doesn't match reference at this position,
            # the mutation belongs to a different HIV protein domain
            if wt and wt != ref_seq[pos - 1]:
                continue
            # 1-indexed to 0-indexed
            ref_seq[pos - 1] = mutant_aa if mutant_aa in AA_TO_IDX else "X"
            
    return "".join(ref_seq)

def parse_stanford_columns(row_dict: Dict[str, str], gene_type: str = "PR") -> str:
    """
    Reconstructs sequence from Stanford HIVdb dataset row containing P1, P2, ... Pn columns.
    Where '-' means wildtype, and letters represent mutations.
    """
    gene_key = gene_type.upper()
    ref_seq = list(REFERENCE_SEQUENCES[gene_key])
    seq_len = len(ref_seq)
    
    for pos in range(1, seq_len + 1):
        col_name = f"P{pos}"
        if col_name in row_dict:
            val = str(row_dict[col_name]).strip().upper()
            if val and val != "-" and val != "NAN":
                ref_seq[pos - 1] = val[0] if val[0] in AA_TO_IDX else "X"
                
    return "".join(ref_seq)

def tokenize_sequence(sequence_str: str, max_len: Optional[int] = None) -> torch.Tensor:
    """
    Converts amino acid string to 1D integer Tensor using vocabulary indices.
    """
    indices = [AA_TO_IDX.get(char, UNK_IDX) for char in sequence_str.upper()]
    if max_len is not None:
        if len(indices) < max_len:
            indices += [PAD_IDX] * (max_len - len(indices))
        else:
            indices = indices[:max_len]
    return torch.tensor(indices, dtype=torch.long)

def batch_tokenize(sequences: List[str], max_len: Optional[int] = None) -> torch.Tensor:
    """
    Tokenizes a batch of sequence strings into a 2D Tensor (batch_size, seq_len).
    """
    if max_len is None:
        max_len = max(len(s) for s in sequences) if sequences else 100
    tensor_list = [tokenize_sequence(s, max_len=max_len) for s in sequences]
    return torch.stack(tensor_list, dim=0)

if __name__ == "__main__":
    # Test reconstruction
    pr_seq = reconstruct_sequence(["D30N", "M46I", "I84V"], gene_type="PR")
    print(f"Reconstructed PR Sequence ({len(pr_seq)} AA): {pr_seq[:30]}...{pr_seq[-10:]}")
    tokens = tokenize_sequence(pr_seq)
    print(f"Token tensor shape: {tokens.shape}")
    assert len(pr_seq) == 99
    assert pr_seq[29] == "N" # D30N (0-indexed 29)
    assert pr_seq[45] == "I" # M46I (0-indexed 45)
    assert pr_seq[83] == "V" # I84V (0-indexed 83)
    print("Tokenizer verified successfully!")
