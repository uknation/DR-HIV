import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Sparkles, Dna, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config';

const SAMPLES = {
  pr_dna: `>Sample_01_PR_D30N_M46I
CCTCAAATCACTCTTTGGCAACGACCCCTCGTCACAATAAAGATAGGGGGGCAACTAAAGGAAGCTCTATTAGATACAGGAGCAGATAATACAGTATTAGAAGAAATGAGTTTGCCAGGAAGATGGAAACCAAAAATGATAGGGGGAATTGGAGGTTTTATCAAAGTAAGACAGTATGATCAGATACTCATAGAAATCTGTGGACATAAAGCTATAGGTACAGTATTAGTAGGACCTACACCTGTCAACATAATTGGAAGAAATCTGTTGACTCAGATTGGTTGCACTTTAAATTTT`,
  rt_aa: `>Sample_02_RT_M184V_K103N
PISPIETVPVKLKPGMDGPKVKQWPLTEEKIKALVEICTEMEKEGKISKIGPENPYNTPVFAIKKKDSTKWRKLVDFRELNKRTQDFWEVQLGIPHPAGLKKKKSVTVLDVGDAYFSVPLDEDFRNYTAFTIPSINNETPGIRYQYNVLPQGWKGSPAIFQSSMTKILEPFRKQNPDIVIYQYVDDLYVGSDLEIGQHRTKIEELRQHLLRWGLTTPDKKHQKEPPFLWMGYELHPDKWT`,
  in_mut: `>Sample_03_IN_Q148H
FLDGIDKAQEEHEKYHSNWRAMASDFNLPPVVAKEIVASCDKCQLKGEAMHGQVDCSPGIWQLDCTHLEGKVILVAVHVASGYIEAEVIPAETGQETAYFLLKLAGRWPVKTVHTDNGSNFTSTTVKAACWWAGIKQEFGIPYNPQSQGVVESMNKELKKIIGQVRDQAEHLKTAVQMAVFIHNFKRKGGIGGYSAGERIVDIIATDIHTKELQKQITKIQNFRVYYRDSRDPLWKGPAKLLWKGEGAVVIQDNSDIKVVPRRKAKIIRDYGKQMAGDDCVASRQDED`
};

export default function FastaUploadModal({ isOpen, onClose, onMutationsExtracted }) {
  const [fastaText, setFastaText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleAnalyze = async (textToAnalyze = fastaText) => {
    if (!textToAnalyze.trim()) {
      setError('Please enter or upload a FASTA sequence first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(`${API_BASE}/genotype/parse-fasta`, {
        fasta_text: textToAnalyze
      });

      if (response.data.success) {
        setResult(response.data);
      } else {
        setError(response.data.message || 'Sequence alignment failed.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to communicate with FASTA alignment engine.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setFastaText(content);
      handleAnalyze(content);
    };
    reader.readAsText(file);
  };

  const handleApplyMutations = () => {
    if (result && result.detected_mutations) {
      onMutationsExtracted(result.detected_mutations);
      onClose();
    }
  };

  const loadSample = (key) => {
    const s = SAMPLES[key];
    setFastaText(s);
    handleAnalyze(s);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">FASTA Sequence Ingestion & Alignment</h3>
              <p className="text-xs text-slate-500">Auto-align Sanger or NGS reads to HXB2 reference and extract codon mutations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* File drop zone & Quick samples */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Input FASTA Sequence (DNA or Protein)
              </label>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">Load sample:</span>
                <button
                  type="button"
                  onClick={() => loadSample('pr_dna')}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition-colors"
                >
                  PR (DNA)
                </button>
                <button
                  type="button"
                  onClick={() => loadSample('rt_aa')}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition-colors"
                >
                  RT (Protein)
                </button>
                <button
                  type="button"
                  onClick={() => loadSample('in_mut')}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition-colors"
                >
                  IN (Q148H)
                </button>
              </div>
            </div>

            <textarea
              value={fastaText}
              onChange={(e) => setFastaText(e.target.value)}
              placeholder=">Patient_Sample_01\nCCTCAAATCACTCTTTGGCAACGACCC..."
              rows={5}
              className="w-full p-3 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer shadow-sm transition-all">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Choose .fasta / .seq file</span>
              <input
                type="file"
                accept=".fasta,.fna,.txt,.seq"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              disabled={isAnalyzing || !fastaText.trim()}
              onClick={() => handleAnalyze()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Aligning Sequence...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Align to HXB2 & Extract Mutations</span>
                </>
              )}
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-xs text-slate-800">Sequence Alignment Complete</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {result.sequence_type} • {result.raw_length} chars
                </span>
              </div>

              {/* Detected genes badges */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Genes Aligned:</span>
                {result.detected_genes && result.detected_genes.length > 0 ? (
                  result.detected_genes.map((g) => (
                    <span key={g} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded text-[11px]">
                      HIV-1 {g}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic">No standard HIV genes matched (&lt;55% identity)</span>
                )}
              </div>

              {/* Detected mutations */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Detected Codon Mutations ({result.detected_mutations?.length || 0}):</span>
                  <span className="text-[11px] text-slate-400 font-normal">HXB2 wildtype reference coordinates</span>
                </div>

                {result.detected_mutations && result.detected_mutations.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                    {result.detected_mutations.map((mut) => (
                      <span
                        key={mut}
                        className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-900 font-mono font-bold text-xs rounded-md shadow-2xs"
                      >
                        {mut}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-800 font-medium">
                    Wildtype sequence: No drug resistance mutations detected relative to HXB2 consensus.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Cancel
          </button>

          {result && (
            <button
              type="button"
              onClick={handleApplyMutations}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>Add {result.detected_mutations?.length || 0} Mutations to Case</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
