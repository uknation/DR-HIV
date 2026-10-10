import os
import csv
import sys

data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ml", "data")
if not os.path.exists(data_dir):
    data_dir = "ml/data"

files = [f for f in os.listdir(data_dir) if f.endswith('.csv')]
print(f"Inspecting files in: {os.path.abspath(data_dir)}\n")

for fname in sorted(files):
    fpath = os.path.join(data_dir, fname)
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            print(f"{fname}: EMPTY")
            continue
        
        row_count = 0
        first_row = None
        for r in reader:
            if row_count == 0:
                first_row = r
            row_count += 1

    drugs = [c for c in header if c not in ['SeqID', 'CompMutList'] and not (c.startswith('P') and c[1:].isdigit())]
    p_cols = [c for c in header if c.startswith('P') and c[1:].isdigit()]
    
    print(f"--- {fname} ---")
    print(f"  Rows: {row_count}")
    print(f"  Total Columns: {len(header)}")
    print(f"  Target Drugs ({len(drugs)}): {drugs}")
    print(f"  Position columns (P*): {len(p_cols)} (from {p_cols[0] if p_cols else 'None'} to {p_cols[-1] if p_cols else 'None'})")
    print(f"  CompMutList in columns: {'CompMutList' in header}")
    if first_row:
        sample_drugs = {d: first_row[header.index(d)] for d in drugs[:5] if d in header}
        print(f"  Sample drug values: {sample_drugs}")
        if 'CompMutList' in header:
            print(f"  Sample CompMutList: {first_row[header.index('CompMutList')]}")
    print()
