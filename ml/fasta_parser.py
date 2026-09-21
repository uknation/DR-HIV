"""
FASTA Sequence Ingestion and Codon Mutation Extraction Engine.
Supports raw DNA nucleotide and amino acid FASTA sequences for HIV-1 PR, RT, and IN.
Aligns sequences against standard HXB2 wildtype reference proteins and extracts resistance mutations.
"""

import re
from typing import Dict, List, Any, Tuple, Optional

# Standard Genetic Code
CODON_TABLE = {
    'ATA':'I', 'ATC':'I', 'ATT':'I', 'ATG':'M',
    'ACA':'T', 'ACC':'T', 'ACG':'T', 'ACT':'T',
    'AAC':'N', 'AAT':'N', 'AAA':'K', 'AAG':'K',
    'AGC':'S', 'AGT':'S', 'AGA':'R', 'AGG':'R',
    'CTA':'L', 'CTC':'L', 'CTG':'L', 'CTT':'L',
    'CCA':'P', 'CCC':'P', 'CCG':'P', 'CCT':'P',
    'CAC':'H', 'CAT':'H', 'CAA':'Q', 'CAG':'Q',
    'CGA':'R', 'CGC':'R', 'CGG':'R', 'CGT':'R',
    'GTA':'V', 'GTC':'V', 'GTG':'V', 'GTT':'V',
    'GCA':'A', 'GCC':'A', 'GCG':'A', 'GCT':'A',
    'GAC':'D', 'GAT':'D', 'GAA':'E', 'GAG':'E',
    'GGA':'G', 'GGC':'G', 'GGG':'G', 'GGT':'G',
    'TCA':'S', 'TCC':'S', 'TCG':'S', 'TCT':'S',
    'TTC':'F', 'TTT':'F', 'TTA':'L', 'TTG':'L',
    'TAC':'Y', 'TAT':'Y', 'TAA':'*', 'TAG':'*',
    'TGC':'C', 'TGT':'C', 'TGA':'*', 'TGG':'W',
}

# Standard HXB2 References
try:
    from ml.deep_learning.sequence_tokenizer import HXB2_PR, HXB2_RT, HXB2_IN, HXB2_CA
except ImportError:
    try:
        from deep_learning.sequence_tokenizer import HXB2_PR, HXB2_RT, HXB2_IN, HXB2_CA
    except ImportError:
        from sih.ml.deep_learning.sequence_tokenizer import HXB2_PR, HXB2_RT, HXB2_IN, HXB2_CA

GENE_REFERENCES = {
    "PR": {"seq": HXB2_PR, "name": "Protease", "len": 99},
    "RT": {"seq": HXB2_RT, "name": "Reverse Transcriptase", "len": 240},
    "IN": {"seq": HXB2_IN, "name": "Integrase", "len": 288},
    "CA": {"seq": HXB2_CA, "name": "Capsid", "len": 231}
}

def clean_fasta_text(fasta_text: str) -> Tuple[str, str]:
    """Extracts header and clean uppercase sequence from FASTA string."""
    lines = fasta_text.strip().splitlines()
    header = "Unnamed Sequence"
    seq_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith(">"):
            header = line[1:].strip()
        else:
            seq_lines.append(line)
            
    raw_seq = "".join(seq_lines).upper().replace(" ", "")
    return header, raw_seq

def is_nucleotide_sequence(seq: str) -> bool:
    """Checks whether the sequence is primarily DNA nucleotides (A, C, G, T, N)."""
    if not seq:
        return False
    clean = re.sub(r'[^A-Z]', '', seq)
    nt_count = sum(1 for c in clean if c in "ACGTNRYWSKMBDHV")
    return (nt_count / max(1, len(clean))) > 0.85

def translate_dna_to_protein(dna: str, frame: int = 0) -> str:
    """Translates DNA into protein sequence starting at the given frame offset."""
    protein = []
    clean_dna = re.sub(r'[^A-Z]', '', dna)
    for i in range(frame, len(clean_dna) - 2, 3):
        codon = clean_dna[i:i+3]
        aa = CODON_TABLE.get(codon, 'X')
        protein.append(aa)
    return "".join(protein)

def get_best_translation_frame(dna: str) -> str:
    """Translates DNA across 3 reading frames and selects the one with the fewest stop codons."""
    candidates = []
    for frame in [0, 1, 2]:
        aa_seq = translate_dna_to_protein(dna, frame)
        stop_count = aa_seq.count('*')
        candidates.append((stop_count, -len(aa_seq), aa_seq))
    candidates.sort(key=lambda x: (x[0], x[1]))
    return candidates[0][2]

