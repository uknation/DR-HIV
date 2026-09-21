import React, { useState } from 'react';
import { Activity, Zap, Eye, Info, Sparkles, Layers } from 'lucide-react';

/**
 * Interactive Sequence-Aware Grad-CAM & Attention Heatmap Component.
 * Visualizes per-residue importance along the 99-AA Protease and 240-AA RT sequences.
 */
export default function SequenceGradCAMViewer({
  structuralExplainability,
  reconstructedSequences,
  mutationsAnalyzed,
  activeGene = 'PI',
  uncertaintyMetrics = null,
  epistaticInteractions = []
}) {
  const [selectedGroup, setSelectedGroup] = useState(activeGene || 'PI');
  const [hoveredResidue, setHoveredResidue] = useState(null);

  const groupData = structuralExplainability ? structuralExplainability[selectedGroup] : null;
  const camProfile = groupData ? groupData.cam_profile : [];
  const hotspots = groupData ? groupData.structural_hotspots : [];
  const explainedDrug = groupData ? groupData.top_explained_drug : 'Target Drug';

  // Get sequence string
  const sequenceStr =
    selectedGroup === 'PI'
      ? (reconstructedSequences && reconstructedSequences.protease_99aa) || ''
      : selectedGroup === 'INSTI'
      ? (reconstructedSequences && reconstructedSequences.integrase_288aa) || ''
      : selectedGroup === 'CAPSID'
      ? (reconstructedSequences && reconstructedSequences.capsid_231aa) || ''
      : (reconstructedSequences && reconstructedSequences.reverse_transcriptase_240aa) || '';

  // Helper for Grad-CAM color mapping
  const getHeatmapColor = (score, isMutation) => {
    if (isMutation) {
      return 'bg-rose-500 text-white font-extrabold ring-2 ring-rose-400 ring-offset-1 shadow-sm';
    }
    if (score >= 0.75) {
      return 'bg-amber-500 text-white font-bold';
    }
    if (score >= 0.45) {
      return 'bg-amber-200 text-amber-900 font-semibold';
    }
    if (score >= 0.20) {
      return 'bg-teal-100 text-teal-900';
    }
    return 'bg-slate-100 text-slate-600 hover:bg-slate-200';
  };

  const getStructuralRegionName = (pos, gene) => {
    if (gene === 'PI') {
      if (pos >= 25 && pos <= 27) return 'Active Site Catalytic Triad (D25-T26-G27)';
      if (pos >= 46 && pos <= 56) return 'Flexible Flap Region (Substrate Binding)';
      if (pos >= 82 && pos <= 84) return 'Substrate Envelope / S1 Binding Pocket';
      if (pos === 30 || pos === 88 || pos === 90) return 'Major Drug Resistance Signature Locus';
      return 'Core Scaffold Residue';
    } else if (gene === 'INSTI') {
      if (pos === 64 || pos === 116 || pos === 152) return 'Catalytic Core D,D-35-E Triad (D64-D116-E152)';
      if (pos >= 140 && pos <= 150) return 'Flexible Loop / Major Resistance Locus (G140, Q148)';
      if (pos >= 153 && pos <= 158) return 'N155 Resistance Pathway Region';
      if (pos >= 260 && pos <= 265) return 'C-Terminal Domain / R263K Locus';
      return 'Integrase Scaffold Residue';
    } else if (gene === 'CAPSID') {
      if (pos >= 66 && pos <= 74) return 'Capsid Hydrophobic Pocket / Lenacapavir Binding Site (M66, Q67, K70, N74)';
      if (pos >= 56 && pos <= 60) return 'Capsid Inter-Hexamer Interface (L56)';
      if (pos >= 105 && pos <= 108) return 'Capsid NTD Loop Region (A105, T107)';
      return 'Capsid Hexamer Scaffold Residue';
    } else {
      if (pos >= 180 && pos <= 190) return 'Catalytic YMDD Motif & Flanking Primer Grip';
      if (pos >= 65 && pos <= 75) return 'Finger Subdomain (dNTP Binding Site)';
      if (pos >= 100 && pos <= 110) return 'NNRTI Hydrophobic Pocket';
      if (pos >= 210 && pos <= 220) return 'Thymidine Analogue Mutation (TAM) Cluster';
      return 'Polymerase Scaffold Residue';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <Layers className="h-4 w-4" />
            </span>
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
              1D Grad-CAM Sequence Activation Heatmap
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualizing spatial deep neural network gradients across physical protein codons.
          </p>
        </div>

        {/* Gene Selector Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg text-xs font-bold">
          {['PI', 'NRTI', 'NNRTI', 'INSTI', 'CAPSID'].map((grp) => (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-3 py-1 rounded-md transition ${
                selectedGroup === grp
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {grp} ({grp === 'PI' ? 'PR 99 AA' : grp === 'INSTI' ? 'IN 288 AA' : grp === 'CAPSID' ? 'CA 231 AA' : 'RT 240 AA'})
            </button>
          ))}
        </div>
      </div>

      {/* Target Drug Banner */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs">
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-slate-600">
            Explaining Structural Target: <span className="font-bold text-slate-900">{explainedDrug}</span>
          </span>
        </div>
        <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
          Spatial Multi-Scale Conv1D Attention
        </span>
      </div>

      {/* Residue Grid */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-2">
          <span>N-Terminus (Codon 1)</span>
          <span>C-Terminus (Codon {sequenceStr.length || 99})</span>
        </div>

        <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 lg:grid-cols-25 xl:grid-cols-33 gap-1 p-2 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto">
          {Array.from(sequenceStr).map((aa, idx) => {
            const pos = idx + 1;
            const score = camProfile[idx] !== undefined ? camProfile[idx] : 0.0;
            const isMut = (mutationsAnalyzed || []).some((m) => m.includes(String(pos)));

            return (
              <div
                key={pos}
                onMouseEnter={() =>
                  setHoveredResidue({
                    pos,
                    aa,
                    score,
                    isMut,
                    region: getStructuralRegionName(pos, selectedGroup)
                  })
                }
                onMouseLeave={() => setHoveredResidue(null)}
                className={`h-7 w-7 rounded flex flex-col items-center justify-center cursor-pointer transition transform hover:scale-125 hover:z-20 text-[10px] select-none ${getHeatmapColor(
                  score,
                  isMut
                )}`}
              >
                <span className="font-mono leading-none">{aa}</span>
                <span className="text-[7px] leading-none opacity-80">{pos}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover Info Tooltip Bar */}
      <div className="min-h-[42px] bg-slate-800 text-white rounded-lg p-2.5 flex items-center justify-between text-xs">
        {hoveredResidue ? (
          <div className="flex items-center space-x-3 w-full">
            <div className="flex items-center space-x-1.5 font-mono font-bold text-teal-300">
              <span>Codon P{hoveredResidue.pos}:</span>
              <span className="text-white bg-slate-700 px-1.5 py-0.5 rounded">
                {hoveredResidue.aa}
              </span>
            </div>
            <div className="text-slate-300 truncate">
              <span className="text-slate-400">Structural Region:</span>{' '}
              <span className="text-slate-100 font-semibold">{hoveredResidue.region}</span>
            </div>
            <div className="ml-auto text-right font-mono text-[11px] shrink-0">
              <span>CAM Score: </span>
              <span className="font-bold text-amber-400">
                {(hoveredResidue.score * 100).toFixed(1)}%
              </span>
              {hoveredResidue.isMut && (
                <span className="ml-2 bg-rose-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">
                  Patient Mutation
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <Info className="h-3.5 w-3.5" />
            <span>Hover over any codon block above to inspect physical residue dynamics and importance scores.</span>
          </div>
        )}
      </div>

      {/* Top Mutation Hotspots Table */}
      {hotspots && hotspots.length > 0 && (
        <div className="space-y-2 pt-2">
          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Identified Resistance Structural Hot-Spots
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {hotspots.slice(0, 4).map((h, i) => (
              <div
                key={i}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-mono font-bold px-1.5 py-0.5 rounded text-xs ${
                      h.is_patient_mutation
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {h.mutation_token || `${h.amino_acid}${h.position}`}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate max-w-[90px]">
                    Codon {h.position}
                  </span>
                </div>
                <div className="text-right font-mono text-[11px] font-bold text-teal-700">
                  {(h.importance_score * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EVIDENTIAL UNCERTAINTY & RELIABILITY GAUGE */}
      {uncertaintyMetrics && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              uncertaintyMetrics.badge_color === 'emerald' ? 'bg-emerald-500' :
              uncertaintyMetrics.badge_color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
            } animate-pulse`} />
            <span className="font-bold text-slate-800">
              Dirichlet Epistemic Reliability: {uncertaintyMetrics.reliability_tier} ({((uncertaintyMetrics.reliability_score || 0.85) * 100).toFixed(0)}%)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 italic">
            {uncertaintyMetrics.clinical_guidance}
          </span>
        </div>
      )}

      {/* DETECTED PAIRWISE EPISTATIC COUPLINGS */}
      {epistaticInteractions && epistaticInteractions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Detected Pairwise Epistatic Couplings (Co-Evolution Analysis)</span>
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {epistaticInteractions.map((c, i) => (
              <div key={i} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800 px-1.5 py-0.5 bg-slate-100 rounded">
                    {c.mut1} + {c.mut2}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.type.includes('Hypersensitization') || c.type.includes('Antagonistic')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {c.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {c.impact}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        <div className="flex items-center space-x-3 flex-wrap gap-y-1">
          <span className="font-semibold text-slate-600">Gradient Intensity:</span>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300"></span>
            <span>Baseline</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded bg-teal-100"></span>
            <span>Low (20%)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded bg-amber-200"></span>
            <span>Moderate (50%)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded bg-amber-500"></span>
            <span>High (75%+)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded bg-rose-500"></span>
            <span className="font-bold text-rose-700">Patient Mutation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