def find_best_alignment(query_seq: str, ref_seq: str) -> Tuple[int, int, float]:
    """
    Finds best local alignment of query_seq against ref_seq.
    Returns (start_idx_in_query, start_idx_in_ref, match_ratio).
    """
    k = min(15, len(query_seq), len(ref_seq))
    if k < 6:
        return 0, 0, 0.0
        
    best_match = 0
    best_q_start = 0
    best_r_start = 0
    
    # Fast seed match using 8-mers
    seed_len = min(8, k)
    seed = ref_seq[:seed_len]
    pos = query_seq.find(seed)
    if pos != -1:
        best_q_start = pos
        best_r_start = 0
    else:
        # Sliding window comparison
        for q_offset in range(0, min(30, len(query_seq))):
            match_count = sum(1 for i in range(min(50, len(query_seq) - q_offset, len(ref_seq)))
                              if query_seq[q_offset + i] == ref_seq[i])
            if match_count > best_match:
                best_match = match_count
                best_q_start = q_offset
                best_r_start = 0
                
    # Compute match ratio
    overlap_len = min(len(query_seq) - best_q_start, len(ref_seq) - best_r_start)
    if overlap_len > 0:
        matches = sum(1 for i in range(overlap_len) if query_seq[best_q_start + i] == ref_seq[best_r_start + i])
        ratio = matches / overlap_len
    else:
        ratio = 0.0
        
    return best_q_start, best_r_start, ratio

def extract_mutations_from_alignment(
    query_seq: str, 
    ref_seq: str, 
    q_start: int, 
    r_start: int, 
    gene: str
) -> List[Dict[str, Any]]:
    """Identifies codon mutations between query sequence and reference sequence."""
    mutations = []
    overlap_len = min(len(query_seq) - q_start, len(ref_seq) - r_start)
    
    for offset in range(overlap_len):
        ref_pos = r_start + offset + 1 # 1-indexed codon position
        wt_aa = ref_seq[r_start + offset]
        mut_aa = query_seq[q_start + offset]
        
        if mut_aa != wt_aa and mut_aa not in ['X', '-', '.', '*']:
            token = f"{wt_aa}{ref_pos}{mut_aa}"
            mutations.append({
                "token": token,
                "gene": gene,
                "position": ref_pos,
                "wildtype": wt_aa,
                "mutant": mut_aa
            })
            
    return mutations

def parse_fasta_input(fasta_text: str) -> Dict[str, Any]:
    """
    Main ingestion function. Takes raw FASTA string, determines type, aligns against HXB2,
    and returns detected mutations and quality scores.
    """
    header, clean_seq = clean_fasta_text(fasta_text)
    if not clean_seq:
        return {
            "success": False,
            "message": "Empty sequence provided. Please upload or paste a valid FASTA sequence.",
            "detected_mutations": [],
            "detected_genes": []
        }
        
    is_dna = is_nucleotide_sequence(clean_seq)
    
    if is_dna:
        protein_seq = get_best_translation_frame(clean_seq)
        seq_type = "Nucleotide (DNA) translated to Amino Acids"
    else:
        protein_seq = clean_seq
        seq_type = "Amino Acid (Protein)"
        
    detected_mutations = []
    genes_found = []
    alignment_details = {}
    
    for gene_code, gene_info in GENE_REFERENCES.items():
        ref = gene_info["seq"]
        q_start, r_start, match_ratio = find_best_alignment(protein_seq, ref)
        
        # If match ratio is significant (> 60%), sequence maps to this HIV gene
        if match_ratio >= 0.55:
            genes_found.append(gene_code)
            muts = extract_mutations_from_alignment(protein_seq, ref, q_start, r_start, gene_code)
            detected_mutations.extend([m["token"] for m in muts])
            alignment_details[gene_code] = {
                "gene_name": gene_info["name"],
                "match_similarity": round(match_ratio * 100, 1),
                "aligned_length": min(len(protein_seq) - q_start, len(ref) - r_start),
                "mutations_found": [m["token"] for m in muts]
            }
            
    # Remove duplicates while preserving order
    unique_mutations = list(dict.fromkeys(detected_mutations))
    
    return {
        "success": True,
        "header": header,
        "sequence_type": seq_type,
        "raw_length": len(clean_seq),
        "protein_length": len(protein_seq),
        "detected_genes": genes_found,
        "detected_mutations": unique_mutations,
        "alignment_summary": alignment_details,
        "message": f"Successfully parsed {len(clean_seq)} characters. Identified genes: {', '.join(genes_found) if genes_found else 'None'}. Found {len(unique_mutations)} mutations."
    }

if __name__ == "__main__":
    # Test DNA sequence of PR with D30N mutation
    sample_dna = ">Patient_01 HIV-1 Protease with D30N\nCCTCAAATCACTCTTTGGCAACGACCCCTCGTCACAATAAAGATAGGGGGGCAACTAAAGGAAGCTCTATTAGATACAGGAGCAGATAATACAGTATTAGAAGAA"
    res = parse_fasta_input(sample_dna)
    print("Test Result:")
    print("Detected Genes:", res["detected_genes"])
    print("Detected Mutations:", res["detected_mutations"])
    print("Message:", res["message"])
